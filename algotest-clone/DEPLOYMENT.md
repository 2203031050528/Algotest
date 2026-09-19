# Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide walks you through deploying the **Django Backend** to **Render** and the **Next.js Frontend** to **Vercel**.

---

## 1. Backend Deployment on Render

### Method A: Blueprint Deployment (Recommended — 1-Click)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) blueprint that configures both a managed PostgreSQL database and the Django web service automatically.

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Connect your GitHub repository: `2203031050528/Algotest`.
4. Render will read `render.yaml` and create:
   - **`algotest-postgres`**: Managed PostgreSQL database.
   - **`algotest-backend`**: Web service using `backend/build.sh`.
5. Under **Environment Variables**, fill in your Dhan credentials:
   - `DHAN_CLIENT_ID`: Your Dhan Client ID (e.g. `1113630741`)
   - `DHAN_ACCESS_TOKEN`: Your active Dhan JWT access token
   - `DHAN_API_KEY`: Your Dhan API key
   - `DHAN_SECRET`: Your Dhan secret
6. Click **Apply**.
7. Once deployed, note down your backend URL (e.g., `https://algotest-backend.onrender.com`).

---

### Method B: Manual Web Service Setup on Render

If you prefer to configure the service manually:

1. **Create PostgreSQL Database**:
   - Click **New +** &rarr; **PostgreSQL**.
   - Name: `algotest-db`
   - Plan: **Free**
   - Click **Create Database**. Copy the **Internal Database URL** (or External URL).

2. **Create Web Service**:
   - Click **New +** &rarr; **Web Service**.
   - Connect the `Algotest` repository.
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Environment Variables**:
     | Variable | Value | Notes |
     | :--- | :--- | :--- |
     | `PYTHON_VERSION` | `3.11.6` | Recommended Python version |
     | `DEBUG` | `False` | Production mode |
     | `SECRET_KEY` | *(Click Generate)* | Strong random secret key |
     | `DATABASE_URL` | *(Paste database URL)* | Render PostgreSQL connection string |
     | `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Allows Render domain |
     | `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | Add your Vercel URL once created |
     | `DHAN_CLIENT_ID` | `1113630741` | Dhan Client ID |
     | `DHAN_ACCESS_TOKEN` | *(Your token)* | Dhan access token |
     | `DHAN_API_KEY` | *(Your key)* | Dhan API key |
     | `DHAN_SECRET` | *(Your secret)* | Dhan secret |
3. Click **Deploy Web Service**.

---

## 2. Frontend Deployment on Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Import your GitHub repository: `2203031050528/Algotest`.
4. In the configuration screen:
   - **Framework Preset**: `Next.js` (auto-detected)
   - **Root Directory**: Click **Edit** and select **`frontend`** *(Critical step)*
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://algotest-backend.onrender.com/api` | Your Render backend URL + `/api` |
6. Click **Deploy**.
7. Vercel will build the Next.js application and assign a live URL, e.g., `https://algotest-frontend.vercel.app`.

---

## 3. Final Verification

1. In your Render Dashboard, update the `CORS_ALLOWED_ORIGINS` variable with your actual Vercel URL:
   ```env
   CORS_ALLOWED_ORIGINS=https://algotest-frontend.vercel.app
   ```
2. Open your Vercel URL:
   - Navigate to `/register` or `/login`.
   - Go to **Dashboard** &rarr; verify the Dhan Broker status widget shows your Client ID.
   - Go to **Market Data** &rarr; test fetching candles and triggering a Dhan sync.
   - Go to **Strategies** &rarr; seed a pre-built template or create a custom strategy.
   - Go to **Backtests** &rarr; execute a historical backtest and review the real-time equity curve and trade logs.
