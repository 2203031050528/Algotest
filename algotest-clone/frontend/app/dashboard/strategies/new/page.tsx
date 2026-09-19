"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createStrategy } from "@/lib/strategy-api";
import { dhanApi } from "@/lib/dhan-api";
import { InstrumentItem } from "@/types/dhan";
import { StrategyRule } from "@/types/strategy";

export default function NewStrategyPage() {
  const router = useRouter();
  const [name, setName] = useState("RSI Momentum Strategy");
  const [symbol, setSymbol] = useState("HDFCBANK");
  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "25m" | "1h" | "1d">("5m");
  const [capital, setCapital] = useState(100000);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [target, setTarget] = useState(4.0);

  const [entry, setEntry] = useState<StrategyRule[]>([
    { indicator: "RSI", period: 14, operator: "<", value: 30 },
  ]);
  const [exit, setExit] = useState<StrategyRule[]>([
    { indicator: "RSI", period: 14, operator: ">", value: 65 },
  ]);

  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dhanApi
      .getInstruments()
      .then((items) => {
        if (items && items.length > 0) {
          setInstruments(items);
          if (!items.find((i) => i.symbol === symbol)) {
            setSymbol(items[0].symbol);
          }
        }
      })
      .catch((err) => console.error("Could not fetch instruments:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addRule = (setter: React.Dispatch<React.SetStateAction<StrategyRule[]>>) =>
    setter((prev) => [...prev, { indicator: "EMA", period: 20, operator: ">", value: 0 }]);

  const updateRule = (
    setter: React.Dispatch<React.SetStateAction<StrategyRule[]>>,
    index: number,
    key: keyof StrategyRule,
    value: string
  ) =>
    setter((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              [key]: key === "period" || key === "value" ? Number(value) : value,
            }
          : r
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = await createStrategy({
        name,
        symbol,
        timeframe,
        capital: Number(capital),
        configuration: {
          entry_rules: entry,
          exit_rules: exit,
          stop_loss_pct: Number(stopLoss),
          target_pct: Number(target),
        },
      });

      router.push(`/dashboard/strategies/${created.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; error?: string } }; message?: string };
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to create strategy. Please check required fields."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/strategies"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Strategies
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Strategy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define algorithmic rules that the backtesting engine will evaluate against historical market data.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Config */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Basic Configuration</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Strategy Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="control"
                />
              </Field>

              <Field label="Instrument Symbol">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="control bg-white"
                >
                  {instruments.length > 0 ? (
                    instruments.map((i) => (
                      <option key={i.security_id + i.symbol} value={i.symbol}>
                        {i.symbol} ({i.segment}) #{i.security_id}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="HDFCBANK">HDFCBANK</option>
                      <option value="RELIANCE">RELIANCE</option>
                      <option value="TCS">TCS</option>
                      <option value="NIFTY 50">NIFTY 50</option>
                      <option value="BANKNIFTY">BANKNIFTY</option>
                    </>
                  )}
                </select>
              </Field>

              <Field label="Timeframe">
                <select
                  value={timeframe}
                  onChange={(e) =>
                    setTimeframe(e.target.value as "1m" | "5m" | "15m" | "25m" | "1h" | "1d")
                  }
                  className="control bg-white"
                >
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="25m">25 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day (EOD)</option>
                </select>
              </Field>

              <Field label="Capital (₹)">
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  required
                  className="control"
                />
              </Field>
            </div>
          </section>

          {/* Rule sections */}
          <RuleSection
            title="Entry Conditions (BUY)"
            rules={entry}
            setRules={setEntry}
            update={updateRule}
            addRule={addRule}
          />
          <RuleSection
            title="Exit Conditions (SELL)"
            rules={exit}
            setRules={setExit}
            update={updateRule}
            addRule={addRule}
          />

          {/* Risk Management */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Risk Management &amp; Exits</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Stop Loss (%)">
                <input
                  type="number"
                  step="0.1"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="control"
                />
              </Field>
              <Field label="Profit Target (%)">
                <input
                  type="number"
                  step="0.1"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="control"
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/dashboard/strategies"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition"
            >
              <Save size={16} />
              {saving ? "Saving Strategy..." : "Save Strategy"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function RuleSection({
  title,
  rules,
  setRules,
  update,
  addRule,
}: {
  title: string;
  rules: StrategyRule[];
  setRules: React.Dispatch<React.SetStateAction<StrategyRule[]>>;
  update: (
    s: React.Dispatch<React.SetStateAction<StrategyRule[]>>,
    i: number,
    k: keyof StrategyRule,
    v: string
  ) => void;
  addRule: (s: React.Dispatch<React.SetStateAction<StrategyRule[]>>) => void;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={() => addRule(setRules)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <Plus size={15} /> Add condition
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {rules.map((r, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1.3fr_.8fr_.7fr_1fr_auto]"
          >
            <select
              value={r.indicator}
              onChange={(e) => update(setRules, i, "indicator", e.target.value)}
              className="control bg-white text-xs"
            >
              <option value="RSI">RSI (Relative Strength Index)</option>
              <option value="EMA">EMA (Exp Moving Average)</option>
              <option value="SMA">SMA (Simple Moving Avg)</option>
            </select>

            <input
              value={r.period}
              onChange={(e) => update(setRules, i, "period", e.target.value)}
              type="number"
              className="control bg-white text-xs"
              placeholder="Period"
            />

            <select
              value={r.operator}
              onChange={(e) => update(setRules, i, "operator", e.target.value)}
              className="control bg-white text-xs"
            >
              <option value="<">&lt; Less than</option>
              <option value=">">&gt; Greater than</option>
              <option value="=">= Equals</option>
              <option value="<=">&le; Less or equal</option>
              <option value=">=">&ge; Greater or equal</option>
            </select>

            <input
              value={r.value}
              onChange={(e) => update(setRules, i, "value", e.target.value)}
              type="number"
              className="control bg-white text-xs"
              placeholder="Value"
            />

            <button
              type="button"
              onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex items-center justify-center rounded-lg border bg-white px-3 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}