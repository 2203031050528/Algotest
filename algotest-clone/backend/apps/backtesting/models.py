from django.conf import settings
from django.db import models


class Backtest(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("RUNNING", "Running"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="backtests",
    )

    strategy = models.ForeignKey(
        "strategies.Strategy",
        on_delete=models.CASCADE,
        related_name="backtests",
    )

    start_date = models.DateField()
    end_date = models.DateField()

    initial_capital = models.DecimalField(
        max_digits=15,
        decimal_places=2,
    )

    final_capital = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )

    total_pnl = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )

    return_percent = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    win_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    max_drawdown = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    total_trades = models.PositiveIntegerField(
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    error_message = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Backtest #{self.id}"


class BacktestTrade(models.Model):

    SIDE_CHOICES = [
        ("BUY", "Buy"),
        ("SELL", "Sell"),
    ]

    backtest = models.ForeignKey(
        Backtest,
        on_delete=models.CASCADE,
        related_name="trades",
    )

    symbol = models.CharField(
        max_length=100,
    )

    side = models.CharField(
        max_length=10,
        choices=SIDE_CHOICES,
    )

    entry_time = models.DateTimeField()
    entry_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    exit_time = models.DateTimeField(
        null=True,
        blank=True,
    )

    exit_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        null=True,
        blank=True,
    )

    quantity = models.PositiveIntegerField()

    pnl = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
    )

    exit_reason = models.CharField(
        max_length=50,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["entry_time"]

    def __str__(self):
        return f"{self.symbol} {self.side} {self.pnl}"