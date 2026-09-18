import os
import requests


class DhanClient:

    BASE_URL = "https://api.dhan.co"

    def __init__(self):

        self.client_id = os.getenv(
            "DHAN_CLIENT_ID"
        )

        self.access_token = os.getenv(
            "DHAN_ACCESS_TOKEN"
        )

    @property
    def headers(self):

        return {
            "access-token": self.access_token,
            "Content-Type": "application/json",
        }

    def historical_data(
        self,
        payload: dict,
    ):

        url = (
            f"{self.BASE_URL}"
            "/v2/charts/intraday"
        )

        response = requests.post(
            url,
            headers=self.headers,
            json=payload,
            timeout=30,
        )

        response.raise_for_status()

        return response.json()