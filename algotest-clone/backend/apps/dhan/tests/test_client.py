"""
Tests for DhanClient: authentication, headers, error handling, retries.
"""

import os
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.dhan.client import DhanClient
from apps.dhan.exceptions import (
    DhanAPIError,
    DhanAuthenticationError,
    DhanConnectionError,
    DhanRateLimitError,
    DhanValidationError,
)


class DhanClientInitTestCase(TestCase):
    """Test credential resolution order: explicit -> env -> settings."""

    def test_explicit_credentials_used(self):
        client = DhanClient(client_id="CID", access_token="TOK", api_key="KEY", secret="SEC")
        self.assertEqual(client.client_id, "CID")
        self.assertEqual(client.access_token, "TOK")
        self.assertEqual(client.api_key, "KEY")
        self.assertEqual(client.secret, "SEC")

    @patch.dict(os.environ, {"DHAN_CLIENT_ID": "ENV_CID", "DHAN_ACCESS_TOKEN": "ENV_TOK"})
    def test_env_credentials_fallback(self):
        client = DhanClient()
        self.assertEqual(client.client_id, "ENV_CID")
        self.assertEqual(client.access_token, "ENV_TOK")

    def test_base_url_stripped_of_trailing_slash(self):
        client = DhanClient(client_id="x", access_token="y", base_url="https://api.dhan.co/")
        self.assertEqual(client.base_url, "https://api.dhan.co")


class DhanClientHeadersTestCase(TestCase):
    """Test that authentication headers are correctly built and credentials are NOT leaked."""

    def setUp(self):
        self.client = DhanClient(client_id="CID123", access_token="SECRET_TOKEN", api_key="APIKEY")

    def test_headers_contain_required_fields(self):
        headers = self.client.headers
        self.assertIn("access-token", headers)
        self.assertIn("client-id", headers)
        self.assertIn("Content-Type", headers)
        self.assertIn("api-key", headers)

    def test_header_values_correct(self):
        headers = self.client.headers
        self.assertEqual(headers["client-id"], "CID123")
        self.assertEqual(headers["access-token"], "SECRET_TOKEN")

    @patch.dict(os.environ, {"DHAN_CLIENT_ID": "", "DHAN_ACCESS_TOKEN": ""}, clear=False)
    def test_raises_auth_error_when_credentials_missing(self):
        # Override settings too so no fallback credential source remains
        from django.test import override_settings
        with override_settings(DHAN_CLIENT_ID="", DHAN_ACCESS_TOKEN=""):
            client = DhanClient(client_id="", access_token="")
            with self.assertRaises(DhanAuthenticationError):
                _ = client.headers


class DhanClientSanitizeTestCase(TestCase):
    """Verify credential sanitization prevents token leakage in logs."""

    def setUp(self):
        self.client = DhanClient(
            client_id="CID", access_token="MY_SECRET_TOKEN", secret="MY_SECRET_PHRASE"
        )

    def test_access_token_redacted_in_logs(self):
        sanitized = self.client._sanitize_log("Error with token MY_SECRET_TOKEN in request")
        self.assertNotIn("MY_SECRET_TOKEN", sanitized)
        self.assertIn("[REDACTED_ACCESS_TOKEN]", sanitized)

    def test_secret_redacted_in_logs(self):
        sanitized = self.client._sanitize_log("Secret is MY_SECRET_PHRASE here")
        self.assertNotIn("MY_SECRET_PHRASE", sanitized)
        self.assertIn("[REDACTED_SECRET]", sanitized)

    def test_clean_text_unchanged(self):
        text = "Some innocent log line"
        self.assertEqual(self.client._sanitize_log(text), text)


class DhanClientHTTPStatusTestCase(TestCase):
    """Test _request() correctly maps HTTP status codes to exceptions."""

    def setUp(self):
        self.client = DhanClient(client_id="CID", access_token="TOK")

    def _mock_response(self, status_code: int, json_body: dict = None, headers: dict = None):
        response = MagicMock()
        response.status_code = status_code
        response.content = b"body"
        response.headers = headers or {}
        response.elapsed = None
        response.json.return_value = json_body or {}
        response.text = str(json_body or {})
        return response

    @patch("apps.dhan.client.requests.Session.request")
    def test_200_returns_json(self, mock_request):
        mock_request.return_value = self._mock_response(200, {"data": "ok"})
        result = self.client.get("/test")
        self.assertEqual(result, {"data": "ok"})

    @patch("apps.dhan.client.requests.Session.request")
    def test_401_raises_auth_error(self, mock_request):
        mock_request.return_value = self._mock_response(401, {"errorMessage": "Unauthorized"})
        with self.assertRaises(DhanAuthenticationError):
            self.client.get("/test")

    @patch("apps.dhan.client.requests.Session.request")
    def test_403_raises_auth_error(self, mock_request):
        mock_request.return_value = self._mock_response(403, {"errorMessage": "Forbidden"})
        with self.assertRaises(DhanAuthenticationError):
            self.client.get("/test")

    @patch("apps.dhan.client.requests.Session.request")
    def test_400_raises_validation_error(self, mock_request):
        mock_request.return_value = self._mock_response(400, {"errorMessage": "Bad params"})
        with self.assertRaises(DhanValidationError):
            self.client.get("/test")

    @patch("apps.dhan.client.requests.Session.request")
    def test_429_raises_rate_limit_after_retries(self, mock_request):
        mock_request.return_value = self._mock_response(429, {}, headers={"Retry-After": "0"})
        with self.assertRaises(DhanRateLimitError):
            self.client.get("/test")

    @patch("apps.dhan.client.requests.Session.request")
    def test_500_raises_api_error(self, mock_request):
        mock_request.return_value = self._mock_response(500, {"errorMessage": "Server error"})
        with self.assertRaises(DhanAPIError):
            self.client.get("/test")

    @patch("apps.dhan.client.requests.Session.request")
    def test_204_returns_empty_dict(self, mock_request):
        response = self._mock_response(204, {})
        response.content = b""
        mock_request.return_value = response
        result = self.client.delete("/test")
        self.assertEqual(result, {})

    @patch("apps.dhan.client.requests.Session.request")
    def test_connection_error_raises_after_retries(self, mock_request):
        import requests as req_lib
        mock_request.side_effect = req_lib.exceptions.ConnectionError("refused")
        with self.assertRaises(DhanConnectionError):
            self.client.get("/test")
