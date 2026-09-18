import pandas as pd


def calculate_rsi(
    close: pd.Series,
    period: int = 14,
) -> pd.Series:

    delta = close.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(
        period
    ).mean()

    avg_loss = loss.rolling(
        period
    ).mean()

    rs = avg_gain / avg_loss.replace(
        0,
        pd.NA,
    )

    rsi = 100 - (
        100 / (1 + rs)
    )

    return rsi


def calculate_ema(
    close: pd.Series,
    period: int,
) -> pd.Series:

    return close.ewm(
        span=period,
        adjust=False,
    ).mean()