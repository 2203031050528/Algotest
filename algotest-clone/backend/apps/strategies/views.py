from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Strategy
from .serializers import StrategySerializer


class StrategyViewSet(viewsets.ModelViewSet):

    serializer_class = StrategySerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):
        return Strategy.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )