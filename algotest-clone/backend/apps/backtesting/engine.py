import pandas as pd

from .indicators import calculate_rsi


class BacktestEngine:

    def __init__(
        self,
        data: pd.DataFrame,
        configuration: dict,
        capital: float,
    ):
        self.data = data.copy()
        self.configuration = configuration
        self.initial_capital = capital

        self.capital = capital
        self.position = None
        self.trades = []

    def prepare_indicators(self):

        entry = self.configuration["entry"][0]

        if entry["indicator"] == "RSI":

            period = entry.get(
                "period",
                14,
            )

            self.data["rsi"] = calculate_rsi(
                self.data["close"],
                period,
            )

    def run(self):

        self.prepare_indicators()

        entry_condition = (
            self.configuration["entry"][0]
        )

        exit_condition = (
            self.configuration["exit"][0]
        )

        risk = self.configuration.get(
            "risk",
            {}
        )

        stop_loss = risk.get(
            "stop_loss_percent",
            2,
        )

        target = risk.get(
            "target_percent",
            4,
        )

        for _, candle in self.data.iterrows():

            price = float(candle["close"])

            if self.position is None:

                if self.check_condition(
                    candle,
                    entry_condition,
                ):
                    self.open_position(
                        candle
                    )

            else:

                entry_price = self.position[
                    "entry_price"
                ]

                pnl_percent = (
                    (price - entry_price)
                    / entry_price
                    * 100
                )

                if pnl_percent <= -stop_loss:

                    self.close_position(
                        candle,
                        "STOP_LOSS",
                    )

                elif pnl_percent >= target:

                    self.close_position(
                        candle,
                        "TARGET",
                    )

                elif self.check_condition(
                    candle,
                    exit_condition,
                ):

                    self.close_position(
                        candle,
                        "SIGNAL",
                    )

        return self.trades

    def check_condition(
        self,
        candle,
        condition,
    ):

        indicator = condition["indicator"]

        value = candle[
            indicator.lower()
        ]

        operator = condition["operator"]

        target = condition["value"]

        if pd.isna(value):
            return False

        if operator == "<":
            return value < target

        if operator == ">":
            return value > target

        if operator == "<=":
            return value <= target

        if operator == ">=":
            return value >= target

        if operator == "==":
            return value == target

        return False

    def open_position(
        self,
        candle,
    ):

        self.position = {
            "entry_time": candle["timestamp"],
            "entry_price": float(
                candle["close"]
            ),
            "quantity": 1,
        }

    def close_position(
        self,
        candle,
        reason,
    ):

        entry = self.position

        exit_price = float(
            candle["close"]
        )

        pnl = (
            exit_price
            - entry["entry_price"]
        ) * entry["quantity"]

        self.trades.append({
            "entry_time": entry["entry_time"],
            "entry_price": entry["entry_price"],
            "exit_time": candle["timestamp"],
            "exit_price": exit_price,
            "quantity": entry["quantity"],
            "pnl": pnl,
            "exit_reason": reason,
        })

        self.position = None