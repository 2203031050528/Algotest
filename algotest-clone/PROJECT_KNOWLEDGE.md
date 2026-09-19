# AlgoTest Clone — Project Knowledge Base

Comprehensive architecture, codebase map, data models, business logic, API references, and operational workflows for the **AlgoTest Clone** project.

---

## 1. Project Overview

**AlgoTest Clone** is a full-stack algorithmic trading and backtesting web platform modeled after AlgoTest.in. It enables retail traders and quant researchers to:
- Formulate rule-based algorithmic trading strategies with custom technical indicators (RSI, EMA, etc.) and risk management rules (Stop Loss, Profit Target).
- Run historical backtests against Indian equity/derivatives market data (NIFTY, BANKNIFTY, FINNIFTY, Equities) with granular trade logging and equity curve tracking.
- Inspect detailed analytics including Win Rate, Total P&L, Max Drawdown, and per-trade execution breakdown.
- Prepare strategies for live execution / paper trading through Indian broker APIs (Dhan API integration stubbed).

---

## 2. Technology Stack

### Backend
| Technology | Version / Spec | Purpose |
|---|---|---|
| **Python** | 3.11+ | Primary backend runtime |
| **Django** | >= 5.2, < 6.0 | Web framework & ORM |
| **Django REST Framework (DRF)** | >= 3.16 | RESTful API serialization & viewsets |
| **SimpleJWT** | `djangorestframework-simplejwt` | Stateless JWT authentication (access & refresh tokens) |
| **PostgreSQL / dj-database-url** | psycopg 3.2+ | Production-grade relational database with connection pooling |
| **Pandas & NumPy** | Current | Vectorized indicator calculations and backtesting loop |
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
| **Recharts** | ^2.15.0 | Interactive financial charts (Equity curves) |
| **Axios** | ^1.7.0 | HTTP client with JWT interceptor |
| **TanStack React Query** | ^5.0.0 | Server state management and caching |

---

## 3. Directory & File Structure

```
algotest-clone/
├── backend/
│   ├── apps/
│   │   ├── users/                 # Authentication & User accounts
│   │   │   ├── apps.py            # AppConfig (apps.users)
│   │   │   ├── serializers.py     # RegisterSerializer with validation
│   │   │   ├── views.py           # RegisterView (generics.CreateAPIView)
│   │   │   └── urls.py            # Auth routes (/register/)
│   │   ├── strategies/            # Strategy definitions
│   │   │   ├── apps.py            # AppConfig (apps.strategies)
│   │   │   ├── models.py          # Strategy model (symbol, timeframe, rules JSON)
│   │   │   ├── serializers.py     # StrategySerializer
│   │   │   ├── views.py           # StrategyViewSet (ModelViewSet)
│   │   │   └── urls.py            # DRF router for /api/strategies/
│   │   ├── backtesting/           # Historical backtesting engine & results
│   │   │   ├── apps.py            # AppConfig (apps.backtesting)
│   │   │   ├── models.py          # Backtest & BacktestTrade models
│   │   │   ├── serializers.py     # BacktestSerializer, BacktestTradeSerializer
│   │   │   ├── views.py           # BacktestViewSet (create runs backtest synchronously)
│   │   │   ├── urls.py            # DRF router for /api/backtests/
│   │   │   ├── tasks.py           # Celery async task skeleton (optional)
│   │   │   └── services/          # Core Backtest Engine Modules
│   │   │       ├── __init__.py
│   │   │       ├── engine.py      # BacktestEngine simulation loop
│   │   │       ├── indicators.py  # RSI & EMA mathematical routines
│   │   │       └── conditions.py  # Dynamic rule condition evaluator
│   │   ├── market_data/           # Historical candlestick store
│   │   │   ├── apps.py            # AppConfig (apps.market_data)
│   │   │   ├── models.py          # Candle model (OHLCV, timeframe, unique index)
│   │   │   └── management/commands/
│   │   │       └── import_candles.py # CSV candle data importer
│   │   ├── instruments/           # Symbol & exchange instrument directory (scaffold)
│   │   │   └── models.py
│   │   ├── dhan/                  # Dhan broker API client
│   │   │   └── client.py          # DhanClient (charts, historical data)
│   │   └── trades/                # Live/Paper trade execution (scaffold)
│   │       └── models.py
│   ├── config/                    # Django project core
│   │   ├── settings.py            # Settings, CORS, Database, Timezone (Asia/Kolkata)
│   │   ├── urls.py                # Main URL dispatcher (/api/...)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── data/sample/
│   │   └── nifty_5m.csv           # Sample 5-minute NIFTY OHLCV dataset
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── app/                       # Next.js 15 App Router
    │   ├── layout.tsx             # Root HTML layout with Inter font
    │   ├── globals.css            # Tailwind CSS setup & control utilities
    │   ├── providers.tsx          # React Query QueryClientProvider
    │   ├── page.tsx               # Redirects to /dashboard
    │   ├── login/page.tsx         # Sign-in form (JWT auth)
    │   ├── register/page.tsx      # Registration form
    │   └── dashboard/             # Authenticated workspace
    │       ├── page.tsx           # Dashboard home (Stats, Equity chart, Quick actions)
    │       ├── strategies/
    │       │   ├── page.tsx       # Strategy management list
    │       │   └── new/page.tsx   # Interactive rule & indicator strategy builder
    │       ├── backtests/
    │       │   ├── page.tsx       # Historical backtests list
    │       │   ├── new/page.tsx   # Backtest submission form
    │       │   └── [id]/page.tsx  # Backtest report: metrics, equity chart, trades table
    │       └── instruments/
    │           └── page.tsx       # Searchable instruments directory
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx       # Dashboard layout shell with responsive drawer
    │   │   └── Sidebar.tsx        # Navigation sidebar with active state
    │   └── dashboard/
    │       ├── StatCard.tsx       # Key performance indicator summary cards
    │       └── EquityChart.tsx    # Recharts AreaChart for cumulative portfolio value
    ├── lib/
    │   ├── api.ts                 # Axios instance with Bearer token interceptor
    │   ├── auth.ts                # LocalStorage token getter/setter/logout
    │   ├── auth-api.ts            # login() and register() API calls
    │   ├── strategy-api.ts        # Strategy CRUD API client
    │   └── mock-data.ts           # Mock datasets for offline UI preview
    ├── types/
    │   ├── strategy.ts            # TypeScript interfaces for Strategy
    │   ├── backtest.ts            # TypeScript interfaces for Backtest
    │   └── market.ts              # Candle & Instrument interfaces
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
- `symbol`: CharField (e.g. `"NIFTY"`, `"BANKNIFTY"`).
- `timeframe`: CharField choices: `["1m", "5m", "15m", "1h"]`.
- `capital`: DecimalField (max_digits=15, decimal_places=2).
- `configuration`: JSONField storing the strategy logic:
  ```json
  {
    "symbol": "NIFTY",
    "entry": [
      {"indicator": "RSI", "period": 14, "operator": "<", "value": 30}
    ],
    "exit": [
      {"indicator": "RSI", "period": 14, "operator": ">", "value": 60}
    ],
    "risk": {
      "stop_loss_percent": 2.0,
      "target_percent": 4.0
    }
  }
  ```
- `is_active`: BooleanField (default True).
- `created_at` / `updated_at`: Timestamps.

### 4.2. `apps.market_data.Candle`
Stores historical OHLCV market candles.
- `security_id`: CharField (e.g., `"NIFTY"`, `"26000"`).
- `exchange_segment`: CharField (e.g., `"NSE_FNO"`, `"NSE_EQ"`).
- `symbol`: CharField.
- `timeframe`: CharField (e.g. `"5m"`).
- `timestamp`: DateTimeField (IST-aware).
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

---

## 5. Backtesting Engine Workflow & Execution Logic

The backtesting service resides in `backend/apps/backtesting/services/`.

```
BacktestViewSet.perform_create()
         │
         ▼
Load Market Candles from DB (Candle model)
for [symbol, timeframe, date range]
         │
         ▼
Construct Pandas DataFrame (timestamp, open, high, low, close, volume)
         │
         ▼
BacktestEngine(candles=df, configuration=strategy.configuration, capital)
         │
         ├─► prepare_indicators():
         │     Calculates RSI (rolling gain/loss) and EMA (exponential weighted mean)
         │
         ├─► Iterates row by row through DataFrame:
         │     1. check_risk(): Check stop loss / profit target against current price
         │     2. evaluate_conditions(): Check entry conditions if flat -> open BUY position
         │     3. evaluate_conditions(): Check exit conditions if in position -> close position
         │     4. Update equity curve & mark-to-market unrealized PnL
         │
         ├─► Close any open position at end of backtest ("END_OF_BACKTEST")
         │
         ├─► Compute Analytics:
         │     - Final Capital
         │     - Total P&L & Return %
         │     - Win Rate (% of trades where PnL > 0)
         │     - Max Drawdown (% peak-to-trough drop from equity curve)
         │
         ▼
Save Backtest status = COMPLETED & bulk_create(BacktestTrade)
```

### Supported Indicators & Operators
- **Indicators**:
  - `RSI`: Relative Strength Index using `period` (default 14). Formula: $100 - (100 / (1 + RS))$ where $RS = \text{AvgGain}/\text{AvgLoss}$.
  - `EMA`: Exponential Moving Average using `close.ewm(span=period, adjust=False).mean()`.
- **Operators**: `<`, `<=`, `>`, `>=`, `==`, `!=`.

---

## 6. API Reference

All endpoints are prefixed with `/api/`.

### 6.1. Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new user account (`username`, `email`, `password`, `password_confirm`) | No |
| `POST` | `/api/auth/login/` | Obtain JWT token pair (`access`, `refresh`) | No |
| `POST` | `/api/auth/refresh/` | Refresh expired access token using refresh token | No |

### 6.2. Strategies (`/api/strategies/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/strategies/` | List all strategies belonging to authenticated user | Yes |
| `POST` | `/api/strategies/` | Create a new strategy | Yes |
| `GET` | `/api/strategies/{id}/` | Retrieve strategy details | Yes |
| `PUT` / `PATCH` | `/api/strategies/{id}/` | Update strategy | Yes |
| `DELETE` | `/api/strategies/{id}/` | Delete strategy | Yes |

### 6.3. Backtests (`/api/backtests/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/backtests/` | List user's backtest history | Yes |
| `POST` | `/api/backtests/` | Submit and execute a new backtest synchronously | Yes |
| `GET` | `/api/backtests/{id}/` | Get backtest metadata and metrics | Yes |
| `GET` | `/api/backtests/{id}/trades/` | Get list of executed trades for the backtest | Yes |
| `GET` | `/api/backtests/{id}/equity/` | Get step-by-step equity curve data points | Yes |

### 6.4. Dhan Broker Integration (`/api/dhan/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/dhan/status/` | Live connection status, active segments, data plan & funds summary | No |
| `GET` | `/api/dhan/profile/` | Detailed user account profile from Dhan | No |
| `GET` | `/api/dhan/funds/` | Live fund limits, SOD limit, collateral, and withdrawable balance | No |
| `GET` | `/api/dhan/positions/` | Current open/closed trading positions from Dhan | No |
| `GET` | `/api/dhan/orders/` | Orders placed today in the Dhan account | No |
| `POST` | `/api/dhan/orders/` | Place a new order with DhanHQ engine | No |
| `POST` | `/api/dhan/margin/` | Calculate live required margin for an order (`/v2/margincalculator`) | No |
| `POST` | `/api/dhan/historical/` | Fetch historical/intraday charts from Dhan | No |

### 6.5. Market Instruments (`/api/instruments/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/instruments/` | List instruments mapped with Dhan security IDs & lot sizes (`?q=...`) | No |

---

## 7. Environment Variables & Setup

### Backend Configuration (`backend/.env`)
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://username:password@localhost:5432/algotest_db

# Optional Dhan broker credentials
DHAN_CLIENT_ID=your_client_id
DHAN_ACCESS_TOKEN=your_access_token
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

#### Importing Market Data
```bash
cd backend
source venv/bin/activate
python manage.py import_candles data/sample/nifty_5m.csv --symbol NIFTY --security-id NIFTY --timeframe 5m
```

#### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 8. Known Issues & Immediate Remediation Items

| Item | Issue | Location | Resolution |
|---|---|---|---|
| **1. Auth AppConfig Crash (Resolved)** | `from .views import RegisterView` was at top level of `apps/users/apps.py`, triggering `AppRegistryNotReady`. | `backend/apps/users/apps.py` | Kept `apps.py` clean with only `AppConfig`. |
| **2. Auth URL Route Duplication** | Main `config/urls.py` defines `path("api/auth/register/", include("apps.users.urls"))`, and `apps.users.urls` defines `path("register/", ...)`. This creates `/api/auth/register/register/`. | `backend/config/urls.py` and `backend/apps/users/urls.py` | Change `config/urls.py` to `path("api/auth/", include("apps.users.urls"))` so that `/api/auth/register/` matches frontend expectations. |
| **3. Markdown Fences in Python Command** | `import_candles.py` contains ````python` on line 1 and ```` on line 211. This causes a `SyntaxError` when executing `python manage.py import_candles`. | `backend/apps/market_data/management/commands/import_candles.py` | Strip markdown fences from the Python file. |
| **4. Redundant Engine Files** | Duplicate files `apps/backtesting/engine.py` and `indicators.py` exist in the app root, while the active versions are in `apps/backtesting/services/`. | `backend/apps/backtesting/` | Consolidate or document that `services/` is the active production engine. |
| **5. Frontend Real API Integration** | The Strategy Builder (`/dashboard/strategies/new`) and Backtest Screen (`/dashboard/backtests/new`) currently demo with mock transitions. | `frontend/app/dashboard/` | Connect `createStrategy()` and `api.post("/backtests/")` using TanStack Query mutations. |

---

## 9. Future Roadmap

1. **Celery / Redis Asynchronous Backtesting**: Offload long backtests (e.g. multi-year tick-level data) to Celery workers using `apps/backtesting/tasks.py` with WebSocket or polling updates.
2. **Options Strategy Builder**: Add multi-leg options structures (Straddles, Strangles, Iron Condors) with Greeks calculation (Delta, Theta, Gamma, Vega).
3. **Live Execution / Dhan Webhooks**: Implement Dhan webhook listeners and order placement routines inside `apps/trades/` and `apps/dhan/`.
4. **Interactive Charting with TradingView**: Integrate Lightweight Charts or TradingView widget to visualize candlesticks with buy/sell markers overlay.
