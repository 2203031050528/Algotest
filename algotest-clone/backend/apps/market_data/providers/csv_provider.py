"""
CSVProvider — MarketDataProvider backed by local CSV files.

Reads OHLCV candle data from CSV files stored on the filesystem.
Primary use cases:
- Offline backtesting without any API credentials.
- Unit testing without mocking the Dhan API.
- Custom/imported historical data sets.

Expected CSV file naming convention:
    <data_dir>/<symbol>_<timeframe>.csv
    e.g.  data/NIFTY_1d.csv

Expected CSV column schema (case-insensitive headers):
    timestamp, open, high, low, close, volume[, open_interest]

Timestamp column must be parseable by pandas.to_datetime().
"""

import csv
import logging
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from .base import MarketDataProvider

logger = logging.getLogger(__name__)

MARKET_TZ = ZoneInfo("Asia/Kolkata")

# Column aliases for flexible CSV schema matching
COLUMN_ALIASES: Dict[str, List[str]] = {
    "timestamp": ["timestamp", "time", "date", "datetime", "candle_time"],
    "open": ["open", "o"],
    "high": ["high", "h"],
    "low": ["low", "l"],
    "close": ["close", "c"],
    "volume": ["volume", "vol", "v"],
    "open_interest": ["open_interest", "oi"],
}


class CSVProvider(MarketDataProvider):
    """
    Reads historical candle data from local CSV files.

    Files must be named: <symbol>_<timeframe>.csv (case-insensitive)
    and located in `data_dir` (defaults to the Django project's `data/` folder).
    """

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            # Default: backend/data/
            base = os.path.dirname(  # apps/
                os.path.dirname(       # market_data/
                    os.path.dirname(   # providers/
                        os.path.abspath(__file__)
                    )
                )
            )
            data_dir = os.path.join(base, "..", "data")
        self.data_dir = os.path.abspath(data_dir)

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
        Read candles from a CSV file matching the symbol/timeframe pattern.
        Filters rows to the requested date range and returns sorted candle dicts.
        """
        path = self._resolve_file_path(symbol, timeframe)
        if not path:
            logger.warning(
                "[CSVProvider] No CSV file found for symbol=%s timeframe=%s in %s",
                symbol,
                timeframe,
                self.data_dir,
            )
            return []

        rows = self._read_csv(path)
        candles = []

        for row in rows:
            ts = self._parse_timestamp(row.get("timestamp"))
            if ts is None:
                continue

            row_date = ts.date() if hasattr(ts, "date") else ts
            if not (start_date <= row_date <= end_date):
                continue

            try:
                candles.append({
                    "security_id": str(security_id),
                    "exchange_segment": str(exchange_segment),
                    "symbol": str(symbol),
                    "timeframe": str(timeframe),
                    "timestamp": ts,
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(float(row["volume"])) if row.get("volume") else None,
                    "open_interest": (
                        int(float(row["open_interest"]))
                        if row.get("open_interest")
                        else None
                    ),
                })
            except (ValueError, KeyError) as exc:
                logger.debug("[CSVProvider] Skipping row due to parse error: %s", str(exc))
                continue

        candles.sort(key=lambda x: x["timestamp"])
        logger.info(
            "[CSVProvider] Loaded %d candles for %s (%s) from %s",
            len(candles),
            symbol,
            timeframe,
            os.path.basename(path),
        )
        return candles

    def is_available(self) -> bool:
        """CSVProvider is available if the data directory exists and is readable."""
        return os.path.isdir(self.data_dir) and os.access(self.data_dir, os.R_OK)

    def describe(self) -> Dict[str, Any]:
        files = self._list_csv_files()
        available = self.is_available()
        return {
            "name": "csv",
            "provider": self.get_provider_name(),
            "available": available,
            "status": "active" if (available and len(files) > 0) else "standby",
            "source": "Local CSV & Disk Storage",
            "data_dir": self.data_dir,
            "csv_files": files,
            "file_count": len(files),
            "rate_limit": "Unlimited (Disk I/O)",
            "supported_segments": ["NSE_EQ", "NSE_FNO", "IDX_I"],
            "timeframes": ["1m", "5m", "15m", "1d"],
            "priority": 2,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_file_path(self, symbol: str, timeframe: str) -> Optional[str]:
        """
        Resolve the CSV file path for a given (symbol, timeframe) pair.
        Tries various common name patterns, case-insensitive, including subdirectories.
        """
        clean_symbol = symbol.replace(" ", "").replace("_", "")
        candidates = [
            f"{symbol}_{timeframe}.csv",
            f"{symbol.upper()}_{timeframe}.csv",
            f"{symbol.lower()}_{timeframe.lower()}.csv",
            f"{clean_symbol}_{timeframe}.csv",
            f"{clean_symbol.lower()}_{timeframe.lower()}.csv",
        ]

        if "nifty" in symbol.lower() and "bank" not in symbol.lower() and "fin" not in symbol.lower():
            candidates.append(f"nifty_{timeframe.lower()}.csv")

        if not os.path.isdir(self.data_dir):
            return None

        for root, _, files in os.walk(self.data_dir):
            for fname in files:
                if fname.lower() in [c.lower() for c in candidates]:
                    return os.path.join(root, fname)

        return None

    def _list_csv_files(self) -> List[str]:
        """Return list of CSV filenames found in data_dir and subdirectories."""
        if not os.path.isdir(self.data_dir):
            return []
        found = set()
        for root, _, files in os.walk(self.data_dir):
            for f in files:
                if f.lower().endswith(".csv"):
                    found.add(f)
        return sorted(list(found))

    def _read_csv(self, path: str) -> List[Dict[str, str]]:
        """
        Read CSV and normalize column names using COLUMN_ALIASES.
        Returns a list of dicts with standardized keys.
        """
        rows = []
        try:
            with open(path, newline="", encoding="utf-8-sig") as fh:
                reader = csv.DictReader(fh)
                raw_headers = [h.strip().lower() for h in (reader.fieldnames or [])]

                # Build alias mapping: raw_header -> canonical_name
                alias_map: Dict[str, str] = {}
                for canonical, aliases in COLUMN_ALIASES.items():
                    for raw in raw_headers:
                        if raw in [a.lower() for a in aliases]:
                            alias_map[raw] = canonical
                            break

                for raw_row in reader:
                    normalized: Dict[str, str] = {}
                    for raw_key, value in raw_row.items():
                        key = raw_key.strip().lower()
                        canonical = alias_map.get(key, key)
                        normalized[canonical] = value.strip() if value else ""
                    rows.append(normalized)

        except (OSError, csv.Error) as exc:
            logger.error("[CSVProvider] Failed to read CSV %s: %s", path, str(exc))

        return rows

    def _parse_timestamp(self, raw: Optional[str]) -> Optional[datetime]:
        """Parse a timestamp string into a timezone-aware datetime."""
        if not raw:
            return None

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
            "%d-%m-%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(raw.strip(), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=MARKET_TZ)
                return dt
            except ValueError:
                continue

        logger.debug("[CSVProvider] Could not parse timestamp: %r", raw)
        return None
