# Dhan Integration — `apps/dhan/`

Complete integration layer for [DhanHQ v2 REST API](https://dhanhq.co/docs/v2/) within the AlgoTest platform.

---

## Architecture Overview

```
Next.js Frontend
      │ (JWT auth only — NO Dhan credentials)
      ▼
Django REST Framework
      │
      ├── apps/dhan/          ← Dhan broker layer
      │     ├── client.py     ← HTTP client (auth, retries, logging)
      │     ├── exceptions.py ← Error hierarchy
      │     └── services/
      │           ├── historical_data.py  ← Candle fetch + normalize + store
      │           ├── instruments.py      ← Scrip master sync
      │           └── websocket.py        ← Live feed WebSocket (foundation)
      │
      └── apps/market_data/   ← Provider abstraction
            ├── providers/
            │     ├── base.py          ← MarketDataProvider ABC
            │     ├── dhan_provider.py ← DB-first + Dhan gap-fill
            │     └── csv_provider.py  ← Local CSV files
            ├── models.py              ← Candle table
            ├── views.py               ← REST endpoints
            └── urls.py
```

> **Security rule:** The Next.js frontend **never** sends requests directly to Dhan. All Dhan communication is proxied through the Django backend. Credentials are loaded from environment variables only.

---

## Environment Variables

Add to `backend/.env`:

```env
DHAN_CLIENT_ID=your_client_id
DHAN_ACCESS_TOKEN=your_access_token
DHAN_API_KEY=your_api_key          # Optional (for advanced endpoints)
DHAN_SECRET=your_secret            # Optional
```

Never commit `.env` to version control.

---

## API Endpoints

### Dhan Broker (`/api/dhan/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dhan/status/` | Connection health + account summary |
| `GET` | `/api/dhan/profile/` | User profile from Dhan |
| `GET` | `/api/dhan/funds/` | Fund limits and margin info |
| `GET` | `/api/dhan/positions/` | Open positions |
| `GET` | `/api/dhan/orders/` | Order book |
| `POST` | `/api/dhan/margin/` | Calculate margin for an order |
| `POST` | `/api/dhan/historical/` | Raw intraday/daily candle fetch |

### Market Data (`/api/market-data/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/market-data/historical/` | Candles (DB-first, Dhan gap-fill) |
| `POST` | `/api/market-data/sync/` | Force-sync candles from Dhan to DB |
| `GET` | `/api/market-data/candles/` | Direct DB candle query (no API call) |
| `GET` | `/api/market-data/providers/` | Provider health status |

### Instruments (`/api/instruments/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/instruments/` | List instruments (paginated, filterable) |
| `GET` | `/api/instruments/search/?q=NIFTY` | Full-text instrument search |

---

## Supported Timeframes

| Timeframe | Dhan Interval | Max Date Chunk |
|-----------|---------------|----------------|
| `1m`  | `1`  | 7 days |
| `5m`  | `5`  | 30 days |
| `15m` | `15` | 60 days |
| `25m` | `25` | 90 days |
| `30m` | `25` | 90 days |
| `1h` / `60m` | `60` | 120 days |
| `1d` / `D`   | `1d` | 365 days |

---

## Example API Calls

### Check Connection
```bash
curl http://localhost:8000/api/dhan/status/
```

### Fetch Historical Daily Candles
```bash
curl "http://localhost:8000/api/market-data/historical/\
?security_id=1333\
&exchange_segment=NSE_EQ\
&symbol=HDFCBANK\
&timeframe=1d\
&start_date=2024-01-01\
&end_date=2024-03-31\
&provider=dhan"
```

### Force Sync Candles to DB
```bash
curl -X POST http://localhost:8000/api/market-data/sync/ \
  -H "Content-Type: application/json" \
  -d '{
    "security_id": "13",
    "exchange_segment": "IDX_I",
    "symbol": "NIFTY",
    "timeframe": "5m",
    "start_date": "2024-01-01",
    "end_date": "2024-01-07",
    "instrument_type": "INDEX"
  }'
```

### Search Instruments
```bash
curl "http://localhost:8000/api/instruments/search/?q=NIFTY"
```

---

## Management Commands

### Sync Historical Candles
```bash
# Sync HDFC Bank daily candles for 2024
python manage.py sync_dhan_candles \
  --security-id 1333 \
  --exchange-segment NSE_EQ \
  --symbol HDFCBANK \
  --timeframe 1d \
  --start-date 2024-01-01 \
  --end-date 2024-12-31

# Dry run (no DB write)
python manage.py sync_dhan_candles \
  --security-id 13 \
  --exchange-segment IDX_I \
  --symbol NIFTY \
  --timeframe 5m \
  --start-date 2024-03-01 \
  --end-date 2024-03-07 \
  --instrument-type INDEX \
  --dry-run

# Sync instrument master from Dhan Scrip Master CSV
python manage.py sync_dhan_instruments
```

---

## DhanClient

Production-grade HTTP client with:
- **Automatic credential injection** from `DHAN_CLIENT_ID` / `DHAN_ACCESS_TOKEN`
- **Credential masking** in all log outputs (`[REDACTED_ACCESS_TOKEN]`)
- **Exponential backoff retries** for HTTP 429 (rate-limit) and 502/503/504 (transient)
- **Max 3 retries** per request, initial backoff 0.5s doubling each attempt
- **15-second timeout** per request

```python
from apps.dhan.client import DhanClient

client = DhanClient()
status = client.check_connection()   # dict with connected: True/False
profile = client.get_profile()
funds   = client.get_fund_limits()
```

---

## Error Hierarchy

```
DhanBaseException
├── DhanAPIError          — General API errors (non-2xx)
├── DhanAuthenticationError — 401/403 responses
├── DhanRateLimitError    — 429 rate-limit exceeded after retries
├── DhanValidationError   — 400 bad request / invalid params
├── DhanConnectionError   — Network timeout / DNS failures
└── DhanDataError         — Malformed or unexpected response data
```

---

## Provider Pattern

The backtesting engine and API views interact exclusively with `MarketDataProvider` (ABC):

```python
from apps.market_data.providers.dhan_provider import DhanProvider
from apps.market_data.providers.csv_provider import CSVProvider

# DB-first (cache) then Dhan API gap-fill
provider = DhanProvider()
candles = provider.get_historical_data(
    security_id="1333",
    exchange_segment="NSE_EQ",
    symbol="HDFCBANK",
    timeframe="1d",
    start_date=date(2024, 1, 1),
    end_date=date(2024, 12, 31),
)

# Offline / test mode
csv_provider = CSVProvider(data_dir="data/")
candles = csv_provider.get_historical_data(...)
```

---

## WebSocket (Live Feed Foundation)

```python
from apps.dhan.services.websocket import DhanWebSocketClient

ws = DhanWebSocketClient(
    on_message=lambda data: print(data),
)
ws.subscribe("NSE_EQ", [1333, 2885])   # HDFCBANK, RELIANCE
ws.connect()     # non-blocking, runs in background thread
# ...
ws.disconnect()
```

WebSocket reconnects automatically with exponential backoff (1s → 60s, max 10 attempts). Subscriptions are restored after each reconnect.

> **Note:** Live order execution is **deferred** — not yet implemented.

---

## Running Tests

```bash
cd backend
source venv/bin/activate
python manage.py test apps.dhan apps.instruments apps.market_data -v 2
```

### Test Coverage Areas
- `test_client.py` — Auth headers, error mapping (401/403/400/429/500), sanitization
- `test_historical.py` — Interval mapping, chunking, normalization, deduplication
- `test_instruments.py` — Scrip master parsing, seeding, idempotency
- `test_providers.py` — DhanProvider (cache-first/gap-fill), CSVProvider (file reading/filtering)
- `test_security.py` — Token/secret never appear in API responses or logs

---

## Rate Limits

Dhan enforces rate limits. The `DhanClient` handles HTTP 429 responses automatically:
- Reads `Retry-After` header for wait time
- Retries up to 3 times
- Raises `DhanRateLimitError` if limit persists after retries

For bulk historical syncs, use `sync_dhan_candles` management command which automatically chunks date ranges to stay within Dhan's API limits.

---

## Dhan API Reference

- **Base URL:** `https://api.dhan.co`
- **Auth headers:** `access-token`, `client-id`
- **Intraday candles:** `POST /v2/charts/intraday`
- **Daily candles:** `POST /v2/charts/historical`
- **Profile:** `GET /v2/profile`
- **Fund limits:** `GET /v2/fundlimit`
- **Positions:** `GET /v2/positions`
- **Orders:** `GET /v2/orders`
- **Margin calculator:** `POST /v2/margincalculator`
- **Live feed WebSocket:** `wss://api-feed.dhan.co`

Full Dhan v2 documentation: https://dhanhq.co/docs/v2/
