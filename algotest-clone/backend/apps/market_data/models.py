from django.db import models


class Candle(models.Model):

    security_id = models.CharField(max_length=50)

    exchange_segment = models.CharField(
        max_length=30
    )

    symbol = models.CharField(
        max_length=100
    )

    timeframe = models.CharField(
        max_length=10
    )

    timestamp = models.DateTimeField()

    open = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    high = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    low = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    close = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    volume = models.BigIntegerField(
        null=True,
        blank=True,
    )

    open_interest = models.BigIntegerField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "security_id",
                    "timeframe",
                    "timestamp",
                ],
                name="unique_market_candle",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "symbol",
                    "timeframe",
                    "timestamp",
                ]
            )
        ]