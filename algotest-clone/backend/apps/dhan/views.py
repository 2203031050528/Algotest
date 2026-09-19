import logging
import requests
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .client import DhanClient

logger = logging.getLogger(__name__)


class DhanStatusView(APIView):
    """
    Check Dhan broker connection status, token validity, and account summary.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client = DhanClient()
        result = client.check_connection()
        return Response(result)


class DhanProfileView(APIView):
    """
    Retrieve user profile from Dhan.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client = DhanClient()
        try:
            profile = client.get_profile()
            return Response(profile)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 500,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DhanFundsView(APIView):
    """
    Retrieve funds and margin limits from Dhan.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client = DhanClient()
        try:
            funds = client.get_fund_limits()
            return Response(funds)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 500,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DhanPositionsView(APIView):
    """
    Retrieve active positions from Dhan.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client = DhanClient()
        try:
            positions = client.get_positions()
            return Response(positions)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 500,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DhanOrdersView(APIView):
    """
    Retrieve and place orders with Dhan.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client = DhanClient()
        try:
            orders = client.get_orders()
            return Response(orders)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 500,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        client = DhanClient()
        try:
            order_res = client.place_order(request.data)
            return Response(order_res, status=status.HTTP_201_CREATED)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 400,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DhanMarginView(APIView):
    """
    Calculate margin requirement for an order via Dhan margincalculator.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        client = DhanClient()
        try:
            margin = client.calculate_margin(request.data)
            return Response(margin)
        except requests.HTTPError as err:
            return Response(
                {"error": str(err), "details": err.response.text if err.response else ""},
                status=err.response.status_code if err.response else 400,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DhanHistoricalView(APIView):
    """
    Fetch historical or intraday candles from Dhan API.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        client = DhanClient()
        payload = request.data
        try:
            if payload.get("daily", False):
                candles = client.daily_charts(payload)
            else:
                candles = client.historical_data(payload)
            return Response(candles)
        except requests.HTTPError as err:
            err_data = err.response.json() if err.response and err.response.content else {}
            msg = err_data.get("errorMessage") or str(err)
            return Response(
                {
                    "error": msg,
                    "errorCode": err_data.get("errorCode", "DHAN_ERROR"),
                    "details": err_data,
                },
                status=err.response.status_code if err.response else 400,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
