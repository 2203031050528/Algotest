"use client";

import AppShell from "@/components/layout/AppShell";
import EquityChart from "@/components/dashboard/EquityChart";
import { ArrowLeft, Download, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { tradeResults } from "@/lib/mock-data";

export default function BacktestDetailPage() {
  return <AppShell><div className="space-y-6">
    <Link href="/dashboard/backtests" className="inline-flex items-center gap-2 text-sm text-gray-500"><ArrowLeft size={16}/> Backtests</Link>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">RSI Reversal</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completed</span></div><p className="mt-1 text-sm text-gray-500">NIFTY 50 · 5m · Apr 1 – Sep 18, 2026</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><Download size={16}/> Export</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ResultCard title="Final Capital" value="₹1,24,850" meta="+24.85%" positive/><ResultCard title="Total P&L" value="+₹24,850" meta="87 trades" positive/><ResultCard title="Win Rate" value="64.20%" meta="56 wins / 31 losses"/><ResultCard title="Max Drawdown" value="8.42%" meta="Peak-to-trough"/>
    </div>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Equity Curve</h2><div className="mt-4"><EquityChart/></div></section>
    <section className="rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Trades</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Symbol</th><th className="px-5 py-3">Side</th><th className="px-5 py-3">Entry</th><th className="px-5 py-3">Exit</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">P&L</th><th className="px-5 py-3">Reason</th></tr></thead><tbody className="divide-y">{tradeResults.map((t,i)=><tr key={i}><td className="px-5 py-3 font-medium">{t.symbol}</td><td className="px-5 py-3"><span className={t.side==="BUY"?"text-emerald-600":"text-red-600"}>{t.side}</span></td><td className="px-5 py-3">{t.entry}</td><td className="px-5 py-3">{t.exit}</td><td className="px-5 py-3">{t.qty}</td><td className={`px-5 py-3 font-semibold ${t.pnl>=0?"text-emerald-600":"text-red-600"}`}>{t.pnl>=0?"+":""}₹{t.pnl.toLocaleString("en-IN")}</td><td className="px-5 py-3 text-gray-500">{t.reason}</td></tr>)}</tbody></table></div></section>
  </div></AppShell>;
}
function ResultCard({title,value,meta,positive}:{title:string;value:string;meta:string;positive?:boolean}) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{title}</p><p className="mt-3 text-2xl font-bold">{value}</p><p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${positive?"text-emerald-600":"text-gray-500"}`}>{positive?<TrendingUp size={14}/>:<TrendingDown size={14}/>} {meta}</p></div>; }