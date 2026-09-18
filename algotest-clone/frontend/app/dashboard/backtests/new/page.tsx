"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default function NewBacktestPage() {
  const router = useRouter();
  const [strategy, setStrategy] = useState("RSI Reversal");
  function submit(e: FormEvent) { e.preventDefault(); router.push("/dashboard/backtests/1"); }

  return <AppShell><div className="mx-auto max-w-3xl space-y-6">
    <Link href="/dashboard/backtests" className="inline-flex items-center gap-2 text-sm text-gray-500"><ArrowLeft size={16}/> Backtests</Link>
    <div><h1 className="text-2xl font-bold">Run Backtest</h1><p className="mt-1 text-sm text-gray-500">Configure a historical test and review its performance.</p></div>
    <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Strategy"><select value={strategy} onChange={e=>setStrategy(e.target.value)} className="control"><option>RSI Reversal</option><option>EMA Trend</option><option>Breakout Pro</option></select></Field>
        <Field label="Instrument"><select className="control"><option>NIFTY 50</option><option>BANKNIFTY</option><option>FINNIFTY</option></select></Field>
        <Field label="Start Date"><input type="date" defaultValue="2026-04-01" className="control"/></Field>
        <Field label="End Date"><input type="date" defaultValue="2026-09-18" className="control"/></Field>
        <Field label="Initial Capital"><input type="number" defaultValue="100000" className="control"/></Field>
        <Field label="Data Source"><select className="control"><option>Stored Market Data</option><option>Dhan Historical API</option><option>CSV Upload</option></select></Field>
      </div>
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Demo mode: this button opens a sample result. The Django backtesting API will replace this mock flow.</div>
      <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white"><Play size={17}/> Run Backtest</button>
    </form>
  </div></AppShell>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label><span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>{children}</label>; }