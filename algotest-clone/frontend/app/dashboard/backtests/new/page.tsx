"use client";
import { Suspense, useEffect, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  DownloadCloud,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { backtestApi } from "@/lib/backtest-api";
import { createStrategy, getStrategies } from "@/lib/strategy-api";
import { marketApi } from "@/lib/market-api";
import { Strategy } from "@/types/strategy";

export default function NewBacktestPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="py-20 text-center text-sm text-gray-500">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-gray-400" />
            Loading backtest configuration...
          </div>
        </AppShell>
      }
    >
      <NewBacktestContent />
    </Suspense>
  );
}

function NewBacktestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStrategyId = searchParams.get("strategyId");


  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [dataSource, setDataSource] = useState<"stored" | "dhan">("stored");

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingSample, setCreatingSample] = useState(false);

  const loadStrategies = async () => {
    try {
      const list = await getStrategies();
      setStrategies(list);
      if (list.length > 0) {
        if (preselectedStrategyId) {
          const match = list.find((s) => s.id === Number(preselectedStrategyId));
          if (match) setSelectedStrategyId(match.id);
          else setSelectedStrategyId(list[0].id);
        } else {
          setSelectedStrategyId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load strategies:", err);
    }
  };

  useEffect(() => {
    loadStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedStrategyId]);



  const handleCreateSampleStrategy = async () => {
    setCreatingSample(true);
    setError(null);
    try {
      const sample = await createStrategy({
        name: "HDFCBANK Daily Momentum",
        symbol: "HDFCBANK",
        timeframe: "1d",
        capital: 100000,
        configuration: {
          entry_rules: [{ indicator: "RSI", period: 14, operator: "<", value: 40 }],
          exit_rules: [{ indicator: "RSI", period: 14, operator: ">", value: 60 }],
          stop_loss_pct: 2.0,
          target_pct: 5.0,
        },
      });
      await loadStrategies();
      setSelectedStrategyId(sample.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Failed to create sample strategy.");
    } finally {
      setCreatingSample(false);
    }
  };

  const handleSyncCandles = async () => {
    const selected = strategies.find((s) => s.id === selectedStrategyId);
    if (!selected) return;

    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      // Use HDFCBANK 1333 if default, or match symbol
      const secId = selected.symbol === "HDFCBANK" ? "1333" : "2885";
      const res = await marketApi.syncCandles({
        security_id: secId,
        exchange_segment: "NSE_EQ",
        symbol: selected.symbol,
        timeframe: selected.timeframe,
        start_date: startDate,
        end_date: endDate,
        instrument_type: "EQUITY",
      });

      setSyncMessage(
        `Successfully synced ${res.synced} candles from Dhan for ${selected.symbol} (${selected.timeframe})!`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || "Dhan synchronization failed.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStrategyId) {
      setError("Please select a valid strategy.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await backtestApi.createBacktest({
        strategy: selectedStrategyId,
        start_date: startDate,
        end_date: endDate,
        initial_capital: Number(initialCapital),
      });

      if (res.status === "FAILED") {
        setError(
          res.error_message ||
          "Backtest execution failed. Ensure historical candles exist in database for this timeframe and date range."
        );
      } else {
        router.push(`/dashboard/backtests/${res.id}`);
      }
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error_message?: string; detail?: string; error?: string } };
        message?: string;
      };
      const msg =
        e?.response?.data?.error_message ||
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Backtest failed to execute. Verify market candles exist for this range.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard/backtests"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to Backtests
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Run Strategy Backtest</h1>
          <p className="mt-1 text-sm text-gray-500">
            Execute historical candle simulations with Stop-Loss and Target order triggers.
          </p>
        </div>

        {/* Sync feedback */}
        {syncMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>Backtest Error</span>
            </div>
            <p className="text-red-800">{error}</p>

            {error.includes("No market data found") && selectedStrategy && (
              <div className="pt-2 border-t border-red-200 flex items-center justify-between">
                <span className="text-red-700">
                  Missing {selectedStrategy.symbol} ({selectedStrategy.timeframe}) candles in local DB?
                </span>
                <button
                  type="button"
                  onClick={handleSyncCandles}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <DownloadCloud size={13} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing Feed..." : "Sync Candles Now from Dhan"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Strategy selector */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Select Strategy</label>
                {strategies.length === 0 && (
                  <button
                    type="button"
                    onClick={handleCreateSampleStrategy}
                    disabled={creatingSample}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    {creatingSample ? "Creating sample..." : "Seed Default Strategy"}
                  </button>
                )}
              </div>

              {strategies.length > 0 ? (
                <select
                  value={selectedStrategyId || ""}
                  onChange={(e) => setSelectedStrategyId(Number(e.target.value))}
                  required
                  className="control bg-white"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.symbol} ({s.timeframe}) · ₹{Number(s.capital).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">
                  No strategies configured yet. Click &ldquo;Seed Default Strategy&rdquo; above or{" "}
                  <Link href="/dashboard/strategies/new" className="text-blue-600 font-semibold underline">
                    create a new strategy
                  </Link>.
                </div>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="control"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="control"
              />
            </div>

            {/* Initial Capital */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Initial Capital (₹)
              </label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                required
                className="control"
              />
            </div>

            {/* Data Source */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Data Source</label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as "stored" | "dhan")}
                className="control bg-white"
              >
                <option value="stored">PostgreSQL Time-Series Cache</option>
                <option value="dhan">DhanHQ Provider (DB First + API Fallback)</option>
              </select>
            </div>
          </div>

          {/* Strategy Details Pill */}
          {selectedStrategy && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{selectedStrategy.name}</span>
                <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-gray-800 border">
                  {selectedStrategy.symbol}
                </span>
                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700 border border-blue-200">
                  {selectedStrategy.timeframe}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncCandles}
                disabled={syncing}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <DownloadCloud size={13} className={syncing ? "animate-spin" : ""} />
                Pre-sync Dhan Candles
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedStrategyId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                Executing Backtesting Engine...
              </>
            ) : (
              <>
                <Play size={17} />
                Run Backtest
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}