"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3, ChevronRight, Clock3, Play, Plus, TrendingUp, Wallet } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/dashboard/StatCard";
import EquityChart from "@/components/dashboard/EquityChart";
import { recentBacktests } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm text-gray-500">Good evening</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1></div>
          <Link href="/dashboard/backtests/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"><Plus size={17}/> New Backtest</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Backtests" value="24" subtitle="+6 this month" icon={BarChart3}/>
          <StatCard title="Total P&L" value="₹12,450" subtitle="+12.8% overall" icon={TrendingUp} positive/>
          <StatCard title="Win Rate" value="64.2%" subtitle="87 total trades" icon={ArrowUpRight}/>
          <StatCard title="Capital" value="₹1,00,000" subtitle="Active portfolio" icon={Wallet}/>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-semibold">Portfolio Equity</h2><p className="mt-1 text-sm text-gray-500">Sample performance across your backtests</p></div>
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">6 Months</span>
            </div>
            <EquityChart/>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Quick Actions</h2><p className="mt-1 text-sm text-gray-500">Jump into your workflow</p></div><Clock3 size={19} className="text-gray-400"/></div>
            <div className="space-y-3">
              <QuickAction href="/dashboard/strategies/new" icon={<Plus size={18}/>} title="Create Strategy" text="Build entry and exit rules"/>
              <QuickAction href="/dashboard/backtests/new" icon={<Play size={18}/>} title="Run Backtest" text="Test a strategy on market data"/>
              <QuickAction href="/dashboard/instruments" icon={<BarChart3 size={18}/>} title="Browse Instruments" text="Search available symbols"/>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold">Recent Backtests</h2><p className="mt-1 text-sm text-gray-500">Your latest strategy runs</p></div><Link href="/dashboard/backtests" className="text-sm font-semibold hover:text-gray-600">View all</Link></div>
          <div className="divide-y divide-gray-100">
            {recentBacktests.map((item) => (
              <Link key={item.id} href={`/dashboard/backtests/${item.id}`} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium">{item.strategy}</p><p className="mt-1 text-xs text-gray-500">{item.symbol} · {item.timeframe} · {item.date}</p></div>
                <div className="flex items-center gap-5"><span className={`text-sm font-bold ${item.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>{item.pnl >= 0 ? "+" : ""}₹{item.pnl.toLocaleString("en-IN")}</span><ChevronRight size={18} className="text-gray-400"/></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-gray-300 hover:bg-gray-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">{icon}</span><span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-gray-500">{text}</span></span><ChevronRight size={17} className="ml-auto text-gray-400"/></Link>;
}