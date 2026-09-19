from django.db import models


class Instrument(models.Model):
    """
    Provider-independent internal master instrument model.
    Stores metadata for equities, indices, futures, and options.
    """

    EXCHANGE_SEGMENT_CHOICES = [
        ("NSE_EQ", "NSE Equity"),
        ("NSE_FNO", "NSE Futures & Options"),
        ("IDX_I", "Index"),
        ("BSE_EQ", "BSE Equity"),
        ("MCX_COMM", "MCX Commodity"),
    ]

    INSTRUMENT_TYPE_CHOICES = [
        ("EQUITY", "Equity Stock"),
        ("INDEX", "Index"),
        ("FUTIDX", "Index Future"),
        ("OPTIDX", "Index Option"),
        ("FUTSTK", "Stock Future"),
        ("OPTSTK", "Stock Option"),
    ]

    OPTION_TYPE_CHOICES = [
        ("CE", "Call Option"),
        ("PE", "Put Option"),
    ]

    exchange_segment = models.CharField(max_length=30, db_index=True)
    security_id = models.CharField(max_length=50, db_index=True)
    trading_symbol = models.CharField(max_length=100, db_index=True)
    symbol = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=200, blank=True, default="")

    instrument_type = models.CharField(
        max_length=30,
        choices=INSTRUMENT_TYPE_CHOICES,
        default="EQUITY",
        db_index=True,
    )

    expiry = models.DateField(null=True, blank=True, db_index=True)
    strike = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    option_type = models.CharField(
        max_length=10,
        choices=OPTION_TYPE_CHOICES,
        null=True,
        blank=True,
    )

    lot_size = models.IntegerField(default=1)
    tick_size = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0.05,
    )

    source = models.CharField(max_length=30, default="DHAN")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["symbol", "trading_symbol"]
        constraints = [
            models.UniqueConstraint(
                fields=["exchange_segment", "security_id"],
                name="unique_exchange_security_id",
            )
        ]
        indexes = [
            models.Index(fields=["symbol", "exchange_segment"]),
            models.Index(fields=["instrument_type", "is_active"]),
            models.Index(fields=["trading_symbol"]),
        ]

    def __str__(self):
        return f"{self.trading_symbol} ({self.exchange_segment}:{self.security_id})"
