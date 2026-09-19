"""
Custom exceptions for the Dhan integration layer.
Ensures zero credential leakage and standardized error codes.
"""


class DhanBaseException(Exception):
    """Base exception for all Dhan related errors."""

    def __init__(self, message: str = "A Dhan broker error occurred", code: str = "DHAN_ERROR", details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "error": self.code,
            "message": self.message,
            "details": self.details,
        }


class DhanAPIError(DhanBaseException):
    """Raised when the Dhan API returns an unsuccessful HTTP or business logic status."""

    def __init__(self, message: str, status_code: int = 400, code: str = "DHAN_API_ERROR", details: dict = None):
        super().__init__(message, code=code, details=details)
        self.status_code = status_code


class DhanAuthenticationError(DhanBaseException):
    """Raised when authentication credentials (token or client ID) are missing or invalid."""

    def __init__(self, message: str = "Dhan authentication failed or token expired", details: dict = None):
        super().__init__(message, code="DHAN_AUTHENTICATION_ERROR", details=details)
        self.status_code = 401


class DhanRateLimitError(DhanBaseException):
    """Raised when Dhan rate limits (HTTP 429) are exceeded."""

    def __init__(self, message: str = "Dhan API rate limit exceeded. Please retry later.", retry_after: int = 1, details: dict = None):
        details = details or {}
        details["retry_after"] = retry_after
        super().__init__(message, code="DHAN_RATE_LIMIT_ERROR", details=details)
        self.status_code = 429
        self.retry_after = retry_after


class DhanValidationError(DhanBaseException):
    """Raised when request parameters or payload formats are invalid."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message, code="DHAN_VALIDATION_ERROR", details=details)
        self.status_code = 400


class DhanConnectionError(DhanBaseException):
    """Raised when network connection or DNS resolution to Dhan fails."""

    def __init__(self, message: str = "Failed to establish network connection to Dhan API", details: dict = None):
        super().__init__(message, code="DHAN_CONNECTION_ERROR", details=details)
        self.status_code = 503


class DhanDataError(DhanBaseException):
    """Raised when historical candle or instrument data is corrupt, empty, or unparseable."""

    def __init__(self, message: str = "Failed to parse market data from Dhan response", details: dict = None):
        super().__init__(message, code="DHAN_DATA_ERROR", details=details)
        self.status_code = 422
