"""
Serializers for the market_data app.

Used for:
- Validating historical data requests from API consumers.
- Validating candle sync (write) requests.
- Serializing Candle model instances for API responses.
"""

from rest_framework import serializers

from .models import Candle


class CandleSerializer(serializers.ModelSerializer):
    """Serialize Candle model rows for API output."""

    open = serializers.FloatField()
    high = serializers.FloatField()
    low = serializers.FloatField()
    close = serializers.FloatField()

    class Meta:
        model = Candle
        fields = [
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
        ]


class HistoricalDataRequestSerializer(serializers.Serializer):
    """
    Validates query parameters for the historical candle endpoint.
    GET /api/market-data/historical/?security_id=...&symbol=...&timeframe=...&start=...&end=...
    """

    VALID_TIMEFRAMES = ["1m", "5m", "15m", "25m", "30m", "1h", "60m", "1d", "D"]

    security_id = serializers.CharField(
        max_length=50,
        help_text="Dhan security ID (e.g. '1333' for HDFC Bank)",
    )
    exchange_segment = serializers.CharField(
        max_length=30,
        default="NSE_EQ",
        help_text="Exchange segment (NSE_EQ, NSE_FNO, IDX_I, etc.)",
    )
    symbol = serializers.CharField(
        max_length=100,
        help_text="Trading symbol (e.g. NIFTY, HDFCBANK)",
    )
    timeframe = serializers.ChoiceField(
        choices=VALID_TIMEFRAMES,
        help_text="Candle interval",
    )
    start_date = serializers.DateField(
        input_formats=["%Y-%m-%d"],
        help_text="Start date (YYYY-MM-DD)",
    )
    end_date = serializers.DateField(
        input_formats=["%Y-%m-%d"],
        help_text="End date (YYYY-MM-DD)",
    )
    instrument_type = serializers.ChoiceField(
        choices=["EQUITY", "INDEX", "FUTIDX", "OPTIDX", "FUTSTK", "OPTSTK"],
        default="EQUITY",
        required=False,
    )
    provider = serializers.ChoiceField(
        choices=["dhan", "csv"],
        default="dhan",
        required=False,
        help_text="Data provider: 'dhan' (API + DB cache) or 'csv' (local files)",
    )

    def validate(self, data):
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError(
                {"start_date": "start_date must not be after end_date."}
            )
        return data


class SyncCandlesRequestSerializer(serializers.Serializer):
    """
    Validates POST body for the candle sync endpoint.
    POST /api/market-data/sync/
    Triggers a live fetch from Dhan and persists candles to PostgreSQL.
    """

    VALID_TIMEFRAMES = ["1m", "5m", "15m", "25m", "30m", "1h", "60m", "1d"]

    security_id = serializers.CharField(max_length=50)
    exchange_segment = serializers.CharField(max_length=30, default="NSE_EQ")
    symbol = serializers.CharField(max_length=100)
    timeframe = serializers.ChoiceField(choices=VALID_TIMEFRAMES)
    start_date = serializers.DateField(input_formats=["%Y-%m-%d"])
    end_date = serializers.DateField(input_formats=["%Y-%m-%d"])
    instrument_type = serializers.ChoiceField(
        choices=["EQUITY", "INDEX", "FUTIDX", "OPTIDX", "FUTSTK", "OPTSTK"],
        default="EQUITY",
        required=False,
    )

    def validate(self, data):
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError(
                {"start_date": "start_date must not be after end_date."}
            )
        return data
