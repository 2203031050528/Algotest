from dataclasses import dataclass
from typing import Optional

import pandas as pd

from .indicators import (
    calculate_ema,
    calculate_rsi,
)
from .conditions import (
    evaluate_conditions,
)


@dataclass
class Position:

    side: str

    entry_time: object

    entry_price: float

    quantity: int


class BacktestEngine:

    def __init__(
        self,
        candles: pd.DataFrame,
        configuration: dict,
        initial_capital: float,
    ):

        self.df = candles.copy()

        self.configuration = configuration

        self.initial_capital = float(
            initial_capital
        )

        self.capital = float(
            initial_capital
        )

        self.position: Optional[Position] = None

        self.trades = []

        self.equity_curve = []

    # --------------------------------------------------
    # INDICATORS
    # --------------------------------------------------

    def prepare_indicators(self):

        entry_rules = (
            self.configuration.get(
                "entry",
                []
            )
        )

        exit_rules = (
            self.configuration.get(
                "exit",
                []
            )
        )

        all_rules = (
            entry_rules +
            exit_rules
        )

        for rule in all_rules:

            indicator = rule.get(
                "indicator"
            )

            period = rule.get(
                "period"
            )

            if indicator == "RSI":

                column = (
                    f"rsi_{period}"
                )

                if column not in self.df:

                    self.df[column] = (
                        calculate_rsi(
                            self.df["close"],
                            period,
                        )
                    )

            elif indicator == "EMA":

                column = (
                    f"ema_{period}"
                )

                if column not in self.df:

                    self.df[column] = (
                        calculate_ema(
                            self.df["close"],
                            period,
                        )
                    )

    # --------------------------------------------------
    # POSITION SIZE
    # --------------------------------------------------

    def calculate_quantity(
        self,
        price,
    ):

        if price <= 0:
            return 0

        quantity = int(
            self.capital / price
        )

        return max(
            quantity,
            0,
        )

    # --------------------------------------------------
    # OPEN POSITION
    # --------------------------------------------------

    def open_position(
        self,
        timestamp,
        price,
    ):

        quantity = (
            self.calculate_quantity(
                price
            )
        )

        if quantity <= 0:
            return

        self.position = Position(
            side="BUY",
            entry_time=timestamp,
            entry_price=float(price),
            quantity=quantity,
        )

    # --------------------------------------------------
    # CLOSE POSITION
    # --------------------------------------------------

    def close_position(
        self,
        timestamp,
        price,
        reason,
    ):

        if not self.position:
            return

        position = self.position

        pnl = (
            float(price)
            - position.entry_price
        ) * position.quantity

        self.capital += pnl

        self.trades.append(
            {
                "symbol": self.configuration.get(
                    "symbol",
                    ""
                ),
                "side": position.side,
                "entry_time": position.entry_time,
                "entry_price": position.entry_price,
                "exit_time": timestamp,
                "exit_price": float(price),
                "quantity": position.quantity,
                "pnl": pnl,
                "exit_reason": reason,
            }
        )

        self.position = None

    # --------------------------------------------------
    # RISK MANAGEMENT
    # --------------------------------------------------

    def check_risk(
        self,
        timestamp,
        price,
    ):

        if not self.position:
            return False

        risk = (
            self.configuration.get(
                "risk",
                {}
            )
        )

        stop_loss = risk.get(
            "stop_loss_percent"
        )

        target = risk.get(
            "target_percent"
        )

        entry = (
            self.position.entry_price
        )

        if stop_loss:

            stop_price = (
                entry
                * (
                    1
                    - float(stop_loss)
                    / 100
                )
            )

            if price <= stop_price:

                self.close_position(
                    timestamp,
                    price,
                    "STOP_LOSS",
                )

                return True

        if target:

            target_price = (
                entry
                * (
                    1
                    + float(target)
                    / 100
                )
            )

            if price >= target_price:

                self.close_position(
                    timestamp,
                    price,
                    "TARGET",
                )

                return True

        return False

    # --------------------------------------------------
    # MAIN ENGINE
    # --------------------------------------------------

    def run(self):

        self.prepare_indicators()

        entry_rules = (
            self.configuration.get(
                "entry",
                []
            )
        )

        exit_rules = (
            self.configuration.get(
                "exit",
                []
            )
        )

        for _, row in self.df.iterrows():

            timestamp = row["timestamp"]

            price = float(
                row["close"]
            )

            # -------------------------
            # Risk management
            # -------------------------

            if self.position:

                closed = self.check_risk(
                    timestamp,
                    price,
                )

                if closed:
                    self.equity_curve.append(
                        self.capital
                    )
                    continue

            # -------------------------
            # Entry
            # -------------------------

            if not self.position:

                if evaluate_conditions(
                    row,
                    entry_rules,
                ):

                    self.open_position(
                        timestamp,
                        price,
                    )

            # -------------------------
            # Exit
            # -------------------------

            elif self.position:

                if evaluate_conditions(
                    row,
                    exit_rules,
                ):

                    self.close_position(
                        timestamp,
                        price,
                        "SIGNAL",
                    )

            # -------------------------
            # Equity
            # -------------------------

            current_equity = (
                self.capital
            )

            if self.position:

                unrealized = (
                    price
                    - self.position.entry_price
                ) * self.position.quantity

                current_equity += unrealized

            self.equity_curve.append(
                current_equity
            )

        # Close remaining position

        if self.position:

            last = self.df.iloc[-1]

            self.close_position(
                last["timestamp"],
                float(last["close"]),
                "END_OF_BACKTEST",
            )

        return self.get_results()

    # --------------------------------------------------
    # ANALYTICS
    # --------------------------------------------------

    def get_results(self):

        total_pnl = (
            self.capital
            - self.initial_capital
        )

        total_trades = len(
            self.trades
        )

        winning_trades = len(
            [
                trade
                for trade in self.trades
                if trade["pnl"] > 0
            ]
        )

        win_rate = (
            (
                winning_trades
                / total_trades
            )
            * 100
            if total_trades
            else 0
        )

        return_percent = (
            total_pnl
            / self.initial_capital
        ) * 100

        max_drawdown = (
            self.calculate_max_drawdown()
        )

        return {
            "initial_capital": self.initial_capital,
            "final_capital": self.capital,
            "total_pnl": total_pnl,
            "return_percent": return_percent,
            "win_rate": win_rate,
            "max_drawdown": max_drawdown,
            "total_trades": total_trades,
            "trades": self.trades,
            "equity_curve": self.equity_curve,
        }

    def calculate_max_drawdown(self):

        if not self.equity_curve:
            return 0

        series = pd.Series(
            self.equity_curve
        )

        peak = series.cummax()

        drawdown = (
            (
                series - peak
            )
            / peak
        ) * 100

        return abs(
            drawdown.min()
        )