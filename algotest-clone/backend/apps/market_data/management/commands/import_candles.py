import csv
from datetime import datetime
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.market_data.models import Candle


class Command(BaseCommand):
    help = "Import OHLCV candle data from a CSV file"

    # Indian Standard Time
    MARKET_TIMEZONE = ZoneInfo("Asia/Kolkata")

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            type=str,
            help="Path to CSV file",
        )

        parser.add_argument(
            "--security-id",
            default="NIFTY",
        )

        parser.add_argument(
            "--exchange-segment",
            default="NSE_FNO",
        )

        parser.add_argument(
            "--symbol",
            default="NIFTY",
        )

        parser.add_argument(
            "--timeframe",
            default="5m",
        )

    def handle(self, *args, **options):

        csv_file = options["csv_file"]

        security_id = options["security_id"]
        exchange_segment = options["exchange_segment"]
        symbol = options["symbol"]
        timeframe = options["timeframe"]

        try:
            file = open(
                csv_file,
                "r",
                encoding="utf-8",
            )
        except FileNotFoundError:
            raise CommandError(
                f"CSV file not found: {csv_file}"
            )

        created = 0
        updated = 0

        with file:

            reader = csv.DictReader(file)

            required_columns = {
                "timestamp",
                "open",
                "high",
                "low",
                "close",
            }

            missing = (
                required_columns
                - set(reader.fieldnames or [])
            )

            if missing:
                raise CommandError(
                    "Missing columns: "
                    + ", ".join(sorted(missing))
                )

            with transaction.atomic():

                for row_number, row in enumerate(
                    reader,
                    start=2,
                ):

                    try:

                        timestamp = self.parse_timestamp(
                            row["timestamp"]
                        )

                        open_price = float(
                            row["open"]
                        )

                        high_price = float(
                            row["high"]
                        )

                        low_price = float(
                            row["low"]
                        )

                        close_price = float(
                            row["close"]
                        )

                        volume = (
                            int(row["volume"])
                            if row.get("volume")
                            else None
                        )

                    except (ValueError, TypeError) as exc:

                        raise CommandError(
                            f"Invalid data at CSV row "
                            f"{row_number}: {exc}"
                        )

                    _, was_created = (
                        Candle.objects.update_or_create(
                            security_id=security_id,
                            timeframe=timeframe,
                            timestamp=timestamp,
                            defaults={
                                "exchange_segment": exchange_segment,
                                "symbol": symbol,
                                "open": open_price,
                                "high": high_price,
                                "low": low_price,
                                "close": close_price,
                                "volume": volume,
                            },
                        )
                    )

                    if was_created:
                        created += 1
                    else:
                        updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Import completed successfully."
            )
        )

        self.stdout.write(
            f"Created: {created}"
        )

        self.stdout.write(
            f"Updated: {updated}"
        )

    @classmethod
    def parse_timestamp(cls, value):
        """
        Parse CSV timestamp and return a timezone-aware
        datetime in Asia/Kolkata (IST).

        Example:
            2026-01-05 09:15:00
        becomes:
            2026-01-05 09:15:00+05:30
        """

        value = value.strip()

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
        ]

        for fmt in formats:
            try:
                timestamp = datetime.strptime(
                    value,
                    fmt,
                )

                # CSV timestamps are assumed to represent
                # Indian market time (IST).
                return timestamp.replace(
                    tzinfo=cls.MARKET_TIMEZONE
                )

            except ValueError:
                continue

        raise ValueError(
            f"Unsupported timestamp format: {value}"
        )

