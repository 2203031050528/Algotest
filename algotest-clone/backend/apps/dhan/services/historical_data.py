import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from apps.dhan.client import DhanClient
from apps.dhan.exceptions import DhanDataError, DhanValidationError
from apps.market_data.models import Candle

logger = logging.getLogger(__name__)

MARKET_TIMEZONE = ZoneInfo("Asia/Kolkata")

# Official Dhan v2 interval mapping
# Dhan Intraday charts accept intervals: "1", "5", "15", "25", "60"
DHAN_INTERVAL_MAP: Dict[str, str] = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "25m": "25",
    "30m": "25",  # Dhan natively supports 25m for half-hour bar approximation
    "1h": "60",
    "60m": "60",
    "1d": "1d",   # Triggers historical daily endpoint
    "d": "1d",    # lowercase alias for "D"
    "D": "1d",
}

# Maximum date chunk windows to avoid Dhan API limits and timeouts
MAX_CHUNK_DAYS_MAP: Dict[str, int] = {
    "1m": 7,      # 1-min data has very high volume; chunk into 7-day windows
    "5m": 30,     # 30 days per chunk
    "15m": 60,
    "25m": 90,
    "30m": 90,
    "1h": 120,
    "1d": 365,    # 1 year per chunk for daily candles
}


class DhanHistoricalService:
    """
    Handles fetching, chunking, parsing, normalizing, and persisting
    historical market candle data from DhanHQ v2.
    """

    def __init__(self, client: Optional[DhanClient] = None):
        self.client = client or DhanClient()

    def get_interval_code(self, timeframe: str) -> str:
        code = DHAN_INTERVAL_MAP.get(timeframe.lower())
        if not code:
            raise DhanValidationError(
                f"Unsupported timeframe '{timeframe}'. Supported timeframes: {list(DHAN_INTERVAL_MAP.keys())}"
            )
        return code

    def chunk_date_range(
        self,
        start_date: date,
        end_date: date,
        max_days: int = 30,
    ) -> List[Tuple[date, date]]:
        """
        Split a start_date -> end_date span into sequential non-overlapping chunks.
        Example: 2024-01-01 to 2024-03-01 with max_days=30 yields:
        [(2024-01-01, 2024-01-30), (2024-01-31, 2024-03-01)]
        """
        if start_date > end_date:
            raise DhanValidationError(
                f"start_date ({start_date}) cannot be after end_date ({end_date})"
            )

        chunks = []
        curr_start = start_date

        while curr_start <= end_date:
            curr_end = min(curr_start + timedelta(days=max_days - 1), end_date)
            chunks.append((curr_start, curr_end))
            curr_start = curr_end + timedelta(days=1)

        return chunks

    def parse_dhan_response(
        self,
        raw_data: dict,
        security_id: str,
        exchange_segment: str,
        symbol: str,
        timeframe: str,
    ) -> List[Dict[str, Any]]:
        """
        Normalize Dhan raw chart response arrays into list of standardized candle dicts.
        Dhan response format:
        {
          "open": [100.5, ...],
          "high": [105.0, ...],
          "low": [99.0, ...],
          "close": [104.2, ...],
          "volume": [5000, ...],
          "start_Time": [1704081000, ...] or "timestamp": [...]
        }
        """
        if not isinstance(raw_data, dict):
            raise DhanDataError("Expected JSON dictionary from Dhan chart endpoint", details={"raw": str(raw_data)[:200]})

        opens = raw_data.get("open") or []
        highs = raw_data.get("high") or []
        lows = raw_data.get("low") or []
        closes = raw_data.get("close") or []
        volumes = raw_data.get("volume") or []
        timestamps = raw_data.get("start_Time") or raw_data.get("timestamp") or []
        open_interests = raw_data.get("open_interest") or []

        count = len(timestamps)
        if not count:
            logger.info("Dhan returned empty candle series for %s (%s)", symbol, timeframe)
            return []

        # Validate array lengths match
        if not (len(opens) == len(highs) == len(lows) == len(closes) == count):
            raise DhanDataError(
                "Mismatched series lengths in Dhan response",
                details={
                    "timestamps": count,
                    "open": len(opens),
                    "high": len(highs),
                    "low": len(lows),
                    "close": len(closes),
                },
            )

        normalized_candles = []
        for i in range(count):
            ts_val = timestamps[i]
            # Convert timestamp (can be epoch seconds, epoch ms, or ISO string)
            if isinstance(ts_val, (int, float)):
                # If milliseconds (greater than year 3000 in seconds)
                if ts_val > 30000000000:
                    dt = datetime.fromtimestamp(ts_val / 1000, tz=MARKET_TIMEZONE)
                else:
                    dt = datetime.fromtimestamp(ts_val, tz=MARKET_TIMEZONE)
            elif isinstance(ts_val, str):
                try:
                    dt = datetime.fromisoformat(ts_val)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=MARKET_TIMEZONE)
                except ValueError:
                    dt = datetime.strptime(ts_val, "%Y-%m-%d %H:%M:%S").replace(tzinfo=MARKET_TIMEZONE)
            else:
                continue

            vol = volumes[i] if i < len(volumes) and volumes[i] is not None else 0
            oi = open_interests[i] if i < len(open_interests) and open_interests[i] is not None else None

            normalized_candles.append({
                "security_id": str(security_id),
                "exchange_segment": str(exchange_segment),
                "symbol": str(symbol),
                "timeframe": str(timeframe),
                "timestamp": dt,
                "open": float(opens[i]),
                "high": float(highs[i]),
                "low": float(lows[i]),
                "close": float(closes[i]),
                "volume": int(vol),
                "open_interest": int(oi) if oi is not None else None,
            })

        # Deduplicate and sort strictly by timestamp
        seen = set()
        deduped = []
        for c in normalized_candles:
            ts = c["timestamp"]
            if ts not in seen:
                seen.add(ts)
                deduped.append(c)

        deduped.sort(key=lambda x: x["timestamp"])
        return deduped

    def fetch_historical_data(
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
        Fetches historical candles across date range with automatic chunking.
        Merges, sorts, and deduplicates the candle series.
        """
        interval_code = self.get_interval_code(timeframe)
        max_chunk = MAX_CHUNK_DAYS_MAP.get(timeframe.lower(), 30)
        chunks = self.chunk_date_range(start_date, end_date, max_days=max_chunk)

        all_candles: List[Dict[str, Any]] = []

        logger.info(
            "Fetching historical data for %s (%s, %s) from %s to %s across %d chunk(s)",
            symbol,
            security_id,
            timeframe,
            start_date,
            end_date,
            len(chunks),
        )

        for idx, (c_start, c_end) in enumerate(chunks, 1):
            logger.debug(
                "Requesting chunk %d/%d for %s: %s -> %s",
                idx,
                len(chunks),
                symbol,
                c_start,
                c_end,
            )

            if interval_code == "1d":
                payload = {
                    "securityId": str(security_id),
                    "exchangeSegment": str(exchange_segment),
                    "instrument": instrument_type,
                    "expiryCode": 0,
                    "fromDate": c_start.strftime("%Y-%m-%d"),
                    "toDate": c_end.strftime("%Y-%m-%d"),
                }
                raw = self.client.daily_charts(payload)
            else:
                payload = {
                    "securityId": str(security_id),
                    "exchangeSegment": str(exchange_segment),
                    "instrument": instrument_type,
                    "interval": interval_code,
                    "fromDate": c_start.strftime("%Y-%m-%d"),
                    "toDate": c_end.strftime("%Y-%m-%d"),
                }
                raw = self.client.historical_data(payload)

            parsed = self.parse_dhan_response(
                raw_data=raw,
                security_id=security_id,
                exchange_segment=exchange_segment,
                symbol=symbol,
                timeframe=timeframe,
            )
            all_candles.extend(parsed)

        # Merge, deduplicate by timestamp and sort
        merged_dict: Dict[datetime, Dict[str, Any]] = {}
        for candle in all_candles:
            merged_dict[candle["timestamp"]] = candle

        sorted_candles = [merged_dict[ts] for ts in sorted(merged_dict.keys())]
        logger.info(
            "Successfully fetched and normalized %d candles for %s (%s)",
            len(sorted_candles),
            symbol,
            timeframe,
        )
        return sorted_candles

    @transaction.atomic
    def sync_and_store_candles(
        self,
        security_id: str,
        exchange_segment: str,
        symbol: str,
        timeframe: str,
        start_date: date,
        end_date: date,
        instrument_type: str = "EQUITY",
    ) -> int:
        """
        Fetch candles from Dhan, normalize them, and bulk upsert them into the Candle table.
        Returns the count of candles persisted.
        """
        candles = self.fetch_historical_data(
            security_id=security_id,
            exchange_segment=exchange_segment,
            symbol=symbol,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
            instrument_type=instrument_type,
        )

        if not candles:
            return 0

        candle_models = [
            Candle(
                security_id=c["security_id"],
                exchange_segment=c["exchange_segment"],
                symbol=c["symbol"],
                timeframe=c["timeframe"],
                timestamp=c["timestamp"],
                open=c["open"],
                high=c["high"],
                low=c["low"],
                close=c["close"],
                volume=c["volume"],
                open_interest=c["open_interest"],
            )
            for c in candles
        ]

        # Use bulk_create with ignore_conflicts or update_conflicts on unique constraint
        Candle.objects.bulk_create(
            candle_models,
            batch_size=1000,
            update_conflicts=True,
            update_fields=["open", "high", "low", "close", "volume", "open_interest"],
            unique_fields=["security_id", "timeframe", "timestamp"],
        )

        logger.info(
            "Persisted %d candles into Candle database for %s (%s)",
            len(candle_models),
            symbol,
            timeframe,
        )
        return len(candle_models)
