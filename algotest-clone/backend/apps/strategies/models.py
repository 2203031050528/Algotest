from django.conf import settings
from django.db import models


class Strategy(models.Model):

    TIMEFRAME_CHOICES = [
        ("1m", "1 Minute"),
        ("5m", "5 Minutes"),
        ("15m", "15 Minutes"),
        ("1h", "1 Hour"),
    ]

    name = models.CharField(max_length=150)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="strategies",
    )

    symbol = models.CharField(max_length=100)

    timeframe = models.CharField(
        max_length=10,
        choices=TIMEFRAME_CHOICES,
    )

    capital = models.DecimalField(
        max_digits=15,
        decimal_places=2,
    )

    configuration = models.JSONField(default=dict)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name