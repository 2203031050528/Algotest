"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  TrendingDown,
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
import { backtestApi } from "@/lib/backtest-api";
import { Backtest, BacktestTrade, EquityPoint } from "@/types/backtest";

export default function BacktestDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [equity, setEquity] = useState<EquityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.allSettled([
      backtestApi.getBacktest(id),
      backtestApi.getBacktestTrades(id),
      backtestApi.getBacktestEquity(id),
    ])
      .then(([btRes, trRes, eqRes]) => {
        if (btRes.status === "fulfilled") {
          setBacktest(btRes.value);
          if (btRes.value.trades && btRes.value.trades.length > 0) {
            setTrades(btRes.value.trades);
          }
        } else {
          setError("Failed to load backtest record.");
        }

        if (trRes.status === "fulfilled" && trRes.value.length > 0) {
          setTrades(trRes.value);
        }

        if (eqRes.status === "fulfilled" && eqRes.value.length > 0) {
          setEquity(eqRes.value);
        }
      })
      .catch((err) => {
        console.error("Error loading backtest details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleExportCSV = () => {
    if (!trades || trades.length === 0) return;
    const headers = "Symbol,Side,Entry Time,Entry Price,Exit Time,Exit Price,Quantity,P&L,Reason\n";
    const rows = trades
      .map(
        (t) =>
          `"${t.symbol}","${t.side}","${t.entry_time}","${t.entry_price}","${t.exit_time || ""}","${
            t.exit_price || ""
          }","${t.quantity}","${t.pnl}","${t.exit_reason || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${id}_trades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-sm text-gray-500">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-gray-400" />
          Loading simulation report #{id}...
        </div>
      </AppShell>
    );
  }

  if (error || !backtest) {
    return (
      <AppShell>
        <div className="space-y-4 max-w-xl mx-auto py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-900">
            <AlertCircle size={28} className="mx-auto mb-2 text-red-600" />
            <h2 className="text-lg font-bold">Simulation Not Found</h2>
            <p className="mt-1 text-xs text-red-700">{error || "Could not retrieve backtest report."}</p>
            <Link
              href="/dashboard/backtests"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white"
            >
              <ArrowLeft size={14} /> Back to Backtests
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const pnlNum = Number(backtest.total_pnl || 0);
  const isPositive = pnlNum >= 0;

  // Chart data: either from equity endpoint, or cumulative sum of trades
  let chartData = equity.map((e) => ({
    time: e.timestamp ? e.timestamp.split("T")[0] : "",
    equity: Number(e.equity),
  }));

  if (chartData.length === 0 && trades.length > 0) {
    let running = Number(backtest.initial_capital || 100000);
    chartData = trades.map((t) => {
      running += Number(t.pnl || 0);
      return {
        time: t.exit_time ? t.exit_time.split("T")[0] : t.entry_time.split("T")[0],
        equity: running,
      };
    });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/dashboard/backtests"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to Backtests
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Backtest #{backtest.id}
              </h1>

              {backtest.status === "COMPLETED" && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Completed
                </span>
              )}
              {backtest.status === "FAILED" && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200 flex items-center gap-1">
                  <AlertCircle size={13} /> Execution Failed
                </span>
              )}
              {backtest.status === "RUNNING" && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 flex items-center gap-1">
                  <RefreshCw size={13} className="animate-spin" /> In Progress
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Period: <b>{backtest.start_date}</b> &rarr; <b>{backtest.end_date}</b> · Initial
              Capital: <b>₹{Number(backtest.initial_capital).toLocaleString("en-IN")}</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={trades.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <Download size={15} /> Export Trades CSV
            </button>

            <Link
              href={`/dashboard/backtests/new?strategyId=${backtest.strategy}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition"
            >
              <Play size={14} /> Re-run Backtest
            </Link>
          </div>
        </div>

        {/* Failed error message */}
        {backtest.status === "FAILED" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={18} className="text-red-600" />
              Engine Message
            </div>
            <p className="text-xs leading-relaxed text-red-800">
              {backtest.error_message || "The backtest encountered a simulation failure."}
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/market-data"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 underline hover:text-red-800"
              >
                Go to Market Data Hub to sync candles for this symbol &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase text-gray-400 font-semibold">Final Capital</span>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              ₹
              {backtest.final_capital !== null && backtest.final_capital !== undefined
                ? Number(backtest.final_capital).toLocaleString("en-IN")
                : Number(backtest.initial_capital).toLocaleString("en-IN")}
            </p>
            <span
              className={`text-xs font-semibold flex items-center gap-1 ${
                isPositive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Number(backtest.return_percent || 0) >= 0 ? "+" : ""}
              {Number(backtest.return_percent || 0).toFixed(2)}% Overall
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase text-gray-400 font-semibold">Total Net P&amp;L</span>
            <p
              className={`mt-2 text-2xl font-bold ${
                isPositive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}₹{pnlNum.toLocaleString("en-IN")}
            </p>
            <span className="text-xs text-gray-500">{backtest.total_trades} total trades</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase text-gray-400 font-semibold">Win Rate</span>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {backtest.win_rate !== null && backtest.win_rate !== undefined
                ? `${Number(backtest.win_rate).toFixed(1)}%`
                : "—"}
            </p>
            <span className="text-xs text-gray-500">Profitable trade frequency</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs uppercase text-gray-400 font-semibold">Max Drawdown</span>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {backtest.max_drawdown !== null && backtest.max_drawdown !== undefined
                ? `${Number(backtest.max_drawdown).toFixed(2)}%`
                : "0.00%"}
            </p>
            <span className="text-xs text-gray-500">Peak-to-trough risk ratio</span>
          </div>
        </div>

        {/* Equity Curve */}
        {chartData.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Equity Curve Simulation</h2>
                <p className="text-xs text-gray-500">
                  Portfolio capital trajectory over the backtesting horizon
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["auto", "auto"]}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val.toLocaleString("en-IN")}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "0.75rem",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Portfolio Equity"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#equityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Trades Table */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Simulated Orders &amp; Executions</h2>
            <span className="text-xs text-gray-500">{trades.length} trades recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 uppercase text-gray-400 font-semibold border-b">
                <tr>
                  <th className="px-5 py-3">Symbol</th>
                  <th className="px-5 py-3">Side</th>
                  <th className="px-5 py-3">Entry Time</th>
                  <th className="px-5 py-3">Entry Price</th>
                  <th className="px-5 py-3">Exit Time</th>
                  <th className="px-5 py-3">Exit Price</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">P&amp;L (₹)</th>
                  <th className="px-5 py-3">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {trades.map((t, idx) => {
                  const tradePnl = Number(t.pnl || 0);
                  const isWin = tradePnl >= 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50/75 transition">
                      <td className="px-5 py-3 font-semibold text-gray-900 font-sans">{t.symbol}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            t.side === "BUY"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {t.entry_time ? t.entry_time.replace("T", " ").replace("Z", "") : "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold">₹{Number(t.entry_price).toFixed(2)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {t.exit_time ? t.exit_time.replace("T", " ").replace("Z", "") : "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {t.exit_price ? `₹${Number(t.exit_price).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-5 py-3">{t.quantity}</td>
                      <td
                        className={`px-5 py-3 font-bold ${
                          isWin ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isWin ? "+" : ""}₹{tradePnl.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-sans">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          {t.exit_reason || "Signal"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {trades.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-gray-400 font-sans">
                      {backtest.status === "COMPLETED"
                        ? "No trade entry conditions triggered during this simulation period."
                        : "No trades to display."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}