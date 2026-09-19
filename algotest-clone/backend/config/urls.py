from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [

    path(
        "admin/",
        admin.site.urls,
    ),

    # Authentication (register, login, refresh, me)
    path(
        "api/auth/",
        include(
            "apps.users.urls"
        ),
    ),

    # Strategies
    path(
        "api/strategies/",
        include(
            "apps.strategies.urls"
        ),
    ),

    # Backtests
    path(
        "api/backtests/",
        include(
            "apps.backtesting.urls"
        ),
    ),

    # Dhan Broker APIs
    path(
        "api/dhan/",
        include(
            "apps.dhan.urls"
        ),
    ),

    # Instruments
    path(
        "api/instruments/",
        include(
            "apps.instruments.urls"
        ),
    ),

    # Market Data (historical candles, sync, provider status)
    path(
        "api/market-data/",
        include(
            "apps.market_data.urls"
        ),
    ),
]