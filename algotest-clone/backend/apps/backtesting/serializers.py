from rest_framework import serializers

from .models import Backtest, BacktestTrade


class BacktestTradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BacktestTrade
        fields = [
            "id",
            "backtest",
            "symbol",
            "side",
            "entry_time",
            "entry_price",
            "exit_time",
            "exit_price",
            "quantity",
            "pnl",
            "exit_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class BacktestSerializer(serializers.ModelSerializer):
    trades = BacktestTradeSerializer(
        many=True,
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Backtest
        fields = [
            "id",
            "user",
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
            "status_display",
            "error_message",
            "created_at",
            "updated_at",
            "trades",
        ]

        read_only_fields = [
            "id",
            "user",
            "final_capital",
            "total_pnl",
            "return_percent",
            "win_rate",
            "max_drawdown",
            "total_trades",
            "status",
            "status_display",
            "error_message",
            "created_at",
            "updated_at",
            "trades",
        ]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {
                    "end_date": (
                        "End date must be greater than "
                        "or equal to start date."
                    )
                }
            )

        initial_capital = attrs.get(
            "initial_capital"
        )

        if (
            initial_capital is not None
            and initial_capital <= 0
        ):
            raise serializers.ValidationError(
                {
                    "initial_capital": (
                        "Initial capital must be greater than zero."
                    )
                }
            )

        return attrs