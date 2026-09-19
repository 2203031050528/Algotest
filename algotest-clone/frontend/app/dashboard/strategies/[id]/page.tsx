"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Sliders,
  Trash2,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { deleteStrategy, getStrategy } from "@/lib/strategy-api";
import { Strategy } from "@/types/strategy";

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getStrategy(Number(id))
      .then((data) => setStrategy(data))
      .catch((err) => {
        console.error("Failed to load strategy:", err);
        setError("Strategy not found or unauthorized.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm("Delete this strategy?")) return;
    try {
      await deleteStrategy(Number(id));
      router.push("/dashboard/strategies");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href="/dashboard/strategies"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to Strategies
        </Link>

        {loading && (
          <div className="p-12 text-center text-sm text-gray-400">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-gray-400" />
            Loading strategy details...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        )}

        {strategy && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{strategy.name}</h1>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    {strategy.is_active !== false ? "Active" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Target Symbol: <b>{strategy.symbol}</b> · Resolution: <b>{strategy.timeframe}</b>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Delete
                </button>
                <Link
                  href={`/dashboard/backtests/new?strategyId=${strategy.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-950 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                >
                  <Play size={14} />
                  Run Backtest
                </Link>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <span className="text-xs uppercase text-gray-400 font-semibold">Allocated Capital</span>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  ₹{Number(strategy.capital).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <span className="text-xs uppercase text-gray-400 font-semibold">Stop Loss / Target</span>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {strategy.configuration?.stop_loss_pct || 2}% / {strategy.configuration?.target_pct || 4}%
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <span className="text-xs uppercase text-gray-400 font-semibold">Created Date</span>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {strategy.created_at ? new Date(strategy.created_at).toLocaleDateString() : "Today"}
                </p>
              </div>
            </div>

            {/* Rules */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sliders size={16} className="text-emerald-600" />
                  Entry Conditions
                </h3>
                <div className="space-y-2">
                  {(strategy.configuration?.entry_rules || []).map((r, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 p-3 text-xs font-mono text-gray-800 border">
                      {r.indicator} (Period: {r.period}) {r.operator} {r.value}
                    </div>
                  ))}
                  {(!strategy.configuration?.entry_rules || strategy.configuration.entry_rules.length === 0) && (
                    <p className="text-xs text-gray-400">No entry rules specified</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sliders size={16} className="text-red-600" />
                  Exit Conditions
                </h3>
                <div className="space-y-2">
                  {(strategy.configuration?.exit_rules || []).map((r, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 p-3 text-xs font-mono text-gray-800 border">
                      {r.indicator} (Period: {r.period}) {r.operator} {r.value}
                    </div>
                  ))}
                  {(!strategy.configuration?.exit_rules || strategy.configuration.exit_rules.length === 0) && (
                    <p className="text-xs text-gray-400">No exit rules specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
