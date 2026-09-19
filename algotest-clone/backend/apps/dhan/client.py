import json
import logging
import os
import time
from typing import Any, Dict, Optional

import requests
from django.conf import settings

from .exceptions import (
    DhanAPIError,
    DhanAuthenticationError,
    DhanBaseException,
    DhanConnectionError,
    DhanRateLimitError,
    DhanValidationError,
)

logger = logging.getLogger(__name__)


class DhanClient:
    """
    Production-grade HTTP client for the DhanHQ v2 REST API.
    Features:
    - Automatic credential injection from environment/settings.
    - Strict credential masking in logs (never logs access tokens or secrets).
    - Automatic exponential backoff retries for rate-limiting (HTTP 429) and transient network glitches.
    - Unified exception mapping.
    """

    BASE_URL = "https://api.dhan.co"
    DEFAULT_TIMEOUT = 15
    MAX_RETRIES = 3
    INITIAL_BACKOFF = 0.5  # seconds

    def __init__(
        self,
        client_id: Optional[str] = None,
        access_token: Optional[str] = None,
        api_key: Optional[str] = None,
        secret: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.client_id = (
            client_id
            or os.getenv("DHAN_CLIENT_ID")
            or getattr(settings, "DHAN_CLIENT_ID", "")
        )
        self.access_token = (
            access_token
            or os.getenv("DHAN_ACCESS_TOKEN")
            or getattr(settings, "DHAN_ACCESS_TOKEN", "")
        )
        self.api_key = (
            api_key
            or os.getenv("DHAN_API_KEY")
            or getattr(settings, "DHAN_API_KEY", "")
        )
        self.secret = (
            secret
            or os.getenv("DHAN_SECRET")
            or getattr(settings, "DHAN_SECRET", "")
        )
        self.base_url = (base_url or self.BASE_URL).rstrip("/")
        self.timeout = timeout

        self.session = requests.Session()

    @property
    def headers(self) -> Dict[str, str]:
        if not self.access_token or not self.client_id:
            raise DhanAuthenticationError(
                "Dhan credentials not found. DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN must be configured."
            )
        headers = {
            "access-token": self.access_token,
            "client-id": self.client_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["api-key"] = self.api_key
        return headers

    def _sanitize_log(self, text: str) -> str:
        """Sanitize any occurrence of credentials from logs."""
        if not text:
            return ""
        sanitized = str(text)
        if self.access_token:
            sanitized = sanitized.replace(self.access_token, "[REDACTED_ACCESS_TOKEN]")
        if self.secret:
            sanitized = sanitized.replace(self.secret, "[REDACTED_SECRET]")
        return sanitized

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        masked_endpoint = endpoint.lstrip("/")

        retry_count = 0
        backoff = self.INITIAL_BACKOFF

        while True:
            try:
                headers = self.headers
            except DhanAuthenticationError:
                raise

            logger.debug(
                "Dispatching Dhan request: method=%s endpoint=%s client_id=%s retry=%d",
                method,
                masked_endpoint,
                self.client_id,
                retry_count,
            )

            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=data if data is not None else None,
                    timeout=self.timeout,
                )

                logger.debug(
                    "Dhan response received: endpoint=%s status=%d duration=%.3fs",
                    masked_endpoint,
                    response.status_code,
                    response.elapsed.total_seconds() if response.elapsed else 0,
                )

                # 1. Success cases
                if response.status_code in (200, 201, 202, 204):
                    if not response.content:
                        return {}
                    return response.json()

                # 2. Rate limiting (HTTP 429)
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", backoff))
                    if retry_count < self.MAX_RETRIES:
                        logger.warning(
                            "Dhan rate limit encountered (429) on %s. Retrying in %ds (attempt %d/%d)",
                            masked_endpoint,
                            retry_after,
                            retry_count + 1,
                            self.MAX_RETRIES,
                        )
                        time.sleep(retry_after)
                        retry_count += 1
                        backoff *= 2
                        continue
                    raise DhanRateLimitError(
                        message="Dhan rate limit exceeded after maximum retries.",
                        retry_after=retry_after,
                    )

                # 3. Authentication failures (401 / 403)
                if response.status_code in (401, 403):
                    err_json = self._safe_json(response)
                    msg = err_json.get("errorMessage") or err_json.get("message") or "Authentication failed with Dhan API"
                    raise DhanAuthenticationError(
                        message=self._sanitize_log(msg),
                        details=err_json,
                    )

                # 4. Validation errors (400)
                if response.status_code == 400:
                    err_json = self._safe_json(response)
                    msg = err_json.get("errorMessage") or err_json.get("message") or "Invalid request parameters to Dhan"
                    raise DhanValidationError(
                        message=self._sanitize_log(msg),
                        details=err_json,
                    )

                # 5. Transient Server Errors (502, 503, 504)
                if response.status_code in (502, 503, 504):
                    if retry_count < self.MAX_RETRIES:
                        logger.warning(
                            "Transient HTTP %d from Dhan on %s. Retrying in %.2fs (attempt %d/%d)",
                            response.status_code,
                            masked_endpoint,
                            backoff,
                            retry_count + 1,
                            self.MAX_RETRIES,
                        )
                        time.sleep(backoff)
                        retry_count += 1
                        backoff *= 2
                        continue

                # 6. General API Errors (e.g. 451, 500)
                err_json = self._safe_json(response)
                err_msg = err_json.get("errorMessage") or err_json.get("message") or f"HTTP {response.status_code} from Dhan"
                code = err_json.get("errorCode") or err_json.get("errorType") or "DHAN_API_ERROR"
                raise DhanAPIError(
                    message=self._sanitize_log(err_msg),
                    status_code=response.status_code,
                    code=str(code),
                    details=err_json,
                )

            except requests.exceptions.Timeout as exc:
                if retry_count < self.MAX_RETRIES:
                    logger.warning(
                        "Dhan request timed out for %s. Retrying in %.2fs (attempt %d/%d)",
                        masked_endpoint,
                        backoff,
                        retry_count + 1,
                        self.MAX_RETRIES,
                    )
                    time.sleep(backoff)
                    retry_count += 1
                    backoff *= 2
                    continue
                raise DhanConnectionError(f"Dhan request timed out after {self.timeout}s") from exc

            except requests.exceptions.ConnectionError as exc:
                if retry_count < self.MAX_RETRIES:
                    time.sleep(backoff)
                    retry_count += 1
                    backoff *= 2
                    continue
                raise DhanConnectionError(f"Failed to connect to Dhan API: {self._sanitize_log(str(exc))}") from exc

            except DhanBaseException:
                raise

            except Exception as exc:
                raise DhanAPIError(f"Unexpected error communicating with Dhan: {self._sanitize_log(str(exc))}") from exc

    def _safe_json(self, response: requests.Response) -> dict:
        try:
            return response.json()
        except Exception:
            return {"raw": self._sanitize_log(response.text[:300])}

    # Public HTTP primitives
    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("GET", endpoint, params=params)

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("POST", endpoint, data=data)

    def delete(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return self._request("DELETE", endpoint, params=params)

    # Convenience Domain Helpers
    def check_connection(self) -> dict:
        """Verify credentials and return connectivity summary."""
        try:
            profile = self.get_profile()
            funds = self.get_fund_limits()
            return {
                "connected": True,
                "client_id": self.client_id,
                "profile": profile,
                "funds": funds,
                "has_api_key": bool(self.api_key),
                "has_secret": bool(self.secret),
            }
        except Exception as exc:
            return {
                "connected": False,
                "client_id": self.client_id,
                "error": self._sanitize_log(str(exc)),
            }

    def get_profile(self) -> dict:
        return self.get("/v2/profile")

    def get_fund_limits(self) -> dict:
        return self.get("/v2/fundlimit")

    def get_holdings(self) -> list:
        try:
            return self.get("/v2/holdings")
        except DhanAPIError as exc:
            # Dhan returns DH-1111 when user has no holdings
            if "No holdings" in str(exc):
                return []
            raise

    def get_positions(self) -> list:
        return self.get("/v2/positions")

    def get_orders(self) -> list:
        return self.get("/v2/orders")

    def calculate_margin(self, payload: dict) -> dict:
        payload = {"dhanClientId": self.client_id, **payload}
        return self.post("/v2/margincalculator", data=payload)

    def historical_data(self, payload: dict) -> dict:
        return self.post("/v2/charts/intraday", data=payload)

    def daily_charts(self, payload: dict) -> dict:
        return self.post("/v2/charts/historical", data=payload)