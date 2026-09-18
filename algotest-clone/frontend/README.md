# AlgoTest Frontend — Phase 1

Next.js + TypeScript + Tailwind CSS frontend for the AlgoTest-style backtesting platform.

## Included

- Responsive dashboard
- Login/register screens
- Strategy list
- Strategy builder UI
- Backtest configuration
- Backtest result/analytics screen
- Instruments search
- Shared sidebar/navigation
- Axios API client
- JWT token storage
- TanStack Query provider
- Mock data for UI development

## Run

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Django API

Set:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Production Vercel:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-BACKEND.onrender.com/api
```

The current dashboard and backtest screens intentionally use mock data. The next phase should connect these screens to Django REST Framework endpoints. Do not put Dhan credentials in this frontend.