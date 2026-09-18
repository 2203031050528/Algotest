from celery import shared_task


@shared_task
def run_backtest_task(
    backtest_id,
):

    from .models import Backtest

    backtest = Backtest.objects.get(
        id=backtest_id
    )

    backtest.status = "RUNNING"
    backtest.save()

    try:

        # 1. Load market data
        # 2. Create DataFrame
        # 3. Create BacktestEngine
        # 4. Run engine
        # 5. Calculate metrics
        # 6. Save trades

        backtest.status = "COMPLETED"
        backtest.save()

    except Exception as exc:

        backtest.status = "FAILED"
        backtest.error_message = str(exc)
        backtest.save()

        raise