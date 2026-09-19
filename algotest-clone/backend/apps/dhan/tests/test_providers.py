"""
Tests for DhanProvider and CSVProvider.

DhanProvider: DB-first caching, gap detection, and API gap-fill logic.
CSVProvider: File discovery, column aliasing, timestamp parsing, date filtering.
"""

import os
import tempfile
from datetime import date, datetime
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from django.test import TestCase

from apps.market_data.providers.base import MarketDataProvider
from apps.market_data.providers.csv_provider import CSVProvider
from apps.market_data.providers.dhan_provider import DhanProvider

MARKET_TZ = ZoneInfo("Asia/Kolkata")


# ---------------------------------------------------------------------------
# DhanProvider tests
# ---------------------------------------------------------------------------

class DhanProviderInterfaceTestCase(TestCase):
    """DhanProvider must conform to the MarketDataProvider ABC."""

    def test_is_market_data_provider(self):
        provider = DhanProvider()
        self.assertIsInstance(provider, MarketDataProvider)

    def test_provider_name(self):
        self.assertEqual(DhanProvider().get_provider_name(), "DhanProvider")

    def test_validate_timeframe(self):
        provider = DhanProvider()
        self.assertTrue(provider.validate_timeframe("1d"))
        self.assertTrue(provider.validate_timeframe("5m"))
        self.assertFalse(provider.validate_timeframe("2w"))


class DhanProviderCacheFirstTestCase(TestCase):
    """Test that DhanProvider serves from DB cache and only calls API for gaps."""

    def _make_candle(self, ts: datetime) -> dict:
        return {
            "security_id": "1333",
            "exchange_segment": "NSE_EQ",
            "symbol": "HDFCBANK",
            "timeframe": "1d",
            "timestamp": ts,
            "open": 1500.0,
            "high": 1550.0,
            "low": 1490.0,
            "close": 1525.0,
            "volume": 100000,
            "open_interest": None,
        }

    @patch("apps.market_data.providers.dhan_provider.DhanProvider._get_cached_candles")
    @patch("apps.market_data.providers.dhan_provider.DhanProvider._find_missing_ranges")
    def test_returns_cache_when_no_gaps(self, mock_missing, mock_cache):
        """When no missing ranges, provider should NOT call sync_and_store."""
        cached = [self._make_candle(datetime(2024, 1, 2, tzinfo=MARKET_TZ))]
        mock_cache.return_value = cached
        mock_missing.return_value = []  # no gaps

        mock_service = MagicMock()
        provider = DhanProvider()
        provider._service = mock_service

        result = provider.get_historical_data(
            security_id="1333",
            exchange_segment="NSE_EQ",
            symbol="HDFCBANK",
            timeframe="1d",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 5),
        )

        mock_service.sync_and_store_candles.assert_not_called()
        self.assertEqual(result, cached)

    @patch("apps.market_data.providers.dhan_provider.DhanProvider._get_cached_candles")
    @patch("apps.market_data.providers.dhan_provider.DhanProvider._find_missing_ranges")
    def test_calls_sync_for_gaps(self, mock_missing, mock_cache):
        """When missing ranges detected, sync_and_store should be called for each gap."""
        mock_cache.return_value = []
        mock_missing.return_value = [(date(2024, 1, 1), date(2024, 1, 5))]

        mock_service = MagicMock()
        mock_service.sync_and_store_candles.return_value = 5
        provider = DhanProvider()
        provider._service = mock_service

        provider.get_historical_data(
            security_id="1333",
            exchange_segment="NSE_EQ",
            symbol="HDFCBANK",
            timeframe="1d",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 5),
        )

        mock_service.sync_and_store_candles.assert_called_once()


class DhanProviderMissingRangesTestCase(TestCase):
    """Test gap detection logic."""

    def setUp(self):
        self.provider = DhanProvider()

    def test_empty_cache_returns_full_range_as_gap(self):
        gaps = self.provider._find_missing_ranges(
            [], date(2024, 1, 1), date(2024, 1, 5), "1d"
        )
        self.assertEqual(gaps, [(date(2024, 1, 1), date(2024, 1, 5))])

    def test_fully_cached_returns_no_gaps(self):
        # Provide all weekday candles for Jan 1-5 2024 (Mon-Fri)
        candles = [
            {"timestamp": datetime(2024, 1, d, tzinfo=MARKET_TZ)}
            for d in [1, 2, 3, 4, 5]
        ]
        gaps = self.provider._find_missing_ranges(
            candles, date(2024, 1, 1), date(2024, 1, 5), "1d"
        )
        self.assertEqual(gaps, [])


# ---------------------------------------------------------------------------
# CSVProvider tests
# ---------------------------------------------------------------------------

class CSVProviderInterfaceTestCase(TestCase):
    """CSVProvider must conform to MarketDataProvider."""

    def test_is_market_data_provider(self):
        self.assertIsInstance(CSVProvider(), MarketDataProvider)

    def test_provider_name(self):
        self.assertEqual(CSVProvider().get_provider_name(), "CSVProvider")

    def test_unavailable_when_dir_missing(self):
        provider = CSVProvider(data_dir="/nonexistent/path/xyz")
        self.assertFalse(provider.is_available())


class CSVProviderReadTestCase(TestCase):
    """Test CSV reading, column aliasing, and date filtering."""

    def _write_csv(self, directory: str, filename: str, rows: list) -> None:
        import csv as csv_mod
        path = os.path.join(directory, filename)
        with open(path, "w", newline="") as f:
            if rows:
                writer = csv_mod.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)

    def test_reads_standard_csv(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            self._write_csv(tmpdir, "HDFCBANK_1d.csv", [
                {"timestamp": "2024-01-02", "open": "1500", "high": "1550", "low": "1490", "close": "1525", "volume": "100000"},
                {"timestamp": "2024-01-03", "open": "1525", "high": "1560", "low": "1510", "close": "1540", "volume": "90000"},
            ])
            provider = CSVProvider(data_dir=tmpdir)
            candles = provider.get_historical_data(
                security_id="1333",
                exchange_segment="NSE_EQ",
                symbol="HDFCBANK",
                timeframe="1d",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
            self.assertEqual(len(candles), 2)
            self.assertEqual(candles[0]["close"], 1525.0)

    def test_date_filter_applied(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            self._write_csv(tmpdir, "HDFCBANK_1d.csv", [
                {"timestamp": "2024-01-02", "open": "1500", "high": "1550", "low": "1490", "close": "1525", "volume": "1000"},
                {"timestamp": "2024-02-01", "open": "1525", "high": "1560", "low": "1510", "close": "1540", "volume": "900"},
            ])
            provider = CSVProvider(data_dir=tmpdir)
            candles = provider.get_historical_data(
                security_id="1333",
                exchange_segment="NSE_EQ",
                symbol="HDFCBANK",
                timeframe="1d",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
            self.assertEqual(len(candles), 1)
            self.assertEqual(candles[0]["close"], 1525.0)

    def test_missing_file_returns_empty_list(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = CSVProvider(data_dir=tmpdir)
            result = provider.get_historical_data(
                security_id="999",
                exchange_segment="NSE_EQ",
                symbol="UNKNOWN",
                timeframe="1d",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31),
            )
            self.assertEqual(result, [])

    def test_column_alias_vol_accepted(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            self._write_csv(tmpdir, "NIFTY_1d.csv", [
                {"timestamp": "2024-01-02", "open": "21000", "high": "21100", "low": "20900", "close": "21050", "vol": "500000"},
            ])
            provider = CSVProvider(data_dir=tmpdir)
            candles = provider.get_historical_data(
                security_id="13",
                exchange_segment="IDX_I",
                symbol="NIFTY",
                timeframe="1d",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
            self.assertEqual(len(candles), 1)

    def test_candles_sorted_by_timestamp(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            self._write_csv(tmpdir, "RELIANCE_1d.csv", [
                {"timestamp": "2024-01-05", "open": "2800", "high": "2850", "low": "2790", "close": "2830", "volume": "200000"},
                {"timestamp": "2024-01-02", "open": "2750", "high": "2800", "low": "2740", "close": "2780", "volume": "150000"},
            ])
            provider = CSVProvider(data_dir=tmpdir)
            candles = provider.get_historical_data(
                security_id="2885",
                exchange_segment="NSE_EQ",
                symbol="RELIANCE",
                timeframe="1d",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
            tss = [c["timestamp"] for c in candles]
            self.assertEqual(tss, sorted(tss))
