# AlgoTest Clone — Project Knowledge Base

Comprehensive architecture, codebase map, data models, business logic, API references, provider architecture, and operational workflows for the **AlgoTest Clone** project.

---

## 1. Project Overview

**AlgoTest Clone** is a full-stack algorithmic trading, market-data synchronization, and backtesting web platform modeled after AlgoTest.in. It enables retail traders and quant researchers to:
- Formulate rule-based algorithmic trading strategies with custom technical indicators (RSI, EMA, etc.) and risk management rules (Stop Loss, Profit Target).
- Run historical backtests against Indian equity/derivatives market data (NIFTY, BANKNIFTY, FINNIFTY, Equities) with granular trade logging and equity curve tracking.
- Inspect detailed analytics including Win Rate, Total P&L, Max Drawdown, and per-trade execution breakdown.
- Synchronize live and historical OHLCV market feeds from the **DhanHQ v2 REST API** into PostgreSQL with a pluggable provider architecture (DhanHQ primary, local CSV/disk fallback).
- Inspect live broker status, fund limits, margins, open positions, and orders directly integrated with Indian broker accounts (Dhan API).

---

## 2. Technology Stack

### Backend
| Technology | Version / Spec | Purpose |
|---|---|---|
| **Python** | 3.11+ | Primary backend runtime |
| **Django** | >= 5.2, < 6.0 | Web framework & ORM |
| **Django REST Framework (DRF)** | >= 3.16 | RESTful API serialization & viewsets |
| **SimpleJWT** | `djangorestframework-simplejwt` | Stateless JWT authentication (access & refresh tokens) |
| **PostgreSQL / NeonDB** | psycopg 3.2+ | Production-grade relational database with connection pooling |
| **Pandas & NumPy** | Current | Vectorized indicator calculations and backtesting loop |
| **Requests** | Current | Production-grade HTTP client with exponential backoff & retry |
| **WhiteNoise** | Current | Static file serving for deployment |
| **Gunicorn** | Current | WSGI production application server |

### Frontend
| Technology | Version / Spec | Purpose |
|---|---|---|
| **Next.js** | 15 (App Router) | React server/client framework |
| **React** | 19.0 | Core UI rendering library |
| **TypeScript** | 5.0+ | Static type safety |
| **Tailwind CSS** | v4.0 with PostCSS | Design system & utility styling |
| **Lucide React** | ^0.468.0 | Icon set |
| **Recharts** | ^2.15.0 | Interactive financial charts (Area charts for Equity Curves & Price Series) |
| **Axios** | ^1.7.0 | HTTP client with JWT interceptor |
| **TanStack React Query** | ^5.0.0 | Server state management and caching |

---

## 3. Directory & File Structure

```
algotest-clone/
├── backend/
│   ├── apps/
│   │   ├── users/                     # Authentication & User accounts
│   │   │   ├── apps.py                # AppConfig (apps.users)
│   │   │   ├── serializers.py         # RegisterSerializer with password validation
│   │   │   ├── views.py               # RegisterView (generics.CreateAPIView)
│   │   │   └── urls.py                # Auth routes (/register/)
│   │   ├── strategies/                # Strategy definitions
│   │   │   ├── apps.py                # AppConfig (apps.strategies)
│   │   │   ├── models.py              # Strategy model (symbol, timeframe, rules JSON)
│   │   │   ├── serializers.py         # StrategySerializer
│   │   │   ├── views.py               # StrategyViewSet (ModelViewSet)
│   │   │   └── urls.py                # DRF router for /api/strategies/
│   │   ├── backtesting/               # Historical backtesting engine & results
│   │   │   ├── apps.py                # AppConfig (apps.backtesting)
│   │   │   ├── models.py              # Backtest & BacktestTrade models
│   │   │   ├── serializers.py         # BacktestSerializer, BacktestTradeSerializer
│   │   │   ├── views.py               # BacktestViewSet (runs backtest synchronously)
│   │   │   ├── urls.py                # DRF router for /api/backtests/
│   │   │   ├── tasks.py               # Celery async task skeleton
│   │   │   └── services/              # Core Backtest Engine Modules
│   │   │       ├── __init__.py
│   │   │       ├── engine.py          # BacktestEngine simulation loop
│   │   │       ├── indicators.py      # RSI & EMA mathematical routines
│   │   │       └── conditions.py      # Dynamic rule condition evaluator
│   │   ├── market_data/               # Historical candlestick store & provider layer
│   │   │   ├── apps.py                # AppConfig (apps.market_data)
│   │   │   ├── models.py              # Candle model (OHLCV, timeframe, unique index)
│   │   │   ├── serializers.py         # CandleSerializer, HistoricalDataRequestSerializer
│   │   │   ├── views.py               # HistoricalDataView, SyncCandlesView, CandleListView, MarketDataProvidersView
│   │   │   ├── urls.py                # /api/market-data/ routes
│   │   │   ├── providers/             # Pluggable Market Data Providers
│   │   │   │   ├── base.py            # MarketDataProvider abstract base class
│   │   │   │   ├── dhan_provider.py   # DB-first DhanHQ v2 integration with gap filling
│   │   │   │   └── csv_provider.py    # Local disk CSV file reader with recursive search
│   │   │   └── management/commands/
│   │   │       └── import_candles.py  # CSV candle data importer command
│   │   ├── instruments/               # Symbol & exchange instrument directory
│   │   │   ├── models.py              # Instrument model (security_id, lot_size, tick_size)
│   │   │   ├── serializers.py         # InstrumentSerializer
│   │   │   ├── views.py               # InstrumentViewSet
│   │   │   └── urls.py                # /api/instruments/ routes
│   │   ├── dhan/                      # Production DhanHQ broker integration
│   │   │   ├── client.py              # DhanClient (HTTP client with retry & backoff)
│   │   │   ├── exceptions.py          # Unified Dhan exception hierarchy
│   │   │   ├── views.py               # Live status, profile, funds, positions, orders, margin views
│   │   │   ├── urls.py                # /api/dhan/ routes
│   │   │   └── services/              # High-level Dhan domain services
│   │   │       ├── historical_data.py # Date chunking, parsing, and bulk upserting candles
│   │   │       ├── instruments.py     # Dhan scrip master CSV download & seed service
│   │   │       └── websocket.py       # Binary packet parser for live tick feeds
│   │   └── trades/                    # Live/Paper trade execution scaffold
│   │       └── models.py
│   ├── config/                        # Django project core
│   │   ├── settings.py                # Settings, CORS, Database, Timezone (Asia/Kolkata)
│   │   ├── urls.py                    # Main URL dispatcher (/api/...)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── data/                          # Local historical CSV data repository
│   │   ├── nifty_5m.csv               # NIFTY 5-minute dataset
│   │   └── sample/
│   │       └── nifty_5m.csv           # Sample backup
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── app/                           # Next.js 15 App Router
    │   ├── layout.tsx                 # Root HTML layout with Inter font
    │   ├── globals.css                # Tailwind CSS setup & control utilities
    │   ├── providers.tsx              # React Query QueryClientProvider
    │   ├── page.tsx                   # Redirects to /dashboard
    │   ├── login/page.tsx             # Sign-in form (JWT auth)
    │   ├── register/page.tsx          # Registration form
    │   └── dashboard/                 # Authenticated workspace
    │       ├── page.tsx               # Live Dashboard (real stats, dynamic equity curve, Dhan status)
    │       ├── strategies/
    │       │   ├── page.tsx           # Strategy management list
    │       │   └── new/page.tsx       # Interactive rule & indicator strategy builder
    │       ├── backtests/
    │       │   ├── page.tsx           # Historical backtests list
    │       │   ├── new/page.tsx       # Backtest submission form (dynamic date defaults)
    │       │   └── [id]/page.tsx      # Backtest report: metrics, equity chart, trades table
    │       ├── market-data/
    │       │   └── page.tsx           # Market Data Engine (Visualizer, Dhan Sync, DB Cache, Providers)
    │       ├── instruments/
    │       │   └── page.tsx           # Searchable instruments directory with quick preview/sync
    │       └── broker/
    │           └── page.tsx           # Broker Hub (Dhan credentials, margin calc, positions, orders)
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx           # Dashboard layout shell with responsive drawer
    │   │   └── Sidebar.tsx            # Navigation sidebar with active state
    │   └── dashboard/
    │       ├── StatCard.tsx           # Key performance indicator summary cards
    │       └── EquityChart.tsx        # Dynamic prop-driven Recharts AreaChart for equity curve
    ├── lib/
    │   ├── api.ts                     # Axios instance with Bearer token interceptor
    │   ├── auth.ts                    # LocalStorage token getter/setter/logout
    │   ├── auth-api.ts                # login() and register() API calls
    │   ├── strategy-api.ts            # Strategy CRUD API client
    │   ├── backtest-api.ts            # Backtest submission & reporting API client
    │   ├── market-api.ts              # Market Data API client (historical, sync, candles, providers)
    │   └── dhan-api.ts                # Dhan broker API client (status, profile, funds, positions, orders)
    ├── types/
    │   ├── strategy.ts                # TypeScript interfaces for Strategy
    │   ├── backtest.ts                # TypeScript interfaces for Backtest & Trades
    │   ├── market.ts                  # Candle, Instrument, MarketDataProvider, Sync payloads
    │   └── dhan.ts                    # Dhan account, fund limits, orders, positions types
    ├── package.json
    └── tsconfig.json
```

---

## 4. Database Schema & Data Models

### 4.1. `apps.strategies.Strategy`
Represents a user-defined algorithmic trading strategy.
- `id`: Auto-incrementing primary key.
- `user`: Foreign key to `auth.User` (`CASCADE`).
- `name`: CharField (max 150).
- `symbol`: CharField (e.g. `"NIFTY"`, `"BANKNIFTY"`, `"HDFCBANK"`).
- `timeframe`: CharField choices: `["1m", "5m", "15m", "1h"]`.
- `capital`: DecimalField (max_digits=15, decimal_places=2).
- `configuration`: JSONField storing entry rules, exit rules, and risk management parameters.
- `is_active`: BooleanField (default True).
- `created_at` / `updated_at`: Timestamps.

### 4.2. `apps.market_data.Candle`
Stores normalized OHLCV market candles.
- `security_id`: CharField (e.g., `"1333"`, `"13"`, `"NIFTY"`).
- `exchange_segment`: CharField (e.g., `"NSE_EQ"`, `"IDX_I"`, `"NSE_FNO"`).
- `symbol`: CharField (e.g., `"HDFCBANK"`, `"NIFTY"`).
- `timeframe`: CharField (e.g., `"1m"`, `"5m"`, `"15m"`, `"25m"`, `"1h"`, `"1d"`).
- `timestamp`: DateTimeField (IST Asia/Kolkata aware).
- `open`, `high`, `low`, `close`: DecimalField(15, 4).
- `volume`, `open_interest`: BigIntegerField (nullable).
- **Constraints & Indexes**:
  - `UniqueConstraint(fields=["security_id", "timeframe", "timestamp"], name="unique_market_candle")`
  - `Index(fields=["symbol", "timeframe", "timestamp"])`

### 4.3. `apps.backtesting.Backtest`
Records an individual backtest run.
- `id`: Primary key.
- `user`: Foreign key to `auth.User`.
- `strategy`: Foreign key to `Strategy`.
- `start_date`, `end_date`: DateField.
- `initial_capital`: DecimalField(15, 2).
- `final_capital`: DecimalField(15, 2) (computed).
- `total_pnl`: DecimalField(15, 2) (computed).
- `return_percent`: DecimalField(10, 4) (computed).
- `win_rate`: DecimalField(10, 4) (computed % of winning trades).
- `max_drawdown`: DecimalField(10, 4) (computed peak-to-trough % drop).
- `total_trades`: PositiveIntegerField (default 0).
- `status`: Choices `["PENDING", "RUNNING", "COMPLETED", "FAILED"]`.
- `error_message`: TextField.
- `created_at`, `updated_at`: Timestamps.

### 4.4. `apps.backtesting.BacktestTrade`
Individual executed trade generated by the backtesting engine.
- `id`: Primary key.
- `backtest`: Foreign key to `Backtest` (`related_name="trades"`).
- `symbol`: CharField(100).
- `side`: `"BUY"` or `"SELL"`.
- `entry_time`, `exit_time`: DateTimeField.
- `entry_price`, `exit_price`: DecimalField(15, 4).
- `quantity`: PositiveIntegerField.
- `pnl`: DecimalField(15, 2).
- `exit_reason`: CharField (`"TARGET"`, `"STOP_LOSS"`, `"SIGNAL"`, `"END_OF_BACKTEST"`).

### 4.5. `apps.instruments.Instrument`
Maps trading symbols to DhanHQ security IDs, lot sizes, tick sizes, and segments.
- `security_id`: CharField(50) (e.g. `"1333"`, `"13"`).
- `exchange_segment`: CharField(30) (e.g. `"NSE_EQ"`, `"IDX_I"`).
- `trading_symbol`: CharField(100).
- `symbol`: CharField(100).
- `instrument_type`: CharField(30) (`"EQUITY"`, `"INDEX"`, `"FUTIDX"`, `"OPTIDX"`).
- `lot_size`: PositiveIntegerField (e.g. 25 for NIFTY, 15 for BANKNIFTY).
- `tick_size`: DecimalField(10, 4).
- `source`: CharField(50) (e.g. `"DHAN"`).

---

## 5. Market Data Engine & Provider Architecture

The market data layer is decoupled via the `MarketDataProvider` abstract base class (`apps/market_data/providers/base.py`).

```
                              ┌────────────────────────┐
                              │   MarketDataProvider   │
                              │     (Abstract Base)    │
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       ┌───────────────────────────┐               ┌───────────────────────────┐
       │       DhanProvider        │               │        CSVProvider        │
       │  (Live Feed + DB Cache)   │               │   (Local Disk / Offline)  │
       └─────────────┬─────────────┘               └─────────────┬─────────────┘
                     │                                           │
         ┌───────────┴───────────┐                               │
         ▼                       ▼                               ▼
┌──────────────────┐   ┌──────────────────┐             ┌──────────────────┐
│  Postgres Cache  │   │   DhanHQ v2 API  │             │   backend/data/  │
│  (Candle Table)  │   │ (Charts/Intraday)│             │  (*_timeframe.csv│
└──────────────────┘   └──────────────────┘             └──────────────────┘
```

### 5.1. `DhanProvider`
- **DB-First Caching**: Queries PostgreSQL for the requested window.
- **Gap Detection**: Identifies missing trading dates and requests only the missing chunks from DhanHQ.
- **Resilient Querying**: Filters by `Q(security_id=id) | Q(symbol__iexact=symbol)` to handle both numeric security IDs and string symbols.
- **Error Transparency**: If DhanHQ returns an error (e.g. HTTP 451 subscription required) and no cached data exists, it re-raises the exception so the API and UI communicate the real broker status.

### 5.2. `CSVProvider`
- **Recursive Directory Discovery**: Uses `os.walk` to search `backend/data/` and subdirectories (`data/sample/`).
- **Flexible Schema Aliasing**: Automatically normalizes column variations (`timestamp`, `open`, `high`, `low`, `close`, `volume`, `oi`).
- **Deduplication**: Automatically deduplicates identical CSV filenames found across directories.

---

## 6. Complete API Reference

All endpoints are prefixed with `/api/`.

### 6.1. Authentication (`/api/auth/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new user account (`username`, `email`, `password`, `password_confirm`) | No |
| `POST` | `/api/auth/login/` | Obtain JWT token pair (`access`, `refresh`) | No |
| `POST` | `/api/auth/refresh/` | Refresh expired access token using refresh token | No |

### 6.2. Strategies (`/api/strategies/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/strategies/` | List all strategies belonging to authenticated user | Yes |
| `POST` | `/api/strategies/` | Create a new strategy with indicator and risk JSON | Yes |
| `GET` | `/api/strategies/{id}/` | Retrieve strategy details | Yes |
| `PUT` / `PATCH` | `/api/strategies/{id}/` | Update strategy configuration | Yes |
| `DELETE` | `/api/strategies/{id}/` | Delete strategy | Yes |

### 6.3. Backtests (`/api/backtests/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/backtests/` | List user's backtest history | Yes |
| `POST` | `/api/backtests/` | Submit and execute a new backtest synchronously | Yes |
| `GET` | `/api/backtests/{id}/` | Get backtest metadata and computed metrics | Yes |
| `GET` | `/api/backtests/{id}/trades/` | Get list of executed trades for the backtest | Yes |
| `GET` | `/api/backtests/{id}/equity/` | Get step-by-step equity curve data points | Yes |

### 6.4. Market Data Engine (`/api/market-data/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/market-data/historical/` | Query historical candles (`security_id`, `symbol`, `timeframe`, `start_date`, `end_date`, `provider=dhan\|csv`) | No |
| `POST` | `/api/market-data/sync/` | Force-fetch candles from DhanHQ and upsert into PostgreSQL | No |
| `GET` | `/api/market-data/providers/` | Health check & capabilities of all registered providers (`dhan`, `csv`) | No |
| `GET` | `/api/market-data/candles/` | Direct query of PostgreSQL Candle table with optional symbol, secId, timeframe | No |

### 6.5. Dhan Broker Integration (`/api/dhan/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/dhan/status/` | Live connection status, active segments, data plan & funds summary | No |
| `GET` | `/api/dhan/profile/` | Detailed user account profile from Dhan | No |
| `GET` | `/api/dhan/funds/` | Live fund limits, SOD limit, collateral, and withdrawable balance | No |
| `GET` | `/api/dhan/positions/` | Current open/closed trading positions from Dhan | No |
| `GET` | `/api/dhan/orders/` | Orders placed today in the Dhan account | No |
| `POST` | `/api/dhan/orders/` | Place a new order with DhanHQ engine | No |
| `POST` | `/api/dhan/margin/` | Calculate live required margin for an order (`/v2/margincalculator`) | No |
| `POST` | `/api/dhan/historical/` | Fetch historical/intraday charts directly from Dhan | No |

### 6.6. Market Instruments (`/api/instruments/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/instruments/` | List instruments mapped with Dhan security IDs & lot sizes (`?q=...`) | No |

---

## 7. Frontend Architecture & UI Features

### 7.1. Live Dashboard (`/dashboard`)
- **Real Metrics**: Dynamically calculated from database backtests and strategies (Total Backtests, Strategies, Total Trades, Portfolio Capital).
- **Live Dhan Broker Banner**: Shows real-time connection status (`Connected · ID: 1113630741` or instructions to configure).
- **Dynamic Equity Curve**: `EquityChart` accepts dynamic backtest history, building a chronological equity trajectory rather than static mock coordinates.
- **Recent Backtest Activity**: Displays actual backtest runs with status badges and calculated P&L.

### 7.2. Market Data Engine (`/dashboard/market-data`)
- **Feed Provider Selector**: Toggle between `DhanHQ (Live API)` and `Local CSV (Offline)`.
- **Subscription Shield**: When DhanHQ returns HTTP 451 (Data APIs subscription required on account), the UI displays a clear explanation with 1-click fallback buttons to load local CSV feeds or inspect cached DB candles.
- **Quick Presets**: 1-click presets for HDFCBANK, RELIANCE, TCS, INFY, NIFTY, and BANKNIFTY with correct segments and default timeframes.
- **Direct DB Cache Inspector**: Search by symbol/secId, filter by timeframe, or click "View All Candles" to view all records currently in Postgres.
- **Providers Architecture Tab**: Live telemetry showing rate limits, storage engine paths, supported granularities, and detected CSV file counts.

### 7.3. Broker Hub (`/dashboard/broker`)
- Real-time connection testing with DhanHQ.
- Live fund summary (Available Balance, SOD Limit, Collateral, Withdrawable Balance).
- Dynamic margin calculator (`/v2/margincalculator`).
- Live positions and order history display.

---

## 8. Environment Configuration

### Backend Configuration (`backend/.env`)
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://username:password@localhost:5432/algotest_db

# DhanHQ v2 Broker Credentials
DHAN_CLIENT_ID=your_client_id
DHAN_ACCESS_TOKEN=your_access_token
DHAN_API_KEY=your_api_key_optional
DHAN_SECRET=your_secret_optional
```

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Quick Commands

#### Running the Backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Running Tests
```bash
cd backend
source venv/bin/activate
python manage.py test apps.market_data
python manage.py test apps.strategies
python manage.py test apps.backtesting
```

---

## 9. DhanHQ API Gotchas & Operational Notes

1. **Trading APIs vs Data APIs (HTTP 451)**:
   - On DhanHQ, Trading APIs (Profile, Fund Limits, Positions, Orders, Margin Calculator) are enabled by default for all API users.
   - Candlestick Historical Chart APIs (`/v2/charts/historical` and `/v2/charts/intraday`) require subscribing to the "Data APIs" add-on in the Dhan Web console (`profile.dataPlan = "Active"`).
   - If `dataPlan` is `"Deactive"`, Dhan returns HTTP 451 (`User has not subscribed to Data APIs`). The system gracefully surfaces this explanation and provides offline CSV/PostgreSQL fallback.
2. **Rate Limiting (HTTP 429)**:
   - Dhan enforces a rate limit of ~5 requests/second. `DhanClient` handles this transparently using exponential backoff retries with `Retry-After` header inspection.
3. **Chunking Limits**:
   - Intraday 1-minute data requests must not exceed 7 days per call. `DhanHistoricalService` automatically segments date ranges into safe windows.
