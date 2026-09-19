"""
MarketDataProvider — abstract base class for all market data providers.

Every concrete provider (Dhan, CSV, mock) must implement this interface.
The backtesting engine and API views work exclusively with this ABC —
they never import Dhan-specific code directly.
"""

from abc import ABC, abstractmethod
from datetime import date
from typing import Any, Dict, List, Optional


class MarketDataProvider(ABC):
    """
    Abstract interface for any market-data source.

    Implementing classes are responsible for:
    - Fetching OHLCV candle data for a given instrument and time range.
    - Returning data as a normalized list of candle dictionaries.
    - Optionally persisting fetched data to the local database for caching.

    Returned candle dicts conform to the schema:
    {
        "security_id": str,
        "exchange_segment": str,
        "symbol": str,
        "timeframe": str,
        "timestamp": datetime (timezone-aware),
        "open": float,
        "high": float,
        "low": float,
        "close": float,
        "volume": int | None,
        "open_interest": int | None,
    }
    """

    @abstractmethod
    def get_historical_data(
        self,
        security_id: str,
        exchange_segment: str,
        symbol: str,
        timeframe: str,
        start_date: date,
        end_date: date,
        instrument_type: str = "EQUITY",
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical OHLCV candles for the specified instrument and date range.

        Args:
            security_id:       Provider-specific instrument identifier (e.g. Dhan security ID).
            exchange_segment:  Exchange segment string (e.g. "NSE_EQ", "NSE_FNO", "IDX_I").
            symbol:            Human-readable instrument symbol (e.g. "NIFTY", "HDFCBANK").
            timeframe:         Candle interval — one of "1m", "5m", "15m", "25m", "1h", "1d".
            start_date:        Inclusive start date.
            end_date:          Inclusive end date.
            instrument_type:   Instrument type hint (EQUITY, INDEX, etc.) — used by some providers.

        Returns:
            List of candle dicts sorted by timestamp ascending.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check whether the provider's data source is accessible.

        Returns True if the provider is ready to serve data.
        Used for health checks and graceful degradation.
        """
        ...

    def get_provider_name(self) -> str:
        """Human-readable name of this provider (defaults to class name)."""
        return self.__class__.__name__

    def validate_timeframe(self, timeframe: str) -> bool:
        """
        Return True if the given timeframe string is supported by this provider.
        Override in subclasses if provider has different limitations.
        """
        supported = {"1m", "5m", "15m", "25m", "30m", "1h", "60m", "1d", "D"}
        return timeframe.lower() in {t.lower() for t in supported}

    def describe(self) -> Dict[str, Any]:
        """
        Return a summary dict describing this provider.
        Useful for status endpoints and admin dashboards.
        """
        return {
            "provider": self.get_provider_name(),
            "available": self.is_available(),
        }
