"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  DownloadCloud,
  FileSpreadsheet,
  HelpCircle,
  Landmark,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import { marketApi } from "@/lib/market-api";
import { Candle, MarketDataProvider, SyncCandlesResponse } from "@/types/market";

const POPULAR_PRESETS = [
  { symbol: "HDFCBANK", secId: "1333", segment: "NSE_EQ", type: "EQUITY" },
  { symbol: "RELIANCE", secId: "2885", segment: "NSE_EQ", type: "EQUITY" },
  { symbol: "TCS", secId: "11536", segment: "NSE_EQ", type: "EQUITY" },
  { symbol: "INFY", secId: "1594", segment: "NSE_EQ", type: "EQUITY" },
  { symbol: "NIFTY 50", secId: "13", segment: "IDX_I", type: "INDEX" },
  { symbol: "BANKNIFTY", secId: "25", segment: "IDX_I", type: "INDEX" },
];

export default function MarketDataPage() {
  const [activeTab, setActiveTab] = useState<"sync" | "explorer" | "cache" | "providers">("explorer");

  // Providers state
  const [providers, setProviders] = useState<MarketDataProvider[]>([]);

  // Sync state
  const [syncSymbol, setSyncSymbol] = useState("HDFCBANK");
  const [syncSecId, setSyncSecId] = useState("1333");
  const [syncSegment, setSyncSegment] = useState("NSE_EQ");
  const [syncType, setSyncType] = useState("EQUITY");
  const [syncTimeframe, setSyncTimeframe] = useState("1d");
  const [syncStartDate, setSyncStartDate] = useState("2024-01-01");
  const [syncEndDate, setSyncEndDate] = useState("2024-03-31");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<SyncCandlesResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Explorer state
  const [expSymbol, setExpSymbol] = useState("HDFCBANK");
  const [expSecId, setExpSecId] = useState("1333");
  const [expSegment, setExpSegment] = useState("NSE_EQ");
  const [expType, setExpType] = useState("EQUITY");
  const [expTimeframe, setExpTimeframe] = useState<"1m" | "5m" | "15m" | "25m" | "1h" | "1d">("1d");
  const [expStartDate, setExpStartDate] = useState("2024-01-01");
  const [expEndDate, setExpEndDate] = useState("2024-03-31");
  const [expLoading, setExpLoading] = useState(false);
  const [expCandles, setExpCandles] = useState<Candle[]>([]);
  const [expCount, setExpCount] = useState<number>(0);
  const [expProvider, setExpProvider] = useState<string>("");
  const [expError, setExpError] = useState<string | null>(null);

  // Cache inspector state
  const [cacheSecId, setCacheSecId] = useState("1333");
  const [cacheTimeframe, setCacheTimeframe] = useState("1d");
  const [cacheCandles, setCacheCandles] = useState<Candle[]>([]);
  const [cacheTotal, setCacheTotal] = useState(0);
  const [cacheLoading, setCacheLoading] = useState(false);

  useEffect(() => {
    let active = true;
    marketApi
      .getProviders()
      .then((data) => {
        if (active) setProviders(data);
      })
      .catch((err) => console.error("Error fetching providers:", err));

    marketApi
      .getHistorical({
        security_id: "1333",
        symbol: "HDFCBANK",
        exchange_segment: "NSE_EQ",
        instrument_type: "EQUITY",
        timeframe: "1d",
        start_date: "2024-01-01",
        end_date: "2024-03-31",
        page_size: 500,
      })
      .then((res) => {
        if (!active) return;
        setExpCandles(res.results || []);
        setExpCount(res.count || 0);
        setExpProvider(res.provider || "dhan");
      })
      .catch(() => {
        // Handled silently on initial load
      });

    return () => {
      active = false;
    };
  }, []);


  const handleApplyPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    setSyncSymbol(preset.symbol);
    setSyncSecId(preset.secId);
    setSyncSegment(preset.segment);
    setSyncType(preset.type);

    setExpSymbol(preset.symbol);
    setExpSecId(preset.secId);
    setExpSegment(preset.segment);
    setExpType(preset.type);
    setCacheSecId(preset.secId);
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncLoading(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const res = await marketApi.syncCandles({
        security_id: syncSecId,
        exchange_segment: syncSegment,
        symbol: syncSymbol,
        timeframe: syncTimeframe,
        start_date: syncStartDate,
        end_date: syncEndDate,
        instrument_type: syncType,
      });
      setSyncSuccess(res);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; detail?: string } }; message?: string };
      setSyncError(
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Sync failed. Please verify security ID and credentials."
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchExplorerData = async () => {
    setExpLoading(true);
    setExpError(null);
    try {
      const res = await marketApi.getHistorical({
        security_id: expSecId,
        symbol: expSymbol,
        exchange_segment: expSegment,
        instrument_type: expType,
        timeframe: expTimeframe,
        start_date: expStartDate,
        end_date: expEndDate,
        page_size: 500,
      });
      setExpCandles(res.results || []);
      setExpCount(res.count || 0);
      setExpProvider(res.provider || "dhan");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; detail?: string } }; message?: string };
      setExpError(
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to retrieve market candles."
      );
      setExpCandles([]);
    } finally {
      setExpLoading(false);
    }
  };

  const fetchCacheData = async () => {
    setCacheLoading(true);
    try {
      const res = await marketApi.getCandles({
        security_id: cacheSecId,
        timeframe: cacheTimeframe,
        limit: 100,
      });
      setCacheCandles(res.results || []);
      setCacheTotal(res.count || 0);
    } catch (err) {
      console.error("Failed to query candle cache:", err);
    } finally {
      setCacheLoading(false);
    }
  };

  // Metrics for explorer view
  const lastCandle = expCandles[expCandles.length - 1];
  const firstCandle = expCandles[0];
  const priceChange =
    lastCandle && firstCandle
      ? lastCandle.close - firstCandle.open
      : 0;
  const pctChange =
    firstCandle && firstCandle.open
      ? ((priceChange / firstCandle.open) * 100).toFixed(2)
      : "0.00";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Market Data Engine
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dhan &amp; Postgres Synced
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Query historical OHLC candles, synchronize DhanHQ market data feeds, and inspect cached time series.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchExplorerData();
                fetchCacheData();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} className={expLoading ? "animate-spin" : ""} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Quick Instrument Presets */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
            <Sparkles size={14} className="text-amber-500" /> Presets:
          </span>
          {POPULAR_PRESETS.map((p) => {
            const isSelected = expSymbol === p.symbol;
            return (
              <button
                key={p.symbol}
                onClick={() => handleApplyPreset(p)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-gray-950 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.symbol}
                <span className="ml-1 text-[10px] opacity-70 font-mono">#{p.secId}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "explorer"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <BarChart3 size={16} />
            Historical Visualizer ({expCandles.length})
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "sync"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <DownloadCloud size={16} />
            Dhan Candle Synchronizer
          </button>
          <button
            onClick={() => {
              setActiveTab("cache");
              fetchCacheData();
            }}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "cache"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Database size={16} />
            Direct DB Cache
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "providers"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Layers size={16} />
            Providers &amp; Architecture
          </button>
        </div>

        {/* TAB 1: HISTORICAL VISUALIZER */}
        {activeTab === "explorer" && (
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Symbol</label>
                  <input
                    value={expSymbol}
                    onChange={(e) => setExpSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFCBANK"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dhan Sec ID</label>
                  <input
                    value={expSecId}
                    onChange={(e) => setExpSecId(e.target.value)}
                    placeholder="e.g. 1333"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Timeframe</label>
                  <select
                    value={expTimeframe}
                    onChange={(e) => setExpTimeframe(e.target.value as "1m" | "5m" | "15m" | "25m" | "1h" | "1d")}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none"
                  >
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="25m">25 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="1d">1 Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={expStartDate}
                    onChange={(e) => setExpStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={expEndDate}
                    onChange={(e) => setExpEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchExplorerData}
                    disabled={expLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition"
                  >
                    {expLoading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                    Fetch Feed
                  </button>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {expError && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>{expError}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("sync");
                    setSyncSecId(expSecId);
                    setSyncSymbol(expSymbol);
                  }}
                  className="rounded-lg bg-amber-200 px-3 py-1 font-semibold hover:bg-amber-300"
                >
                  Sync from Dhan Now
                </button>
              </div>
            )}

            {/* Summary metrics */}
            {expCandles.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-medium uppercase text-gray-400">Total Candles</span>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{expCount.toLocaleString()}</p>
                  <span className="text-xs text-gray-500">Provider: <b className="text-gray-800 uppercase">{expProvider}</b></span>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-medium uppercase text-gray-400">Current / Last Close</span>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    ₹{lastCandle ? Number(lastCandle.close).toFixed(2) : "0.00"}
                  </p>
                  <span
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      priceChange >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    <TrendingUp size={13} />
                    {priceChange >= 0 ? "+" : ""}
                    {priceChange.toFixed(2)} ({pctChange}%)
                  </span>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-medium uppercase text-gray-400">Period Range</span>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    ₹{Math.min(...expCandles.map((c) => Number(c.low))).toFixed(2)} - ₹
                    {Math.max(...expCandles.map((c) => Number(c.high))).toFixed(2)}
                  </p>
                  <span className="text-xs text-gray-500">Min Low to Max High</span>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <span className="text-xs font-medium uppercase text-gray-400">Resolution</span>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{expTimeframe.toUpperCase()}</p>
                  <span className="text-xs text-gray-500">
                    {expStartDate} &rarr; {expEndDate}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Chart */}
            {expCandles.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {expSymbol} Historical Price Series ({expTimeframe})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Aggregated candlestick close trajectory loaded via {expProvider}
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={expCandles.map((c) => ({
                        time: c.timestamp ? c.timestamp.split("T")[0] : "",
                        close: Number(c.close),
                        high: Number(c.high),
                        low: Number(c.low),
                        open: Number(c.open),
                      }))}
                    >
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        domain={["auto", "auto"]}
                        tickLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "12px",
                          border: "none",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Candle Logs</h3>
                  <p className="text-xs text-gray-500">
                    Showing latest {Math.min(expCandles.length, 100)} records in order
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase text-gray-400 font-semibold border-b">
                    <tr>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Open</th>
                      <th className="px-5 py-3">High</th>
                      <th className="px-5 py-3">Low</th>
                      <th className="px-5 py-3">Close</th>
                      <th className="px-5 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {expCandles.slice(0, 50).map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/75 transition">
                        <td className="px-5 py-2.5 font-medium text-gray-800">
                          {c.timestamp.replace("T", " ").replace("Z", "")}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600">₹{Number(c.open).toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-emerald-600">₹{Number(c.high).toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-red-600">₹{Number(c.low).toFixed(2)}</td>
                        <td className="px-5 py-2.5 font-bold text-gray-900">
                          ₹{Number(c.close).toFixed(2)}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500">
                          {c.volume ? Number(c.volume).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DHAN CANDLE SYNCHRONIZER */}
        {activeTab === "sync" && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <DownloadCloud size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Sync Market Data from DhanHQ</h2>
                    <p className="text-xs text-gray-500">
                      Fetches historical OHLC candles directly from Dhan and stores them into the local PostgreSQL database.
                    </p>
                  </div>
                </div>

                {syncSuccess && (
                  <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Sync Completed Successfully!
                    </div>
                    <p className="mt-1 text-emerald-800">
                      Persisted <b>{syncSuccess.synced}</b> candles for <b>{syncSuccess.symbol}</b> (
                      {syncSuccess.timeframe}) from {syncSuccess.start_date} to {syncSuccess.end_date}.
                    </p>
                  </div>
                )}

                {syncError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle size={16} className="text-red-600" />
                      Synchronization Error
                    </div>
                    <p className="mt-1 text-red-800">{syncError}</p>
                  </div>
                )}

                <form onSubmit={handleSyncSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Symbol Name
                      </label>
                      <input
                        value={syncSymbol}
                        onChange={(e) => setSyncSymbol(e.target.value.toUpperCase())}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Dhan Security ID
                      </label>
                      <input
                        value={syncSecId}
                        onChange={(e) => setSyncSecId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Exchange Segment
                      </label>
                      <select
                        value={syncSegment}
                        onChange={(e) => setSyncSegment(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none"
                      >
                        <option value="NSE_EQ">NSE Equity (NSE_EQ)</option>
                        <option value="IDX_I">Index (IDX_I)</option>
                        <option value="NSE_FNO">NSE F&amp;O (NSE_FNO)</option>
                        <option value="BSE_EQ">BSE Equity (BSE_EQ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Timeframe
                      </label>
                      <select
                        value={syncTimeframe}
                        onChange={(e) => setSyncTimeframe(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none"
                      >
                        <option value="1m">1 Minute (Intraday)</option>
                        <option value="5m">5 Minutes (Intraday)</option>
                        <option value="15m">15 Minutes (Intraday)</option>
                        <option value="25m">25 Minutes (Intraday)</option>
                        <option value="1h">1 Hour (Intraday)</option>
                        <option value="1d">1 Day (Daily EOD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={syncStartDate}
                        onChange={(e) => setSyncStartDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={syncEndDate}
                        onChange={(e) => setSyncEndDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={syncLoading}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {syncLoading ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        Syncing from Dhan API...
                      </>
                    ) : (
                      <>
                        <DownloadCloud size={17} />
                        Trigger Dhan Synchronization
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar Guide */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Landmark size={18} className="text-emerald-600" />
                  DhanHQ Architecture
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  AlgoTest integrates DhanHQ&apos;s REST API with local caching. Any request for historical data first checks the local PostgreSQL database. If data is missing or incomplete, the backend queries Dhan and syncs the difference into storage.
                </p>

                <div className="mt-4 space-y-2 border-t pt-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Credentials: Loaded securely from Django settings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Rate Limit Shield: Exponential backoff &amp; retry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    <span>Format: Standard Open-High-Low-Close-Volume</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
                <h3 className="font-semibold text-blue-950 flex items-center gap-2">
                  <HelpCircle size={17} className="text-blue-600" />
                  Popular Security IDs
                </h3>
                <div className="mt-3 space-y-1.5 text-xs text-blue-900">
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span>HDFC Bank</span>
                    <span className="font-mono font-bold">1333 (NSE_EQ)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span>Reliance Industries</span>
                    <span className="font-mono font-bold">2885 (NSE_EQ)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span>Tata Consultancy (TCS)</span>
                    <span className="font-mono font-bold">11536 (NSE_EQ)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span>NIFTY 50 Index</span>
                    <span className="font-mono font-bold">13 (IDX_I)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>BANKNIFTY Index</span>
                    <span className="font-mono font-bold">25 (IDX_I)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT DB CACHE */}
        {activeTab === "cache" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
                <div className="grid gap-4 sm:grid-cols-3 flex-1 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Security ID
                    </label>
                    <input
                      value={cacheSecId}
                      onChange={(e) => setCacheSecId(e.target.value)}
                      placeholder="e.g. 1333"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Timeframe
                    </label>
                    <select
                      value={cacheTimeframe}
                      onChange={(e) => setCacheTimeframe(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none"
                    >
                      <option value="1d">1d (Daily)</option>
                      <option value="1m">1m</option>
                      <option value="5m">5m</option>
                      <option value="15m">15m</option>
                      <option value="1h">1h</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={fetchCacheData}
                      disabled={cacheLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {cacheLoading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                      Inspect Database
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-xs text-gray-600 border border-gray-200">
                  Found <b className="text-gray-900 font-bold">{cacheTotal}</b> cached candles in PostgreSQL
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase text-gray-400 font-semibold border-b">
                    <tr>
                      <th className="px-5 py-3">Security ID</th>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Open</th>
                      <th className="px-5 py-3">High</th>
                      <th className="px-5 py-3">Low</th>
                      <th className="px-5 py-3">Close</th>
                      <th className="px-5 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {cacheCandles.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/75 transition">
                        <td className="px-5 py-2.5 font-semibold text-blue-600">#{cacheSecId}</td>
                        <td className="px-5 py-2.5 font-medium text-gray-800">
                          {c.timestamp ? c.timestamp.replace("T", " ").replace("Z", "") : "—"}
                        </td>
                        <td className="px-5 py-2.5">₹{Number(c.open).toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-emerald-600">₹{Number(c.high).toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-red-600">₹{Number(c.low).toFixed(2)}</td>
                        <td className="px-5 py-2.5 font-bold">₹{Number(c.close).toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-gray-500">
                          {c.volume ? Number(c.volume).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {cacheCandles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400 font-sans">
                          No cached candles found in database for Security #{cacheSecId} ({cacheTimeframe}).
                          Try syncing from Dhan in the &ldquo;Dhan Candle Synchronizer&rdquo; tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROVIDERS ARCHITECTURE */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>Registered Providers: <b>{providers.length || 2}</b></span>
              <span className="text-emerald-600 font-semibold">All engines operational</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Landmark size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">DhanHQ Provider</h3>
                      <p className="text-xs text-gray-500">Primary Market Data Feed</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {providers.find((p) => p.name === "dhan")?.status || "Active"}
                  </span>
                </div>


              <div className="mt-5 space-y-3 text-xs text-gray-600">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Rate Limit</span>
                  <span className="font-semibold text-gray-900">5 req / sec</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Supported Segments</span>
                  <span className="font-semibold text-gray-900">NSE_EQ, NSE_FNO, IDX_I, BSE_EQ</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Granularity</span>
                  <span className="font-semibold text-gray-900">1m, 5m, 15m, 25m, 1h, 1d</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Priority</span>
                  <span className="font-semibold text-gray-900">Priority 1 (Primary)</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">CSV &amp; Local Storage Provider</h3>
                    <p className="text-xs text-gray-500">Offline &amp; Historical Fallback</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                  Standby
                </span>
              </div>

              <div className="mt-5 space-y-3 text-xs text-gray-600">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Storage Engine</span>
                  <span className="font-semibold text-gray-900">PostgreSQL + Local CSV directory</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Access Latency</span>
                  <span className="font-semibold text-emerald-600">&lt; 10ms (Index optimized)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Supported Formats</span>
                  <span className="font-semibold text-gray-900">CSV, Parquet, JSON</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Priority</span>
                  <span className="font-semibold text-gray-900">Priority 2 (Fallback)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </AppShell>


  );
}
