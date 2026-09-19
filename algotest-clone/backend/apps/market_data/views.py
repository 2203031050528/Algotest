"""
Market Data API Views.

Endpoints:
  GET  /api/market-data/historical/  — Fetch candles (DB-first via provider)
  POST /api/market-data/sync/        — Force-sync candles from Dhan into DB
  GET  /api/market-data/providers/   — List available providers and their status
"""

import logging

from django.db import models
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dhan.exceptions import DhanBaseException
from apps.dhan.services.historical_data import DhanHistoricalService

from .models import Candle
from .providers.csv_provider import CSVProvider
from .providers.dhan_provider import DhanProvider
from .serializers import (
    CandleSerializer,
    HistoricalDataRequestSerializer,
    SyncCandlesRequestSerializer,
)

logger = logging.getLogger(__name__)


def _get_provider(provider_name: str):
    """Factory: instantiate the correct provider from a name string."""
    if provider_name == "csv":
        return CSVProvider()
    return DhanProvider()  # default


class HistoricalDataView(APIView):
    """
    GET /api/market-data/historical/

    Query Parameters:
        security_id      (str, required)
        exchange_segment (str, default: NSE_EQ)
        symbol           (str, required)
        timeframe        (str, required) — 1m|5m|15m|25m|1h|1d
        start_date       (YYYY-MM-DD, required)
        end_date         (YYYY-MM-DD, required)
        instrument_type  (str, default: EQUITY)
        provider         (str, default: dhan) — dhan|csv
        page             (int, default: 1)
        page_size        (int, default: 500, max: 5000)

    Returns paginated candle list ordered by timestamp ascending.
    """

    permission_classes = [AllowAny]

    MAX_PAGE_SIZE = 5000
    DEFAULT_PAGE_SIZE = 500

    def get(self, request):
        serializer = HistoricalDataRequestSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        provider_name = data.pop("provider", "dhan")

        page = int(request.query_params.get("page", 1))
        page_size = min(
            int(request.query_params.get("page_size", self.DEFAULT_PAGE_SIZE)),
            self.MAX_PAGE_SIZE,
        )

        try:
            provider = _get_provider(provider_name)
            candles = provider.get_historical_data(**data)
        except DhanBaseException as exc:
            logger.warning(
                "[HistoricalDataView] Dhan error for %s: %s",
                data.get("symbol"),
                str(exc),
            )
            return Response(
                {
                    "error": str(exc),
                    "code": getattr(exc, "code", "DHAN_ERROR"),
                    "provider": provider_name,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("[HistoricalDataView] Unexpected error: %s", str(exc))
            return Response(
                {"error": f"Error fetching market data: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Manual pagination
        total = len(candles)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_candles = candles[start_idx:end_idx]

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, -(-total // page_size)),  # ceiling division
            "provider": provider_name,
            "results": page_candles,
        })


class SyncCandlesView(APIView):
    """
    POST /api/market-data/sync/

    Force-synchronize candles for a specific instrument from the Dhan API
    into the local PostgreSQL Candle table.

    Request body (JSON):
        {
            "security_id": "1333",
            "exchange_segment": "NSE_EQ",
            "symbol": "HDFCBANK",
            "timeframe": "1d",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "instrument_type": "EQUITY"
        }

    Returns count of candles persisted.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SyncCandlesRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            service = DhanHistoricalService()
            count = service.sync_and_store_candles(
                security_id=data["security_id"],
                exchange_segment=data["exchange_segment"],
                symbol=data["symbol"],
                timeframe=data["timeframe"],
                start_date=data["start_date"],
                end_date=data["end_date"],
                instrument_type=data.get("instrument_type", "EQUITY"),
            )
        except DhanBaseException as exc:
            logger.warning("[SyncCandlesView] Dhan sync error: %s", str(exc))
            return Response(
                {"error": str(exc), "code": getattr(exc, "code", "DHAN_ERROR")},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("[SyncCandlesView] Unexpected error: %s", str(exc))
            return Response(
                {"error": "Internal server error during candle sync."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "synced": count,
                "security_id": data["security_id"],
                "symbol": data["symbol"],
                "timeframe": data["timeframe"],
                "start_date": str(data["start_date"]),
                "end_date": str(data["end_date"]),
            },
            status=status.HTTP_200_OK,
        )


class MarketDataProvidersView(APIView):
    """
    GET /api/market-data/providers/

    Returns status of all registered market data providers.
    Useful for health checks and admin dashboards.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        providers = [
            DhanProvider(),
            CSVProvider(),
        ]
        return Response(
            [p.describe() for p in providers],
            status=status.HTTP_200_OK,
        )


class CandleListView(APIView):
    """
    GET /api/market-data/candles/

    Query directly from the Candle table (no external API calls).
    Useful for verifying cached data without triggering Dhan API calls.

    Query Parameters:
        security_id (optional)
        symbol      (optional)
        timeframe   (optional)
        start_date  (YYYY-MM-DD, optional)
        end_date    (YYYY-MM-DD, optional)
        limit       (int, default: 200, max: 2000)
    """

    permission_classes = [AllowAny]

    MAX_LIMIT = 2000

    def get(self, request):
        security_id = request.query_params.get("security_id")
        symbol = request.query_params.get("symbol")
        timeframe = request.query_params.get("timeframe")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        limit = min(int(request.query_params.get("limit", 200)), self.MAX_LIMIT)

        qs = Candle.objects.all().order_by("-timestamp")

        if security_id and symbol:
            qs = qs.filter(
                models.Q(security_id=security_id) | models.Q(symbol__iexact=symbol)
            )
        elif security_id:
            qs = qs.filter(
                models.Q(security_id=security_id) | models.Q(symbol__iexact=security_id)
            )
        elif symbol:
            qs = qs.filter(symbol__iexact=symbol)

        if timeframe:
            qs = qs.filter(timeframe=timeframe)
        if start_date:
            qs = qs.filter(timestamp__date__gte=start_date)
        if end_date:
            qs = qs.filter(timestamp__date__lte=end_date)

        total_matching = qs.count()
        results = qs[:limit]
        serializer = CandleSerializer(results, many=True)
        return Response({
            "total_count": Candle.objects.count(),
            "count": total_matching,
            "limit": limit,
            "results": serializer.data,
        })
