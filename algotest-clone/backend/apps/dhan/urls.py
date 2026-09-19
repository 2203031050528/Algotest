from django.urls import path
from .views import (
    DhanFundsView,
    DhanHistoricalView,
    DhanMarginView,
    DhanOrdersView,
    DhanPositionsView,
    DhanProfileView,
    DhanStatusView,
)

urlpatterns = [
    path("status/", DhanStatusView.as_view(), name="dhan_status"),
    path("profile/", DhanProfileView.as_view(), name="dhan_profile"),
    path("funds/", DhanFundsView.as_view(), name="dhan_funds"),
    path("positions/", DhanPositionsView.as_view(), name="dhan_positions"),
    path("orders/", DhanOrdersView.as_view(), name="dhan_orders"),
    path("margin/", DhanMarginView.as_view(), name="dhan_margin"),
    path("historical/", DhanHistoricalView.as_view(), name="dhan_historical"),
]
