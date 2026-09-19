import csv
import io
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import requests
from django.db import transaction

from apps.instruments.models import Instrument

logger = logging.getLogger(__name__)

DHAN_SCRIP_MASTER_URL = "https://images.dhan.co/api-data/api-scrip-master.csv"

# Curated core instruments for immediate seeding and offline readiness
POPULAR_SEEDED_INSTRUMENTS: List[Dict[str, Any]] = [
    {
        "exchange_segment": "IDX_I",
        "security_id": "13",
        "trading_symbol": "NIFTY",
        "symbol": "NIFTY 50",
        "name": "Nifty 50 Index",
        "instrument_type": "INDEX",
        "lot_size": 25,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "IDX_I",
        "security_id": "25",
        "trading_symbol": "BANKNIFTY",
        "symbol": "BANKNIFTY",
        "name": "Nifty Bank Index",
        "instrument_type": "INDEX",
        "lot_size": 15,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "IDX_I",
        "security_id": "27",
        "trading_symbol": "FINNIFTY",
        "symbol": "FINNIFTY",
        "name": "Nifty Financial Services Index",
        "instrument_type": "INDEX",
        "lot_size": 25,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "IDX_I",
        "security_id": "51",
        "trading_symbol": "SENSEX",
        "symbol": "SENSEX",
        "name": "BSE Sensex Index",
        "instrument_type": "INDEX",
        "lot_size": 10,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "1333",
        "trading_symbol": "HDFCBANK",
        "symbol": "HDFCBANK",
        "name": "HDFC Bank Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "2885",
        "trading_symbol": "RELIANCE",
        "symbol": "RELIANCE",
        "name": "Reliance Industries Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "4963",
        "trading_symbol": "ICICIBANK",
        "symbol": "ICICIBANK",
        "name": "ICICI Bank Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "1594",
        "trading_symbol": "INFY",
        "symbol": "INFY",
        "name": "Infosys Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "11536",
        "trading_symbol": "TCS",
        "symbol": "TCS",
        "name": "Tata Consultancy Services Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "3045",
        "trading_symbol": "SBIN",
        "symbol": "SBIN",
        "name": "State Bank of India",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
    {
        "exchange_segment": "NSE_EQ",
        "security_id": "3456",
        "trading_symbol": "TATAMOTORS",
        "symbol": "TATAMOTORS",
        "name": "Tata Motors Limited",
        "instrument_type": "EQUITY",
        "lot_size": 1,
        "tick_size": Decimal("0.05"),
        "source": "DHAN",
    },
]


class DhanInstrumentService:
    """
    Parses and synchronizes Dhan scrip master data into the internal Instrument model.
    """

    def map_exchange_segment(self, exch: str, seg: str) -> str:
        exch = (exch or "").strip().upper()
        seg = (seg or "").strip().upper()

        if exch == "NSE":
            if seg in ("E", "EQ"):
                return "NSE_EQ"
            if seg in ("D", "FNO"):
                return "NSE_FNO"
            if seg in ("C", "CURR"):
                return "NSE_CURR"
        elif exch == "BSE":
            if seg in ("E", "EQ"):
                return "BSE_EQ"
            if seg in ("D", "FNO"):
                return "BSE_FNO"
        elif exch in ("MCX", "COMM"):
            return "MCX_COMM"
        elif exch in ("IDX", "INDEX"):
            return "IDX_I"

        return f"{exch}_{seg}" if exch and seg else "NSE_EQ"

    def seed_popular_instruments(self) -> int:
        """
        Seed popular high-volume instruments into the Instrument database.
        Returns count of instruments created or updated.
        """
        count = 0
        for item in POPULAR_SEEDED_INSTRUMENTS:
            _, created = Instrument.objects.update_or_create(
                exchange_segment=item["exchange_segment"],
                security_id=item["security_id"],
                defaults=item,
            )
            count += 1
        logger.info("Successfully seeded %d core instruments into database", count)
        return count

    def sync_from_csv(
        self,
        csv_source: Optional[str] = None,
        limit: Optional[int] = None,
        allowed_segments: Optional[List[str]] = None,
    ) -> int:
        """
        Download or read Dhan Scrip Master CSV and synchronize instruments.
        csv_source: Local filepath or HTTP(S) URL. If None, uses official Dhan scrip URL.
        """
        url_or_path = csv_source or DHAN_SCRIP_MASTER_URL

        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            logger.info("Downloading Dhan Scrip Master from %s ...", url_or_path)
            response = requests.get(url_or_path, stream=True, timeout=60)
            response.raise_for_status()
            lines = (line.decode("utf-8", errors="ignore") for line in response.iter_lines())
            reader = csv.DictReader(lines)
        else:
            file_obj = open(url_or_path, mode="r", encoding="utf-8", errors="ignore")
            reader = csv.DictReader(file_obj)

        instruments_to_save: List[Instrument] = []
        saved_count = 0
        batch_size = 2000

        for row in reader:
            if limit and saved_count + len(instruments_to_save) >= limit:
                break

            security_id = row.get("SEM_SMST_SECURITY_ID", "").strip()
            exch_id = row.get("SEM_EXM_EXCH_ID", "").strip()
            segment_code = row.get("SEM_SEGMENT", "").strip()
            trading_symbol = row.get("SEM_TRADING_SYMBOL", "").strip()
            custom_symbol = row.get("SEM_CUSTOM_SYMBOL", "").strip() or trading_symbol
            instrument_name = row.get("SEM_INSTRUMENT_NAME", "").strip().upper()

            if not security_id or not trading_symbol:
                continue

            exchange_segment = self.map_exchange_segment(exch_id, segment_code)
            if allowed_segments and exchange_segment not in allowed_segments:
                continue

            # Parse optional expiry date
            expiry_date = None
            raw_expiry = row.get("SEM_EXPIRY_DATE", "").strip()
            if raw_expiry and raw_expiry != "0000-00-00":
                try:
                    expiry_date = datetime.strptime(raw_expiry[:10], "%Y-%m-%d").date()
                except ValueError:
                    pass

            # Parse optional strike and option type
            strike_val = None
            raw_strike = row.get("SEM_STRIKE_PRICE", "").strip()
            if raw_strike and raw_strike != "0":
                try:
                    strike_val = Decimal(raw_strike)
                except Exception:
                    pass

            opt_type = row.get("SEM_OPTION_TYPE", "").strip().upper()
            if opt_type not in ("CE", "PE"):
                opt_type = None

            # Lot and tick size
            lot_size = 1
            try:
                lot_size = int(row.get("SEM_LOT_UNITS", 1) or 1)
            except (ValueError, TypeError):
                pass

            tick_size = Decimal("0.05")
            try:
                raw_tick = row.get("SEM_TICK_SIZE", "0.05")
                if raw_tick:
                    tick_size = Decimal(raw_tick)
            except Exception:
                pass

            inst = Instrument(
                exchange_segment=exchange_segment,
                security_id=security_id,
                trading_symbol=trading_symbol,
                symbol=custom_symbol,
                name=row.get("SEM_INSTRUMENT_NAME", "").strip(),
                instrument_type=instrument_name or "EQUITY",
                expiry=expiry_date,
                strike=strike_val,
                option_type=opt_type,
                lot_size=lot_size,
                tick_size=tick_size,
                source="DHAN",
                is_active=True,
            )
            instruments_to_save.append(inst)

            if len(instruments_to_save) >= batch_size:
                with transaction.atomic():
                    Instrument.objects.bulk_create(
                        instruments_to_save,
                        ignore_conflicts=True,
                        batch_size=batch_size,
                    )
                saved_count += len(instruments_to_save)
                logger.info("Persisted %d instruments batch (total: %d)", len(instruments_to_save), saved_count)
                instruments_to_save = []

        if instruments_to_save:
            with transaction.atomic():
                Instrument.objects.bulk_create(
                    instruments_to_save,
                    ignore_conflicts=True,
                    batch_size=batch_size,
                )
            saved_count += len(instruments_to_save)

        logger.info("Completed Dhan scrip master sync. Total instruments: %d", saved_count)
        return saved_count

    def _parse_csv_row(self, row):
        """
        Parse a single Dhan Scrip Master CSV row into a normalized instrument dict.
        Returns None if the row is missing required fields.
        """
        security_id = row.get("SEM_SMST_SECURITY_ID", "").strip()
        trading_symbol = row.get("SEM_TRADING_SYMBOL", "").strip()

        if not security_id or not trading_symbol:
            return None

        exch_id = row.get("SEM_EXM_EXCH_ID", "").strip()
        segment_code = row.get("SEM_SEGMENT", "").strip()
        custom_symbol = row.get("SEM_CUSTOM_SYMBOL", "").strip() or trading_symbol
        instrument_name = row.get("SEM_INSTRUMENT_NAME", "").strip().upper()
        exchange_segment = self.map_exchange_segment(exch_id, segment_code)

        expiry_date = None
        raw_expiry = row.get("SEM_EXPIRY_DATE", "").strip()
        if raw_expiry and raw_expiry != "0000-00-00":
            try:
                expiry_date = datetime.strptime(raw_expiry[:10], "%Y-%m-%d").date()
            except ValueError:
                pass

        strike_val = None
        raw_strike = row.get("SEM_STRIKE_PRICE", "").strip()
        if raw_strike and raw_strike not in ("0", ""):
            try:
                strike_val = Decimal(raw_strike)
            except Exception:
                pass

        opt_type = row.get("SEM_OPTION_TYPE", "").strip().upper()
        if opt_type not in ("CE", "PE"):
            opt_type = None

        lot_size = 1
        try:
            lot_size = int(row.get("SEM_LOT_UNITS", 1) or 1)
        except (ValueError, TypeError):
            pass

        tick_size = Decimal("0.05")
        try:
            raw_tick = row.get("SEM_TICK_SIZE", "0.05")
            if raw_tick:
                tick_size = Decimal(raw_tick)
        except Exception:
            pass

        return {
            "security_id": security_id,
            "exchange_segment": exchange_segment,
            "trading_symbol": trading_symbol,
            "symbol": custom_symbol,
            "name": instrument_name,
            "instrument_type": instrument_name or "EQUITY",
            "expiry": expiry_date,
            "strike": strike_val,
            "option_type": opt_type,
            "lot_size": lot_size,
            "tick_size": tick_size,
        }

