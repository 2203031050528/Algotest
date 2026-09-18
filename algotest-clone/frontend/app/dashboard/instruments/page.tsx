"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { instruments } from "@/lib/mock-data";

export default function InstrumentsPage() {
  const [query,setQuery] = useState("");
  const filtered = instruments.filter(i => `${i.symbol} ${i.segment} ${i.type}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell><div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Instruments</h1><p className="mt-1 text-sm text-gray-500">Search instruments available to your strategies.</p></div>
    <div className="relative max-w-xl"><Search size={18} className="absolute left-3 top-3 text-gray-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search NIFTY, BANKNIFTY, options..." className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm"/></div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="hidden grid-cols-5 gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-bold uppercase text-gray-400 md:grid"><span>Symbol</span><span>Segment</span><span>Type</span><span>Lot Size</span><span>Tick Size</span></div>{filtered.map(i=><div key={i.symbol} className="grid gap-2 border-b px-5 py-4 last:border-0 md:grid-cols-5 md:gap-4"><span className="font-semibold">{i.symbol}</span><span className="text-sm text-gray-500">{i.segment}</span><span className="text-sm">{i.type}</span><span className="text-sm">{i.lot}</span><span className="text-sm">{i.tick}</span></div>)}{filtered.length===0&&<p className="p-8 text-center text-sm text-gray-500">No instruments found.</p>}</div>
  </div></AppShell>;
}