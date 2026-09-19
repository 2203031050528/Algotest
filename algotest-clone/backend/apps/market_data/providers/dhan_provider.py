"""
DhanProvider — concrete MarketDataProvider backed by DhanHQ v2 API + PostgreSQL cache.

Strategy:
1. Check the local Candle table for the requested (security_id, timeframe, date range).
2. Identify missing date gaps between cached candles.
3. Fetch only the missing ranges from the Dhan API via DhanHistoricalService.
4. Persist fetched candles via bulk upsert.
5. Return the complete, sorted candle list from the database.

This guarantees:
- Minimum API calls (cache-first).
- No duplicate requests.
- Idempotent data storage.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from django.db import models
from apps.dhan.client import DhanClient
from apps.dhan.exceptions import DhanBaseException
from apps.dhan.services.historical_data import DhanHistoricalService
from apps.market_data.models import Candle

from .base import MarketDataProvider

logger = logging.getLogger(__name__)

MARKET_TZ = ZoneInfo("Asia/Kolkata")


class DhanProvider(MarketDataProvider):
    """
    Market-data provider that uses DhanHQ as the upstream data source,
    backed by a PostgreSQL Candle cache for repeated/offline access.
    """

    def __init__(
        self,
        client: Optional[DhanClient] = None,
        service: Optional[DhanHistoricalService] = None,
    ):
        self._client = client or DhanClient()
        self._service = service or DhanHistoricalService(client=self._client)

    # ------------------------------------------------------------------
    # MarketDataProvider interface
    # ------------------------------------------------------------------

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
        DB-first candle fetch with automatic gap-fill from Dhan API.
        Returns candles as a list of dicts sorted by timestamp ascending.
        """
        logger.info(
            "[DhanProvider] Fetching %s | %s | %s → %s",
            symbol,
            timeframe,
            start_date,
            end_date,
        )

        # 1. Attempt to serve from cache
        cached = self._get_cached_candles(security_id, timeframe, start_date, end_date, symbol=symbol)
        missing_ranges = self._find_missing_ranges(cached, start_date, end_date, timeframe)

        # 2. Back-fill missing ranges from Dhan API
        last_error = None
        if missing_ranges:
            logger.info(
                "[DhanProvider] %d missing range(s) detected for %s, fetching from Dhan API",
                len(missing_ranges),
                symbol,
            )
            for gap_start, gap_end in missing_ranges:
                try:
                    self._service.sync_and_store_candles(
                        security_id=security_id,
                        exchange_segment=exchange_segment,
                        symbol=symbol,
                        timeframe=timeframe,
                        start_date=gap_start,
                        end_date=gap_end,
                        instrument_type=instrument_type,
                    )
                except DhanBaseException as exc:
                    last_error = exc
                    logger.warning(
                        "[DhanProvider] Gap fill failed for %s %s→%s: %s",
                        symbol,
                        gap_start,
                        gap_end,
                        str(exc),
                    )

        # 3. Re-query DB and return full range
        all_candles = self._get_cached_candles(security_id, timeframe, start_date, end_date, symbol=symbol)

        # If cache has no candles and upstream Dhan API failed, propagate the exception
        if not all_candles and last_error is not None:
            raise last_error

        return all_candles

    def is_available(self) -> bool:
        """Check connectivity to Dhan API."""
        try:
            result = self._client.check_connection()
            return result.get("connected", False)
        except Exception as exc:
            logger.debug("[DhanProvider] availability check failed: %s", str(exc))
            return False

    def describe(self) -> Dict[str, Any]:
        available = self.is_available()
        return {
            "name": "dhan",
            "provider": self.get_provider_name(),
            "available": available,
            "status": "active" if available else "inactive",
            "source": "DhanHQ v2 API",
            "cache": "PostgreSQL Candle table",
            "rate_limit": "5 req / sec",
            "supported_segments": ["NSE_EQ", "NSE_FNO", "IDX_I", "BSE_EQ"],
            "timeframes": ["1m", "5m", "15m", "25m", "1h", "1d"],
            "priority": 1,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_cached_candles(
        self,
        security_id: str,
        timeframe: str,
        start_date: Any,
        end_date: Any,
        symbol: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query the Candle table for the specified instrument + timeframe + date window.
        Matches by security_id OR symbol for maximum resilience.
        Returns list of candle dicts sorted by timestamp.
        """
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

        start_dt = datetime(start_date.year, start_date.month, start_date.day, tzinfo=MARKET_TZ)
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=MARKET_TZ)

        query = models.Q(security_id=str(security_id))
        if symbol:
            query = query | models.Q(symbol__iexact=str(symbol))

        qs = (
            Candle.objects.filter(
                query,
                timeframe=timeframe,
                timestamp__gte=start_dt,
                timestamp__lte=end_dt,
            )
            .order_by("timestamp")
            .values(
                "security_id",
                "exchange_segment",
                "symbol",
                "timeframe",
                "timestamp",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "open_interest",
            )
        )

        return [
            {
                **candle,
                "open": float(candle["open"]),
                "high": float(candle["high"]),
                "low": float(candle["low"]),
                "close": float(candle["close"]),
            }
            for candle in qs
        ]

    def _find_missing_ranges(
        self,
        cached_candles: List[Dict[str, Any]],
        start_date: date,
        end_date: date,
        timeframe: str,
    ) -> List[tuple]:
        """
        Identify date gaps in the cached candle series.

        A simple heuristic: if the DB has no candles at all, the entire range is missing.
        For intraday timeframes, we compare trading day presence.
        For daily timeframes, we check per-day coverage.

        Returns a list of (gap_start, gap_end) date tuples.
        """
        if not cached_candles:
            return [(start_date, end_date)]

        cached_dates: set = set()
        for c in cached_candles:
            ts = c["timestamp"]
            if hasattr(ts, "date"):
                cached_dates.add(ts.date())
            else:
                cached_dates.add(ts)

        # Generate all market days in the requested window (Mon-Fri approx)
        missing_start = None
        gaps = []
        current = start_date

        while current <= end_date:
            # Approximate market days: skip weekends
            if current.weekday() < 5 and current not in cached_dates:
                if missing_start is None:
                    missing_start = current
            else:
                if missing_start is not None:
                    gaps.append((missing_start, current - timedelta(days=1)))
                    missing_start = None
            current += timedelta(days=1)

        if missing_start is not None:
            gaps.append((missing_start, end_date))

        return gaps
