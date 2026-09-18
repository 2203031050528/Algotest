"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

type Rule = { indicator: string; period: number; operator: string; value: number };

export default function NewStrategyPage() {
  const [name, setName] = useState("RSI NIFTY Strategy");
  const [entry, setEntry] = useState<Rule[]>([{ indicator: "RSI", period: 14, operator: "<", value: 30 }]);
  const [exit, setExit] = useState<Rule[]>([{ indicator: "RSI", period: 14, operator: ">", value: 60 }]);

  const addRule = (setter: React.Dispatch<React.SetStateAction<Rule[]>>) =>
    setter(prev => [...prev, { indicator: "EMA", period: 20, operator: ">", value: 0 }]);

  const updateRule = (setter: React.Dispatch<React.SetStateAction<Rule[]>>, index: number, key: keyof Rule, value: string) =>
    setter(prev => prev.map((r, i) => i === index ? { ...r, [key]: key === "period" || key === "value" ? Number(value) : value } : r));

  return <AppShell><div className="mx-auto max-w-4xl space-y-6">
    <Link href="/dashboard/strategies" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"><ArrowLeft size={16}/> Strategies</Link>
    <div><h1 className="text-2xl font-bold">Create Strategy</h1><p className="mt-1 text-sm text-gray-500">Define rules that the backtesting engine will evaluate.</p></div>

    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Basic Configuration</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Strategy Name"><input value={name} onChange={e=>setName(e.target.value)} className="control"/></Field>
        <Field label="Instrument"><select className="control"><option>NIFTY 50</option><option>BANKNIFTY</option><option>FINNIFTY</option></select></Field>
        <Field label="Timeframe"><select className="control"><option>5 Minutes</option><option>15 Minutes</option><option>1 Hour</option></select></Field>
        <Field label="Capital"><input defaultValue="100000" type="number" className="control"/></Field>
      </div>
    </section>

    <RuleSection title="Entry Conditions" rules={entry} setRules={setEntry} update={updateRule} addRule={addRule}/>
    <RuleSection title="Exit Conditions" rules={exit} setRules={setExit} update={updateRule} addRule={addRule}/>

    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Risk Management</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Stop Loss (%)"><input defaultValue="2" type="number" step="0.1" className="control"/></Field>
        <Field label="Target (%)"><input defaultValue="4" type="number" step="0.1" className="control"/></Field>
      </div>
    </section>

    <div className="flex justify-end gap-3"><Link href="/dashboard/strategies" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancel</Link><button className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white"><Save size={17}/> Save Strategy</button></div>
  </div></AppShell>;
}

function RuleSection({title,rules,setRules,update,addRule}:{title:string;rules:Rule[];setRules:React.Dispatch<React.SetStateAction<Rule[]>>;update:(s:React.Dispatch<React.SetStateAction<Rule[]>>,i:number,k:keyof Rule,v:string)=>void;addRule:(s:React.Dispatch<React.SetStateAction<Rule[]>>)=>void}) {
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2><button onClick={()=>addRule(setRules)} className="inline-flex items-center gap-1.5 text-sm font-semibold"><Plus size={16}/> Add rule</button></div>
    <div className="mt-4 space-y-3">{rules.map((r,i)=><div key={i} className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1.3fr_.8fr_.7fr_1fr_auto]">
      <select value={r.indicator} onChange={e=>update(setRules,i,"indicator",e.target.value)} className="control bg-white"><option>RSI</option><option>EMA</option><option>SMA</option></select>
      <input value={r.period} onChange={e=>update(setRules,i,"period",e.target.value)} type="number" className="control bg-white" placeholder="Period"/>
      <select value={r.operator} onChange={e=>update(setRules,i,"operator",e.target.value)} className="control bg-white"><option>&lt;</option><option>&gt;</option><option>=</option><option>&lt;=</option><option>&gt;=</option></select>
      <input value={r.value} onChange={e=>update(setRules,i,"value",e.target.value)} type="number" className="control bg-white" placeholder="Value"/>
      <button onClick={()=>setRules(prev=>prev.filter((_,idx)=>idx!==i))} className="flex items-center justify-center rounded-lg border bg-white px-3 text-red-600"><Trash2 size={16}/></button>
    </div>)}</div>
  </section>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>{children}</label>; }