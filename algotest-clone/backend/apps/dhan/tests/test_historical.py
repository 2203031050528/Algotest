"""
Tests for DhanHistoricalService: interval mapping, date chunking,
candle normalization, empty/invalid response handling.
"""

from datetime import date, datetime
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from django.test import TestCase

from apps.dhan.exceptions import DhanDataError, DhanValidationError
from apps.dhan.services.historical_data import (
    DhanHistoricalService,
    DHAN_INTERVAL_MAP,
    MAX_CHUNK_DAYS_MAP,
)

MARKET_TZ = ZoneInfo("Asia/Kolkata")


class IntervalMappingTestCase(TestCase):
    """Verify all supported timeframes map to correct Dhan interval codes."""

    def setUp(self):
        self.service = DhanHistoricalService(client=MagicMock())

    def test_supported_timeframes_return_codes(self):
        expected = {
            "1m": "1",
            "5m": "5",
            "15m": "15",
            "25m": "25",
            "1h": "60",
            "60m": "60",
            "1d": "1d",
            "D": "1d",
        }
        for tf, expected_code in expected.items():
            code = self.service.get_interval_code(tf)
            self.assertEqual(code, expected_code, f"Timeframe {tf} mismatch")

    def test_unsupported_timeframe_raises_validation_error(self):
        with self.assertRaises(DhanValidationError):
            self.service.get_interval_code("2d")

    def test_case_insensitive_lookup(self):
        # "1M" should still work
        code = self.service.get_interval_code("1M")
        self.assertEqual(code, "1")


class ChunkDateRangeTestCase(TestCase):
    """Test date range chunking logic."""

    def setUp(self):
        self.service = DhanHistoricalService(client=MagicMock())

    def test_single_chunk_within_window(self):
        chunks = self.service.chunk_date_range(
            date(2024, 1, 1), date(2024, 1, 15), max_days=30
        )
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], (date(2024, 1, 1), date(2024, 1, 15)))

    def test_multiple_chunks_split_correctly(self):
        chunks = self.service.chunk_date_range(
            date(2024, 1, 1), date(2024, 3, 1), max_days=30
        )
        self.assertGreater(len(chunks), 1)
        # Verify continuity: each chunk end + 1 = next chunk start
        for i in range(len(chunks) - 1):
            from datetime import timedelta
            self.assertEqual(
                chunks[i][1] + timedelta(days=1),
                chunks[i + 1][0],
            )

    def test_exact_boundary_chunk(self):
        chunks = self.service.chunk_date_range(
            date(2024, 1, 1), date(2024, 1, 30), max_days=30
        )
        self.assertEqual(len(chunks), 1)

    def test_start_after_end_raises(self):
        with self.assertRaises(DhanValidationError):
            self.service.chunk_date_range(date(2024, 3, 1), date(2024, 1, 1))

    def test_single_day_range(self):
        chunks = self.service.chunk_date_range(
            date(2024, 5, 10), date(2024, 5, 10), max_days=30
        )
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], (date(2024, 5, 10), date(2024, 5, 10)))


class ParseDhanResponseTestCase(TestCase):
    """Test normalization of Dhan raw API response into candle dicts."""

    def setUp(self):
        self.service = DhanHistoricalService(client=MagicMock())
        self.base_kwargs = {
            "security_id": "1333",
            "exchange_segment": "NSE_EQ",
            "symbol": "HDFCBANK",
            "timeframe": "1d",
        }

    def _make_raw(self, n=3):
        base_ts = 1704067200  # 2024-01-01 00:00:00 UTC
        return {
            "open":       [100.0 + i for i in range(n)],
            "high":       [110.0 + i for i in range(n)],
            "low":        [90.0 + i for i in range(n)],
            "close":      [105.0 + i for i in range(n)],
            "volume":     [5000 + i * 100 for i in range(n)],
            "start_Time": [base_ts + i * 86400 for i in range(n)],
        }

    def test_normal_response_parses_correctly(self):
        raw = self._make_raw(3)
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        self.assertEqual(len(candles), 3)
        self.assertIn("timestamp", candles[0])
        self.assertIn("open", candles[0])
        self.assertIn("close", candles[0])

    def test_empty_timestamps_returns_empty_list(self):
        raw = {"open": [], "high": [], "low": [], "close": [], "volume": [], "start_Time": []}
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        self.assertEqual(candles, [])

    def test_candles_sorted_by_timestamp(self):
        raw = self._make_raw(5)
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        timestamps = [c["timestamp"] for c in candles]
        self.assertEqual(timestamps, sorted(timestamps))

    def test_deduplicates_timestamps(self):
        raw = self._make_raw(3)
        # Duplicate the first timestamp
        raw["start_Time"][1] = raw["start_Time"][0]
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        # Should have 2 unique timestamps (0 and 2)
        self.assertEqual(len(candles), 2)

    def test_mismatched_array_lengths_raises_data_error(self):
        raw = self._make_raw(3)
        raw["close"] = [1.0]  # wrong length
        with self.assertRaises(DhanDataError):
            self.service.parse_dhan_response(raw, **self.base_kwargs)

    def test_non_dict_response_raises_data_error(self):
        with self.assertRaises(DhanDataError):
            self.service.parse_dhan_response(["list", "not", "dict"], **self.base_kwargs)

    def test_iso_string_timestamp_parsed(self):
        raw = {
            "open": [100.0],
            "high": [110.0],
            "low": [90.0],
            "close": [105.0],
            "volume": [5000],
            "start_Time": ["2024-01-15 09:15:00"],
        }
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        self.assertEqual(len(candles), 1)
        self.assertIsInstance(candles[0]["timestamp"], datetime)

    def test_millisecond_epoch_parsed_correctly(self):
        # Epoch in milliseconds
        raw = {
            "open": [200.0],
            "high": [210.0],
            "low": [195.0],
            "close": [205.0],
            "volume": [1000],
            "start_Time": [1704067200000],  # milliseconds
        }
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        self.assertEqual(len(candles), 1)

    def test_open_interest_optional(self):
        raw = self._make_raw(2)
        # No open_interest key
        candles = self.service.parse_dhan_response(raw, **self.base_kwargs)
        for candle in candles:
            self.assertIsNone(candle["open_interest"])
