import pandas as pd

from django.db import transaction

from rest_framework import (
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import Response

from apps.market_data.models import Candle

from .models import (
    Backtest,
    BacktestTrade,
)

from .serializers import (
    BacktestSerializer,
    BacktestTradeSerializer,
)

from .services.engine import (
    BacktestEngine,
)


class BacktestViewSet(
    viewsets.ModelViewSet
):

    serializer_class = BacktestSerializer
    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):

        return (
            Backtest.objects
            .filter(
                user=self.request.user
            )
            .select_related(
                "strategy"
            )
        )

    @transaction.atomic
    def perform_create(
        self,
        serializer,
    ):

        backtest = serializer.save(
            user=self.request.user,
            status="RUNNING",
        )

        try:

            strategy = (
                backtest.strategy
            )

            candles = Candle.objects.filter(
                symbol=strategy.symbol,
                timeframe=strategy.timeframe,
                timestamp__date__gte=backtest.start_date,
                timestamp__date__lte=backtest.end_date,
            ).order_by("timestamp")

            if not candles.exists():

                raise ValueError(
                    "No market data found for the selected "
                    "symbol, timeframe and date range."
                )

            rows = list(
                candles.values(
                    "timestamp",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                )
            )

            df = pd.DataFrame(rows)

            df["close"] = df[
                "close"
            ].astype(float)

            engine = BacktestEngine(
                candles=df,
                configuration=strategy.configuration,
                initial_capital=float(
                    backtest.initial_capital
                ),
            )

            results = engine.run()

            backtest.final_capital = (
                results["final_capital"]
            )

            backtest.total_pnl = (
                results["total_pnl"]
            )

            backtest.return_percent = (
                results["return_percent"]
            )

            backtest.win_rate = (
                results["win_rate"]
            )

            backtest.max_drawdown = (
                results["max_drawdown"]
            )

            backtest.total_trades = (
                results["total_trades"]
            )

            backtest.status = (
                "COMPLETED"
            )

            backtest.save()

            BacktestTrade.objects.bulk_create(
                [
                    BacktestTrade(
                        backtest=backtest,
                        symbol=trade["symbol"],
                        side=trade["side"],
                        entry_time=trade["entry_time"],
                        entry_price=trade["entry_price"],
                        exit_time=trade["exit_time"],
                        exit_price=trade["exit_price"],
                        quantity=trade["quantity"],
                        pnl=trade["pnl"],
                        exit_reason=trade["exit_reason"],
                    )
                    for trade in results["trades"]
                ]
            )

        except Exception as exc:

            backtest.status = "FAILED"

            backtest.error_message = str(
                exc
            )

            backtest.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
            )

    @action(
        detail=True,
        methods=["get"],
        url_path="trades",
    )
    def trades(self, request, pk=None):

        backtest = self.get_object()

        serializer = (
            BacktestTradeSerializer(
                backtest.trades.all(),
                many=True,
            )
        )

        return Response(
            serializer.data
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="equity",
    )
    def equity(self, request, pk=None):

        backtest = self.get_object()

        trades = (
            backtest.trades.all()
        )

        equity = []

        capital = float(
            backtest.initial_capital
        )

        for trade in trades:

            capital += float(
                trade.pnl
            )

            equity.append(
                {
                    "timestamp":
                        trade.exit_time,
                    "equity":
                        capital,
                }
            )

        return Response(
            equity
        )