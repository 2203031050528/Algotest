"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { backtestApi } from "@/lib/backtest-api";
import { Backtest } from "@/types/backtest";

export default function BacktestsPage() {
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBacktests = async () => {
    setLoading(true);
    try {
      const data = await backtestApi.getBacktests();
      setBacktests(data);
    } catch (err) {
      console.error("Failed to load backtests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBacktests();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Historical Backtests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review backtest executions, win rates, drawdowns, and trade logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadBacktests}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/dashboard/backtests/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition"
            >
              <Plus size={16} />
              New Backtest
            </Link>
          </div>
        </div>

        {/* Metric summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Runs
            </span>
            <p className="mt-2 text-3xl font-bold text-gray-900">{backtests.length}</p>
            <span className="text-xs text-gray-500">Historical simulations</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Completed
            </span>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {backtests.filter((b) => b.status === "COMPLETED").length}
            </p>
            <span className="text-xs text-emerald-700">Successful executions</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Profitable Runs
            </span>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {backtests.filter((b) => Number(b.total_pnl || 0) > 0).length}
            </p>
            <span className="text-xs text-gray-500">P&amp;L &gt; ₹0</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Cumulative P&amp;L
            </span>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ₹
              {backtests
                .reduce((acc, b) => acc + Number(b.total_pnl || 0), 0)
                .toLocaleString("en-IN")}
            </p>
            <span className="text-xs text-gray-500">Across all backtests</span>
          </div>
        </div>

        {/* Backtests List Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Simulation History</h2>
          </div>

          <div className="hidden grid-cols-12 gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 md:grid">
            <span className="col-span-3">Strategy / Run ID</span>
            <span className="col-span-2">Date Range</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1 text-center">Trades</span>
            <span className="col-span-2">Win Rate / Return</span>
            <span className="col-span-2 text-right">P&amp;L</span>
          </div>

          <div className="divide-y divide-gray-100">
            {backtests.map((b) => {
              const pnlNum = Number(b.total_pnl || 0);
              const isPositive = pnlNum >= 0;

              return (
                <div
                  key={b.id}
                  className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-0 md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50/50 transition"
                >
                  {/* Strategy & ID */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        Backtest #{b.id}
                      </span>
                      {b.strategy_symbol && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-700">
                          {b.strategy_symbol}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Capital: ₹{Number(b.initial_capital).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Date range */}
                  <div className="col-span-2 text-xs text-gray-600">
                    <div>{b.start_date}</div>
                    <div className="text-[11px] text-gray-400">&rarr; {b.end_date}</div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    {b.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                    {b.status === "RUNNING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                        <RefreshCw size={13} className="animate-spin" /> Running
                      </span>
                    )}
                    {b.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                        <AlertCircle size={13} /> Failed
                      </span>
                    )}
                    {b.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </div>

                  {/* Trades */}
                  <div className="col-span-1 text-center text-xs font-bold text-gray-700">
                    {b.total_trades}
                  </div>

                  {/* Win rate / Return */}
                  <div className="col-span-2 text-xs">
                    <div>
                      Win Rate:{" "}
                      <span className="font-semibold text-gray-900">
                        {b.win_rate !== null && b.win_rate !== undefined
                          ? `${Number(b.win_rate).toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Return:{" "}
                      <span
                        className={
                          Number(b.return_percent || 0) >= 0
                            ? "text-emerald-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {Number(b.return_percent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* PnL & Link */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}₹{pnlNum.toLocaleString("en-IN")}
                    </span>

                    <Link
                      href={`/dashboard/backtests/${b.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Eye size={13} /> View
                    </Link>
                  </div>
                </div>
              );
            })}

            {!loading && backtests.length === 0 && (
              <div className="p-12 text-center">
                <BarChart3 className="mx-auto text-gray-300 mb-3" size={36} />
                <h3 className="font-semibold text-gray-900">No backtest simulations yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Select a trading strategy, specify historical market dates, and run the algorithmic backtesting engine.
                </p>
                <Link
                  href="/dashboard/backtests/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                >
                  <Plus size={14} /> Run First Backtest
                </Link>
              </div>
            )}

            {loading && (
              <div className="p-12 text-center text-sm text-gray-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-gray-400" />
                Loading backtest runs...
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}