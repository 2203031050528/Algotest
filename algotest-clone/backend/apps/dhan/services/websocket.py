"""
DhanWebSocketClient — WebSocket connection lifecycle manager for DhanHQ live-feed API.

This module establishes and maintains a persistent WebSocket connection to
wss://api-feed.dhan.co, managing subscription, heartbeat, reconnection, and
structured logging — all without leaking credentials.

NOTE: Live market-data streaming is a foundation; actual order-execution is out of scope.
"""

import json
import logging
import os
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# Dhan feed WebSocket endpoint
DHAN_WS_URL = "wss://api-feed.dhan.co"

# Subscription exchange codes for Dhan live feed
EXCHANGE_CODES: Dict[str, int] = {
    "NSE_EQ": 1,
    "NSE_FNO": 2,
    "NSE_CURRENCY": 3,
    "BSE_EQ": 4,
    "BSE_FNO": 5,
    "BSE_CURRENCY": 6,
    "MCX_COMM": 7,
    "IDX_I": 0,
}

# Packet feed request types
REQUEST_TYPE_FULL = 21   # Full market data (OHLC + volume + LTP + depth)
REQUEST_TYPE_QUOTE = 22  # Quote packet (LTP + volume)
REQUEST_TYPE_TICK = 23   # Tick-only (LTP)

# Reconnection config
MIN_RECONNECT_DELAY = 1.0    # seconds
MAX_RECONNECT_DELAY = 60.0   # seconds
MAX_RECONNECT_ATTEMPTS = 10
HEARTBEAT_INTERVAL = 15.0    # seconds


class DhanWebSocketClient:
    """
    Manages a persistent WebSocket connection to the DhanHQ live feed.

    Usage:
        client = DhanWebSocketClient(
            client_id="your-client-id",
            access_token="your-access-token",
            on_message=handle_message,
            on_error=handle_error,
        )
        client.subscribe("NSE_EQ", [1333])   # subscribe HDFC Bank
        client.connect()
        # ... later:
        client.disconnect()
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        access_token: Optional[str] = None,
        on_message: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
        on_connect: Optional[Callable[[], None]] = None,
        on_disconnect: Optional[Callable[[], None]] = None,
        ws_url: str = DHAN_WS_URL,
        request_type: int = REQUEST_TYPE_FULL,
    ):
        self.client_id = (
            client_id
            or os.getenv("DHAN_CLIENT_ID", "")
        )
        self._access_token = (
            access_token
            or os.getenv("DHAN_ACCESS_TOKEN", "")
        )

        self.ws_url = ws_url
        self.request_type = request_type

        # Callbacks
        self.on_message = on_message or self._default_on_message
        self.on_error = on_error or self._default_on_error
        self.on_connect = on_connect
        self.on_disconnect = on_disconnect

        # State
        self._ws = None
        self._connected = False
        self._should_reconnect = True
        self._reconnect_attempts = 0
        self._reconnect_delay = MIN_RECONNECT_DELAY

        # Subscription registry — persists across reconnects
        self._subscriptions: Dict[str, Set[int]] = {}  # exchange_segment -> set of security_ids
        self._lock = threading.Lock()

        # Heartbeat thread
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._heartbeat_stop = threading.Event()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def subscribe(self, exchange_segment: str, security_ids: List[int]) -> None:
        """
        Register instruments for live data subscription.
        If already connected, immediately sends subscription packet.
        Subscriptions are automatically restored on reconnect.
        """
        with self._lock:
            if exchange_segment not in self._subscriptions:
                self._subscriptions[exchange_segment] = set()
            self._subscriptions[exchange_segment].update(security_ids)

        logger.info(
            "Registered subscription: exchange=%s securities=%s",
            exchange_segment,
            security_ids,
        )

        if self._connected and self._ws:
            self._send_subscription(exchange_segment, list(security_ids))

    def unsubscribe(self, exchange_segment: str, security_ids: List[int]) -> None:
        """Remove instruments from subscription registry and send unsubscription packet."""
        with self._lock:
            if exchange_segment in self._subscriptions:
                self._subscriptions[exchange_segment].difference_update(security_ids)

        if self._connected and self._ws:
            self._send_unsubscription(exchange_segment, security_ids)

    def connect(self, blocking: bool = False) -> None:
        """
        Establish WebSocket connection to Dhan feed.
        If blocking=False (default), runs the connection loop in a background thread.
        """
        if not self.client_id or not self._access_token:
            raise ValueError(
                "DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN must be set to connect WebSocket."
            )

        self._should_reconnect = True
        self._reconnect_attempts = 0
        self._reconnect_delay = MIN_RECONNECT_DELAY

        if blocking:
            self._run_connection_loop()
        else:
            conn_thread = threading.Thread(
                target=self._run_connection_loop,
                name="DhanWSConnection",
                daemon=True,
            )
            conn_thread.start()
            logger.info("DhanWebSocketClient started in background thread")

    def disconnect(self) -> None:
        """Gracefully close the WebSocket and stop reconnection attempts."""
        self._should_reconnect = False
        self._heartbeat_stop.set()
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass
        self._connected = False
        logger.info("DhanWebSocketClient disconnected cleanly")

    @property
    def is_connected(self) -> bool:
        return self._connected

    # ------------------------------------------------------------------
    # Internal connection lifecycle
    # ------------------------------------------------------------------

    def _run_connection_loop(self) -> None:
        """Main reconnection loop with exponential backoff."""
        while self._should_reconnect:
            try:
                self._connect_once()
                # If we land here, connection dropped normally
                self._reconnect_delay = MIN_RECONNECT_DELAY
                self._reconnect_attempts = 0

            except Exception as exc:
                sanitized = self._sanitize(str(exc))
                logger.warning(
                    "DhanWS connection error (attempt %d/%d): %s",
                    self._reconnect_attempts + 1,
                    MAX_RECONNECT_ATTEMPTS,
                    sanitized,
                )
                if self.on_error:
                    self.on_error(exc)

            if not self._should_reconnect:
                break

            self._reconnect_attempts += 1
            if self._reconnect_attempts > MAX_RECONNECT_ATTEMPTS:
                logger.error(
                    "DhanWS exceeded maximum reconnection attempts (%d). Giving up.",
                    MAX_RECONNECT_ATTEMPTS,
                )
                break

            logger.info(
                "DhanWS reconnecting in %.1fs (attempt %d/%d)...",
                self._reconnect_delay,
                self._reconnect_attempts,
                MAX_RECONNECT_ATTEMPTS,
            )
            time.sleep(self._reconnect_delay)
            # Exponential backoff with ceiling
            self._reconnect_delay = min(self._reconnect_delay * 2, MAX_RECONNECT_DELAY)

    def _connect_once(self) -> None:
        """
        Attempt a single WebSocket connection. Blocks until the connection closes.
        Uses websocket-client library (websocket.WebSocketApp).
        """
        try:
            import websocket  # noqa: PLC0415
        except ImportError as exc:
            raise ImportError(
                "websocket-client is required for DhanWebSocketClient. "
                "Install it via: pip install websocket-client"
            ) from exc

        logger.info(
            "DhanWS connecting to %s as client_id=%s",
            self.ws_url,
            self.client_id,
        )

        ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self._on_ws_open,
            on_message=self._on_ws_message,
            on_error=self._on_ws_error,
            on_close=self._on_ws_close,
        )
        self._ws = ws
        ws.run_forever(ping_interval=0)  # We handle heartbeats ourselves

    def _on_ws_open(self, ws) -> None:
        """Called when WebSocket connection is established. Authenticates and restores subs."""
        logger.info("DhanWS connection opened. Authenticating...")
        self._connected = True
        self._reconnect_delay = MIN_RECONNECT_DELAY

        # Send authentication packet
        auth_packet = {
            "LoginReq": {
                "MsgCode": 42,
                "ClientId": self.client_id,
                "Token": self._access_token,
            }
        }
        self._send_json(auth_packet)
        logger.info("DhanWS authentication packet sent (token redacted)")

        # Restore all subscriptions
        with self._lock:
            for exchange_segment, ids in self._subscriptions.items():
                if ids:
                    self._send_subscription(exchange_segment, list(ids))

        # Start heartbeat loop
        self._heartbeat_stop.clear()
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            name="DhanWSHeartbeat",
            daemon=True,
        )
        self._heartbeat_thread.start()

        if self.on_connect:
            self.on_connect()

    def _on_ws_message(self, ws, message) -> None:
        """Parse and forward incoming messages."""
        try:
            if isinstance(message, bytes):
                data = self._parse_binary_packet(message)
            else:
                data = json.loads(message)

            if self.on_message:
                self.on_message(data)

        except Exception as exc:
            logger.debug("DhanWS failed to parse message: %s", self._sanitize(str(exc)))

    def _on_ws_error(self, ws, error) -> None:
        sanitized_error = self._sanitize(str(error))
        logger.warning("DhanWS error: %s", sanitized_error)
        self._connected = False
        self._heartbeat_stop.set()
        if self.on_error:
            self.on_error(error)

    def _on_ws_close(self, ws, close_status_code, close_msg) -> None:
        self._connected = False
        self._heartbeat_stop.set()
        logger.info(
            "DhanWS connection closed: code=%s msg=%s",
            close_status_code,
            self._sanitize(str(close_msg or "")),
        )
        if self.on_disconnect:
            self.on_disconnect()

    # ------------------------------------------------------------------
    # Heartbeat
    # ------------------------------------------------------------------

    def _heartbeat_loop(self) -> None:
        """Send periodic ping to keep connection alive."""
        while not self._heartbeat_stop.wait(HEARTBEAT_INTERVAL):
            if self._connected and self._ws:
                try:
                    self._ws.send("ping")
                    logger.debug("DhanWS heartbeat ping sent")
                except Exception as exc:
                    logger.warning("DhanWS heartbeat failed: %s", self._sanitize(str(exc)))
                    self._heartbeat_stop.set()
                    break

    # ------------------------------------------------------------------
    # Subscription packets
    # ------------------------------------------------------------------

    def _send_subscription(self, exchange_segment: str, security_ids: List[int]) -> None:
        """Send a subscription request for a list of security IDs on given segment."""
        exchange_code = EXCHANGE_CODES.get(exchange_segment, 1)
        packet = {
            "RequestCode": self.request_type,
            "InstrumentCount": len(security_ids),
            "InstrumentList": [
                {
                    "ExchangeSegment": exchange_code,
                    "SecurityId": str(sid),
                }
                for sid in security_ids
            ],
        }
        self._send_json(packet)
        logger.debug(
            "DhanWS subscription sent: exchange=%s count=%d",
            exchange_segment,
            len(security_ids),
        )

    def _send_unsubscription(self, exchange_segment: str, security_ids: List[int]) -> None:
        """Send an unsubscription request."""
        exchange_code = EXCHANGE_CODES.get(exchange_segment, 1)
        packet = {
            "RequestCode": 23,  # Unsubscribe code
            "InstrumentCount": len(security_ids),
            "InstrumentList": [
                {
                    "ExchangeSegment": exchange_code,
                    "SecurityId": str(sid),
                }
                for sid in security_ids
            ],
        }
        self._send_json(packet)

    def _send_json(self, payload: dict) -> None:
        if self._ws and self._connected:
            try:
                self._ws.send(json.dumps(payload))
            except Exception as exc:
                logger.warning("DhanWS send failed: %s", self._sanitize(str(exc)))

    # ------------------------------------------------------------------
    # Binary packet parser (stub — real parsing depends on Dhan binary format)
    # ------------------------------------------------------------------

    def _parse_binary_packet(self, data: bytes) -> Dict[str, Any]:
        """
        Parse binary market-data packet from Dhan feed.
        Dhan encodes live-tick data as binary structs. This stub returns
        raw bytes as hex for logging; extend with struct.unpack when
        Dhan binary spec is finalised.
        """
        return {
            "type": "binary_packet",
            "length": len(data),
            "hex_preview": data[:32].hex(),
        }

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _sanitize(self, text: str) -> str:
        """Strip access tokens from log strings."""
        if self._access_token and self._access_token in text:
            return text.replace(self._access_token, "[REDACTED]")
        return text

    @staticmethod
    def _default_on_message(data: Dict[str, Any]) -> None:
        logger.debug("DhanWS message received: %s", str(data)[:200])

    @staticmethod
    def _default_on_error(exc: Exception) -> None:
        logger.warning("DhanWS error (unhandled): %s", str(exc))
