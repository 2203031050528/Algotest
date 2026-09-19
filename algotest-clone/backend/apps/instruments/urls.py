from django.urls import path
from .views import InstrumentListView, InstrumentSearchView

urlpatterns = [
    path("", InstrumentListView.as_view(), name="instruments_list"),
    path("search/", InstrumentSearchView.as_view(), name="instruments_search"),
]
