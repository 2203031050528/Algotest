from rest_framework.routers import DefaultRouter

from .views import StrategyViewSet


router = DefaultRouter()

router.register(
    "",
    StrategyViewSet,
    basename="strategy",
)

urlpatterns = router.urls