from rest_framework import serializers

from .models import Strategy


class StrategySerializer(serializers.ModelSerializer):

    class Meta:
        model = Strategy
        fields = [
            "id",
            "name",
            "symbol",
            "timeframe",
            "capital",
            "configuration",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_capital(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Capital must be greater than zero."
            )

        return value