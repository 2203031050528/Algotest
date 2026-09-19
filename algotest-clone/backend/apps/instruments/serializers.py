from rest_framework import serializers
from .models import Instrument


class InstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = [
            "id",
            "exchange_segment",
            "security_id",
            "trading_symbol",
            "symbol",
            "name",
            "instrument_type",
            "expiry",
            "strike",
            "option_type",
            "lot_size",
            "tick_size",
            "source",
            "is_active",
        ]
