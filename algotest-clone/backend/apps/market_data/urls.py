from django.urls import path

from .views import (
    CandleListView,
    HistoricalDataView,
    MarketDataProvidersView,
    SyncCandlesView,
)

urlpatterns = [
    # Fetch historical candles via provider (DB-first + Dhan API gap-fill)
    path("historical/", HistoricalDataView.as_view(), name="market_data_historical"),

    # Force-sync candles from Dhan into local DB
    path("sync/", SyncCandlesView.as_view(), name="market_data_sync"),

    # Direct read from cached Candle table (no external API calls)
    path("candles/", CandleListView.as_view(), name="market_data_candles"),

    # Provider health/status
    path("providers/", MarketDataProvidersView.as_view(), name="market_data_providers"),
]
