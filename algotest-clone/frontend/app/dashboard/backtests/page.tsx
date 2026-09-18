"use client";

import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { recentBacktests } from "@/lib/mock-data";

export default function BacktestsPage() {
  return <AppShell><div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Backtests</h1><p className="mt-1 text-sm text-gray-500">Review historical strategy runs.</p></div><Link href="/dashboard/backtests/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/> New Backtest</Link></div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="hidden grid-cols-6 gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-400 md:grid"><span>Strategy</span><span>Instrument</span><span>Date</span><span>Trades</span><span>P&L</span><span/></div>
      {recentBacktests.map((b,i)=><div key={b.id} className="grid gap-3 border-b px-5 py-4 last:border-0 md:grid-cols-6 md:items-center md:gap-4">
        <div><p className="font-semibold">{b.strategy}</p><p className="text-xs text-gray-500 md:hidden">{b.symbol} · {b.timeframe}</p></div><span className="hidden text-sm md:block">{b.symbol}</span><span className="text-sm text-gray-500">{b.date}</span><span className="text-sm">{42+i*11}</span><span className={`text-sm font-bold ${b.pnl>=0?"text-emerald-600":"text-red-600"}`}>{b.pnl>=0?"+":""}₹{b.pnl.toLocaleString("en-IN")}</span><Link href={`/dashboard/backtests/${b.id}`} className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"><Eye size={14}/> View</Link>
      </div>)}
    </div>
  </div></AppShell>;
}