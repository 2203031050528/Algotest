"""
Market Data Provider abstraction package.

Providers decouple the backtesting engine and API views from any specific
data source. All providers must conform to the MarketDataProvider ABC.
"""

from .base import MarketDataProvider  # noqa: F401

__all__ = ["MarketDataProvider"]
