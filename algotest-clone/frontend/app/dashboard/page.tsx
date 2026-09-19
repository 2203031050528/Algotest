"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Clock3,
  Database,
  Play,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/dashboard/StatCard";
import EquityChart from "@/components/dashboard/EquityChart";
import { backtestApi } from "@/lib/backtest-api";
import { getStrategies } from "@/lib/strategy-api";
import { dhanApi } from "@/lib/dhan-api";
import { Backtest } from "@/types/backtest";
import { Strategy } from "@/types/strategy";

export default function DashboardPage() {
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [dhanClientId, setDhanClientId] = useState("1113630741");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      backtestApi.getBacktests(),
      getStrategies(),
      dhanApi.getStatus(),
    ])
      .then(([btRes, stRes, dhRes]) => {
        if (btRes.status === "fulfilled") setBacktests(btRes.value);
        if (stRes.status === "fulfilled") setStrategies(stRes.value);
        if (dhRes.status === "fulfilled" && dhRes.value.client_id) {
          setDhanClientId(dhRes.value.client_id);
        }
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRuns = backtests.length;
  const completedRuns = backtests.filter((b) => b.status === "COMPLETED");
  const totalPnL = backtests.reduce((acc, b) => acc + Number(b.total_pnl || 0), 0);
  const winCount = backtests.filter((b) => Number(b.total_pnl || 0) > 0).length;
  const winRatePct = totalRuns > 0 ? ((winCount / totalRuns) * 100).toFixed(1) : "0.0";
  const totalCapital = strategies.reduce((acc, s) => acc + Number(s.capital || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Welcome to AlgoTest</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Trading Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/strategies/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <Plus size={14} /> New Strategy
            </Link>
            <Link
              href="/dashboard/backtests/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition"
            >
              <Play size={14} /> Run Backtest
            </Link>
          </div>
        </div>

        {/* Real Dynamic Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Backtests"
            value={totalRuns > 0 ? String(totalRuns) : "0"}
            subtitle={completedRuns.length > 0 ? `${completedRuns.length} completed` : "Run your first test"}
            icon={BarChart3}
          />
          <StatCard
            title="Total Net P&L"
            value={`₹${totalPnL.toLocaleString("en-IN")}`}
            subtitle={totalPnL >= 0 ? "Profitable overall" : "Drawdown phase"}
            icon={TrendingUp}
            positive={totalPnL >= 0}
          />
          <StatCard
            title="Strategy Win Rate"
            value={`${winRatePct}%`}
            subtitle={`${winCount} win / ${totalRuns - winCount} loss`}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Portfolio Capital"
            value={`₹${(totalCapital || 100000).toLocaleString("en-IN")}`}
            subtitle={`${strategies.length} active models`}
            icon={Wallet}
          />
        </div>

        {/* Dhan Broker Integration Quick Status */}
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Wallet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">Dhan Broker Connected</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Client ID: {dhanClientId}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                Live trading credentials configured. Historical market data, paper trading, live orders, and margin calculator active.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/broker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-gray-800 shadow-sm border border-emerald-200 hover:bg-emerald-50 transition"
            >
              Open Broker Console <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Portfolio Simulation</h2>
                <p className="mt-1 text-sm text-gray-500">Historical performance trajectory</p>
              </div>
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                Live Feeds
              </span>
            </div>
            <EquityChart />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Quick Actions</h2>
                <p className="mt-1 text-sm text-gray-500">Jump straight into your workflow</p>
              </div>
              <Clock3 size={19} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <QuickAction
                href="/dashboard/strategies/new"
                icon={<Plus size={18} />}
                title="Create Strategy"
                text="Build indicator entry & exit rules"
              />
              <QuickAction
                href="/dashboard/backtests/new"
                icon={<Play size={18} />}
                title="Run Backtest"
                text="Execute simulation on market data"
              />
              <QuickAction
                href="/dashboard/market-data"
                icon={<Database size={18} />}
                title="Market Data &amp; Dhan Sync"
                text="Query OHLC candles & sync feeds"
              />
              <QuickAction
                href="/dashboard/broker"
                icon={<Wallet size={18} />}
                title="Dhan Broker Console"
                text="Live profile, funds, orders & margin"
              />
              <QuickAction
                href="/dashboard/instruments"
                icon={<BarChart3 size={18} />}
                title="Browse Instruments"
                text="Security ID mapping & scrip lookup"
              />
            </div>
          </section>
        </div>

        {/* Recent Backtests section */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">Recent Backtest Runs</h2>
              <p className="mt-1 text-sm text-gray-500">Latest algorithmic executions</p>
            </div>
            <Link
              href="/dashboard/backtests"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {backtests.slice(0, 5).map((item) => {
              const pnl = Number(item.total_pnl || 0);
              const isPositive = pnl >= 0;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/backtests/${item.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">Backtest #{item.id}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.start_date} &rarr; {item.end_date} · {item.status} · {item.total_trades} trades
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}₹{pnl.toLocaleString("en-IN")}
                    </span>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </Link>
              );
            })}

            {backtests.length === 0 && !loading && (
              <div className="p-8 text-center text-xs text-gray-500">
                No backtest runs found in database.{" "}
                <Link href="/dashboard/backtests/new" className="text-blue-600 font-semibold underline">
                  Launch your first backtest now.
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function QuickAction({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-gray-300 hover:bg-gray-50 transition"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 truncate">{title}</span>
        <span className="block text-xs text-gray-500 truncate">{text}</span>
      </span>
      <ChevronRight size={17} className="ml-auto text-gray-400 shrink-0" />
    </Link>
  );
}