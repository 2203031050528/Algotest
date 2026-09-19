from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dhan.services.instruments import DhanInstrumentService
from .models import Instrument
from .serializers import InstrumentSerializer


class InstrumentListView(generics.ListAPIView):
    """
    List instruments from the database with filtering support.
    Supports query parameters:
    - segment: filter by exchange_segment (e.g. NSE_EQ, IDX_I)
    - type: filter by instrument_type (e.g. EQUITY, INDEX, FUTIDX)
    - q: optional search keyword
    """
    serializer_class = InstrumentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Auto-seed if database is completely empty
        if not Instrument.objects.exists():
            service = DhanInstrumentService()
            service.seed_popular_instruments()

        queryset = Instrument.objects.filter(is_active=True)

        segment = self.request.query_params.get("segment")
        if segment:
            queryset = queryset.filter(exchange_segment__iexact=segment)

        inst_type = self.request.query_params.get("type")
        if inst_type:
            queryset = queryset.filter(instrument_type__iexact=inst_type)

        q = self.request.query_params.get("q")
        if q:
            q = q.strip()
            queryset = queryset.filter(
                Q(trading_symbol__icontains=q)
                | Q(symbol__icontains=q)
                | Q(name__icontains=q)
                | Q(security_id=q)
            )

        return queryset[:100]


class InstrumentSearchView(APIView):
    """
    Fast prefix and substring search across master instruments.
    GET /api/instruments/search/?q=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Auto-seed if database is empty
        if not Instrument.objects.exists():
            service = DhanInstrumentService()
            service.seed_popular_instruments()

        query = request.query_params.get("q", "").strip()
        if not query:
            instruments = Instrument.objects.filter(is_active=True)[:25]
        else:
            instruments = Instrument.objects.filter(
                Q(trading_symbol__istartswith=query)
                | Q(symbol__istartswith=query)
                | Q(trading_symbol__icontains=query)
                | Q(symbol__icontains=query)
                | Q(security_id=query)
                | Q(name__icontains=query),
                is_active=True,
            )[:50]

        serializer = InstrumentSerializer(instruments, many=True)
        return Response(serializer.data)
