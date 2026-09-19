"""
Management command: sync_dhan_candles

Fetches historical OHLCV candles from the Dhan API for a specified
instrument and date range, then bulk-upserts them into the local
PostgreSQL Candle table.

Usage:
    python manage.py sync_dhan_candles \\
        --security-id 1333 \\
        --exchange-segment NSE_EQ \\
        --symbol HDFCBANK \\
        --timeframe 1d \\
        --start-date 2023-01-01 \\
        --end-date 2023-12-31

    # Sync NIFTY 5-minute intraday candles for a week:
    python manage.py sync_dhan_candles \\
        --security-id 13 \\
        --exchange-segment IDX_I \\
        --symbol NIFTY \\
        --timeframe 5m \\
        --start-date 2024-03-01 \\
        --end-date 2024-03-07 \\
        --instrument-type INDEX

Exiting codes:
    0 — Success
    1 — Validation error or Dhan API error (logged)
"""

import sys
from datetime import date

from django.core.management.base import BaseCommand, CommandError

from apps.dhan.exceptions import DhanBaseException, DhanValidationError
from apps.dhan.services.historical_data import DhanHistoricalService, DHAN_INTERVAL_MAP


class Command(BaseCommand):
    help = "Sync historical OHLCV candles from Dhan API into the local Candle database table."

    def add_arguments(self, parser):
        parser.add_argument(
            "--security-id",
            required=True,
            type=str,
            help="Dhan security ID for the instrument (e.g. '1333' for HDFC Bank).",
        )
        parser.add_argument(
            "--exchange-segment",
            required=True,
            type=str,
            help="Exchange segment (e.g. NSE_EQ, NSE_FNO, IDX_I).",
        )
        parser.add_argument(
            "--symbol",
            required=True,
            type=str,
            help="Trading symbol for display (e.g. HDFCBANK, NIFTY).",
        )
        parser.add_argument(
            "--timeframe",
            required=True,
            type=str,
            choices=list(DHAN_INTERVAL_MAP.keys()),
            help=f"Candle timeframe. Supported: {', '.join(DHAN_INTERVAL_MAP.keys())}",
        )
        parser.add_argument(
            "--start-date",
            required=True,
            type=str,
            help="Start date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--end-date",
            required=True,
            type=str,
            help="End date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--instrument-type",
            default="EQUITY",
            type=str,
            choices=["EQUITY", "INDEX", "FUTIDX", "OPTIDX", "FUTSTK", "OPTSTK"],
            help="Instrument type (default: EQUITY).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Fetch and show candle count without persisting to database.",
        )

    def handle(self, *args, **options):
        security_id = options["security_id"]
        exchange_segment = options["exchange_segment"]
        symbol = options["symbol"]
        timeframe = options["timeframe"]
        instrument_type = options["instrument_type"]
        dry_run = options["dry_run"]

        # Parse and validate dates
        try:
            start_date = date.fromisoformat(options["start_date"])
            end_date = date.fromisoformat(options["end_date"])
        except ValueError as exc:
            raise CommandError(f"Invalid date format: {exc}") from exc

        if start_date > end_date:
            raise CommandError("--start-date must be before or equal to --end-date.")

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n═══ Dhan Candle Sync ═══\n"
                f"  Symbol         : {symbol}\n"
                f"  Security ID    : {security_id}\n"
                f"  Exchange       : {exchange_segment}\n"
                f"  Timeframe      : {timeframe}\n"
                f"  Date range     : {start_date} → {end_date}\n"
                f"  Instrument type: {instrument_type}\n"
                f"  Mode           : {'DRY RUN' if dry_run else 'LIVE'}\n"
            )
        )

        service = DhanHistoricalService()

        try:
            if dry_run:
                candles = service.fetch_historical_data(
                    security_id=security_id,
                    exchange_segment=exchange_segment,
                    symbol=symbol,
                    timeframe=timeframe,
                    start_date=start_date,
                    end_date=end_date,
                    instrument_type=instrument_type,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[DRY RUN] Would persist {len(candles)} candles (nothing saved)."
                    )
                )
                if candles:
                    first = candles[0]
                    last = candles[-1]
                    self.stdout.write(
                        f"  First candle  : {first['timestamp']}  O={first['open']}  C={first['close']}\n"
                        f"  Last  candle  : {last['timestamp']}  O={last['open']}  C={last['close']}"
                    )
            else:
                count = service.sync_and_store_candles(
                    security_id=security_id,
                    exchange_segment=exchange_segment,
                    symbol=symbol,
                    timeframe=timeframe,
                    start_date=start_date,
                    end_date=end_date,
                    instrument_type=instrument_type,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Successfully synced {count} candle(s) for {symbol} ({timeframe})."
                    )
                )

        except DhanValidationError as exc:
            self.stderr.write(self.style.ERROR(f"Validation error: {exc}"))
            sys.exit(1)

        except DhanBaseException as exc:
            self.stderr.write(self.style.ERROR(f"Dhan API error: {exc}"))
            sys.exit(1)

        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Unexpected error: {exc}"))
            raise CommandError(str(exc)) from exc
