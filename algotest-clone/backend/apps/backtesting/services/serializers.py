from rest_framework import serializers

from .models import (
    Backtest,
    BacktestTrade,
)


class BacktestTradeSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = BacktestTrade

        fields = [
            "id",
            "symbol",
            "side",
            "entry_time",
            "entry_price",
            "exit_time",
            "exit_price",
            "quantity",
            "pnl",
            "exit_reason",
        ]


class BacktestSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Backtest

        fields = [
            "id",
            "strategy",
            "start_date",
            "end_date",
            "initial_capital",
            "final_capital",
            "total_pnl",
            "return_percent",
            "win_rate",
            "max_drawdown",
            "total_trades",
            "status",
            "error_message",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "final_capital",
            "total_pnl",
            "return_percent",
            "win_rate",
            "max_drawdown",
            "total_trades",
            "status",
            "error_message",
            "created_at",
        ]

    def validate(self, attrs):

        if (
            attrs["end_date"]
            < attrs["start_date"]
        ):
            raise serializers.ValidationError(
                "End date must be after start date."
            )

        if (
            attrs["initial_capital"]
            <= 0
        ):
            raise serializers.ValidationError(
                "Initial capital must be greater than zero."
            )

        return attrs