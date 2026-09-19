"""
Tests for DhanInstrumentService: CSV parsing, field mapping, seeding.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.dhan.services.instruments import DhanInstrumentService, POPULAR_SEEDED_INSTRUMENTS
from apps.instruments.models import Instrument


class InstrumentServiceSeedTestCase(TestCase):
    """Test pre-seeding of popular instruments."""

    def test_seed_popular_instruments_creates_records(self):
        service = DhanInstrumentService()
        count = service.seed_popular_instruments()
        self.assertGreater(count, 0)
        self.assertEqual(Instrument.objects.count(), count)

    def test_seed_idempotent(self):
        """Running seed twice should not create duplicates."""
        service = DhanInstrumentService()
        count1 = service.seed_popular_instruments()
        count2 = service.seed_popular_instruments()
        self.assertEqual(count1, count2)
        self.assertEqual(Instrument.objects.count(), count1)

    def test_seeded_instruments_have_required_fields(self):
        service = DhanInstrumentService()
        service.seed_popular_instruments()
        nifty = Instrument.objects.get(trading_symbol="NIFTY")
        self.assertEqual(nifty.instrument_type, "INDEX")
        self.assertEqual(nifty.source, "DHAN")
        self.assertTrue(nifty.is_active)

    def test_popular_instruments_list_not_empty(self):
        self.assertGreater(len(POPULAR_SEEDED_INSTRUMENTS), 0)

    def test_popular_instruments_have_required_keys(self):
        required = {"exchange_segment", "security_id", "trading_symbol", "symbol", "instrument_type"}
        for inst in POPULAR_SEEDED_INSTRUMENTS:
            for key in required:
                self.assertIn(key, inst, f"Missing key '{key}' in {inst}")


class InstrumentServiceCSVParsingTestCase(TestCase):
    """Test CSV row parsing and field mapping from Dhan Scrip Master format."""

    def setUp(self):
        self.service = DhanInstrumentService()

    def _make_row(self, overrides=None):
        row = {
            "SEM_EXM_EXCH_ID": "NSE",
            "SEM_SEGMENT": "E",
            "SEM_SMST_SECURITY_ID": "1333",
            "SEM_INSTRUMENT_NAME": "EQUITY",
            "SEM_TRADING_SYMBOL": "HDFCBANK-EQ",
            "SEM_CUSTOM_SYMBOL": "HDFCBANK",
            "SEM_LOT_UNITS": "1",
            "SEM_TICK_SIZE": "0.05",
            "SEM_EXPIRY_DATE": "",
            "SEM_STRIKE_PRICE": "",
            "SEM_OPTION_TYPE": "",
        }
        if overrides:
            row.update(overrides)
        return row

    def test_parse_equity_row(self):
        row = self._make_row()
        result = self.service._parse_csv_row(row)
        self.assertIsNotNone(result)
        self.assertEqual(result["security_id"], "1333")
        self.assertEqual(result["trading_symbol"], "HDFCBANK-EQ")
        self.assertEqual(result["instrument_type"], "EQUITY")

    def test_parse_option_row(self):
        row = self._make_row({
            "SEM_INSTRUMENT_NAME": "OPTIDX",
            "SEM_STRIKE_PRICE": "21000",
            "SEM_OPTION_TYPE": "CE",
            "SEM_EXPIRY_DATE": "2024-03-28",
        })
        result = self.service._parse_csv_row(row)
        self.assertIsNotNone(result)
        self.assertEqual(result["instrument_type"], "OPTIDX")
        self.assertEqual(result["option_type"], "CE")
        self.assertEqual(result["strike"], Decimal("21000"))

    def test_invalid_row_returns_none(self):
        """Rows missing critical fields should return None."""
        result = self.service._parse_csv_row({})
        self.assertIsNone(result)

    def test_lot_size_defaults_to_one(self):
        row = self._make_row({"SEM_LOT_UNITS": ""})
        result = self.service._parse_csv_row(row)
        self.assertEqual(result["lot_size"], 1)

    def test_tick_size_defaults_to_zero_point_zero_five(self):
        row = self._make_row({"SEM_TICK_SIZE": ""})
        result = self.service._parse_csv_row(row)
        self.assertEqual(result["tick_size"], Decimal("0.05"))
