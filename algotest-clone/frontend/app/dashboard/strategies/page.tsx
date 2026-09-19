"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  createStrategy,
  deleteStrategy,
  getStrategies,
} from "@/lib/strategy-api";
import { Strategy } from "@/types/strategy";

const DEFAULT_TEMPLATES = [
  {
    name: "NIFTY RSI Mean Reversion",
    symbol: "NIFTY 50",
    timeframe: "5m",
    capital: 100000,
    configuration: {
      entry_rules: [{ indicator: "RSI", period: 14, operator: "<", value: 30 }],
      exit_rules: [{ indicator: "RSI", period: 14, operator: ">", value: 65 }],
      stop_loss_pct: 1.5,
      target_pct: 3.0,
    },
  },
  {
    name: "HDFCBANK EMA Trend Follower",
    symbol: "HDFCBANK",
    timeframe: "15m",
    capital: 150000,
    configuration: {
      entry_rules: [{ indicator: "EMA", period: 20, operator: ">", value: 50 }],
      exit_rules: [{ indicator: "EMA", period: 20, operator: "<", value: 50 }],
      stop_loss_pct: 2.0,
      target_pct: 4.5,
    },
  },
  {
    name: "RELIANCE Breakout Alpha",
    symbol: "RELIANCE",
    timeframe: "1d",
    capital: 200000,
    configuration: {
      entry_rules: [{ indicator: "RSI", period: 14, operator: ">", value: 55 }],
      exit_rules: [{ indicator: "RSI", period: 14, operator: "<", value: 45 }],
      stop_loss_pct: 2.5,
      target_pct: 5.0,
    },
  },
];

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const data = await getStrategies();
      setStrategies(data);
    } catch (err) {
      console.error("Failed to load strategies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleSeedTemplate = async (template: typeof DEFAULT_TEMPLATES[0]) => {
    setSeeding(true);
    try {
      await createStrategy(template);
      await loadStrategies();
    } catch (err) {
      console.error("Failed to seed strategy template:", err);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    setDeletingId(id);
    try {
      await deleteStrategy(id);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete strategy:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Trading Strategies
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Construct algorithmic rulebooks, backtest historical simulations, and deploy with Dhan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStrategies}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/dashboard/strategies/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition"
            >
              <Plus size={16} />
              Create Strategy
            </Link>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Strategies
            </span>
            <p className="mt-2 text-3xl font-bold text-gray-900">{strategies.length}</p>
            <span className="text-xs text-gray-500">Configured rule sets</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Status
            </span>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {strategies.filter((s) => s.is_active !== false).length}
            </p>
            <span className="text-xs text-emerald-700">Ready for simulation</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Portfolio Capital
            </span>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ₹
              {strategies
                .reduce((acc, s) => acc + Number(s.capital || 0), 0)
                .toLocaleString("en-IN")}
            </p>
            <span className="text-xs text-gray-500">Across active models</span>
          </div>
        </div>

        {/* Templates Banner if 0 strategies */}
        {strategies.length === 0 && !loading && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-blue-600" size={20} />
              <h3 className="font-bold text-blue-950">Quick-Start Pre-built Strategies</h3>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed max-w-2xl">
              You haven&apos;t created any strategies in the database yet. Click any pre-configured template below to instantly seed and run backtests!
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {DEFAULT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.name}
                  className="flex flex-col justify-between rounded-xl border border-blue-200 bg-white p-4 shadow-xs"
                >
                  <div>
                    <span className="font-semibold text-xs text-gray-900 block">{tmpl.name}</span>
                    <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-700">
                      {tmpl.symbol} · {tmpl.timeframe}
                    </span>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Initial Capital: ₹{tmpl.capital.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSeedTemplate(tmpl)}
                    disabled={seeding}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Plus size={13} />
                    Add Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategies List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Configured Strategies</h2>
              <p className="text-xs text-gray-500">Manage rules, parameters, and historical test triggers</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {strategies.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-gray-50/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      {s.is_active !== false ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-mono font-medium text-gray-700">
                      {s.symbol}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-700">
                      {s.timeframe}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>
                      Capital: <b className="text-gray-900">₹{Number(s.capital).toLocaleString("en-IN")}</b>
                    </span>
                    <span>
                      Entry Rules: <b className="text-gray-900">{s.configuration?.entry_rules?.length || 0}</b>
                    </span>
                    <span>
                      Exit Rules: <b className="text-gray-900">{s.configuration?.exit_rules?.length || 0}</b>
                    </span>
                    {s.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/backtests/new?strategyId=${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition shadow-xs"
                  >
                    <Play size={13} />
                    Run Backtest
                  </Link>

                  <Link
                    href={`/dashboard/strategies/${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    View Details
                  </Link>

                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    title="Delete strategy"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {!loading && strategies.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                No strategies found in database. Create your first strategy above or choose a template!
              </div>
            )}

            {loading && (
              <div className="p-8 text-center text-sm text-gray-400">
                <RefreshCw size={18} className="mx-auto mb-2 animate-spin text-gray-400" />
                Loading strategies from database...
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}