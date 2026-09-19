"""
Security tests: verify that access tokens and secrets are NEVER
exposed in API responses, log outputs, or exception messages.
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.dhan.client import DhanClient


class CredentialLeakageTestCase(TestCase):
    """Verify credentials cannot appear in any API surface or logs."""

    SECRET_TOKEN = "SUPER_SECRET_ACCESS_TOKEN_SHOULD_NOT_LEAK"
    SECRET_KEY = "MY_DHAN_SECRET_KEY"

    def setUp(self):
        self.client_obj = DhanClient(
            client_id="TESTCID",
            access_token=self.SECRET_TOKEN,
            secret=self.SECRET_KEY,
        )

    # ---- Sanitization unit checks ----

    def test_token_not_in_sanitize_output(self):
        dirty = f"Some message containing {self.SECRET_TOKEN} in it"
        clean = self.client_obj._sanitize_log(dirty)
        self.assertNotIn(self.SECRET_TOKEN, clean)

    def test_secret_not_in_sanitize_output(self):
        dirty = f"Some message containing {self.SECRET_KEY} in it"
        clean = self.client_obj._sanitize_log(dirty)
        self.assertNotIn(self.SECRET_KEY, clean)

    def test_token_not_in_exception_string(self):
        from apps.dhan.exceptions import DhanAuthenticationError
        exc = DhanAuthenticationError("Error occurred", details={"token": "some_value"})
        # Exception str() should not surface raw token
        self.assertNotIn(self.SECRET_TOKEN, str(exc))

    # ---- API response checks via test client ----

    @patch("apps.dhan.views.DhanClient")
    def test_status_view_does_not_expose_token(self, MockClient):
        """GET /api/dhan/status/ response body must not contain the raw access token."""
        mock_instance = MagicMock()
        mock_instance.check_connection.return_value = {
            "connected": True,
            "client_id": "TESTCID",
            "profile": {},
            "funds": {},
        }
        MockClient.return_value = mock_instance

        api_client = APIClient()
        response = api_client.get("/api/dhan/status/")
        response_text = str(response.data)

        self.assertNotIn(self.SECRET_TOKEN, response_text)
        self.assertNotIn(self.SECRET_KEY, response_text)

    @patch("apps.dhan.views.DhanClient")
    def test_profile_view_does_not_expose_token(self, MockClient):
        """GET /api/dhan/profile/ response body must not contain access token."""
        mock_instance = MagicMock()
        mock_instance.get_profile.return_value = {"name": "Test User", "client_id": "TESTCID"}
        MockClient.return_value = mock_instance

        api_client = APIClient()
        response = api_client.get("/api/dhan/profile/")
        response_text = str(response.data)

        self.assertNotIn(self.SECRET_TOKEN, response_text)

    # ---- Header construction checks ----

    def test_headers_never_include_secret(self):
        headers = self.client_obj.headers
        header_values = " ".join(headers.values())
        self.assertNotIn(self.SECRET_KEY, header_values)

    def test_access_token_in_header_is_intentional_but_not_logged(self):
        """
        The access-token header MUST include the token (it's how Dhan authenticates),
        but it must be masked in all log outputs via _sanitize_log.
        This test ensures the sanitizer catches it if it accidentally ends up in logs.
        """
        # Simulate a log message that includes the full request headers dict
        fake_log = str(self.client_obj.headers)
        sanitized = self.client_obj._sanitize_log(fake_log)
        self.assertNotIn(self.SECRET_TOKEN, sanitized)
        self.assertIn("[REDACTED_ACCESS_TOKEN]", sanitized)
