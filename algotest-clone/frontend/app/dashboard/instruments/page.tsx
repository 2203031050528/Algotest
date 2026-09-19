"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { dhanApi } from "@/lib/dhan-api";
import { marketApi } from "@/lib/market-api";
import { InstrumentItem } from "@/types/dhan";
import { Candle } from "@/types/market";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function InstrumentsPage() {
  const [query, setQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string>("ALL");
  const [items, setItems] = useState<InstrumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick candle preview drawer
  const [activePreview, setActivePreview] = useState<InstrumentItem | null>(null);
  const [previewCandles, setPreviewCandles] = useState<Candle[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Quick sync action state
  const [syncingSecId, setSyncingSecId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ secId: string; msg: string; success: boolean } | null>(null);

  const fetchInstruments = (searchQuery: string) => {
    setLoading(true);
    dhanApi
      .getInstruments(searchQuery)
      .then((data) => setItems(data))
      .catch((err) => console.error("Failed to load instruments:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Open preview drawer
  const handleOpenPreview = async (item: InstrumentItem) => {
    setActivePreview(item);
    setPreviewLoading(true);
    setPreviewError(null);
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    const fromDateStr = fromDate.toISOString().split("T")[0];
    try {
      const res = await marketApi.getHistorical({
        security_id: item.security_id,
        symbol: item.symbol,
        exchange_segment: item.segment,
        instrument_type: item.type,
        timeframe: "1d",
        start_date: fromDateStr,
        end_date: toDate,
      });
      setPreviewCandles(res.results || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setPreviewError(error?.response?.data?.error || error?.message || "Failed to load candle feed.");
      setPreviewCandles([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Trigger quick sync
  const handleQuickSync = async (item: InstrumentItem) => {
    setSyncingSecId(item.security_id);
    setSyncFeedback(null);
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    const fromDateStr = fromDate.toISOString().split("T")[0];
    try {
      const res = await marketApi.syncCandles({
        security_id: item.security_id,
        exchange_segment: item.segment,
        symbol: item.symbol,
        timeframe: "1d",
        start_date: fromDateStr,
        end_date: toDate,
        instrument_type: item.type,
      });
      setSyncFeedback({
        secId: item.security_id,
        msg: `Synced ${res.synced} candles into database!`,
        success: true,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setSyncFeedback({
        secId: item.security_id,
        msg: error?.response?.data?.error || "Sync failed. Try with another timeframe.",
        success: false,
      });
    } finally {
      setSyncingSecId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedSegment === "ALL") return true;
    return item.segment.toLowerCase() === selectedSegment.toLowerCase();
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Market Instruments
              </h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                {items.length} Master Records
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Browse instruments mapped with Dhan security IDs, lot sizes, tick sizes, and historical candle feeds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/market-data"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <DownloadCloud size={14} className="text-emerald-600" />
              Open Market Data Hub
            </Link>
          </div>
        </div>

        {/* Sync feedback toast */}
        {syncFeedback && (
          <div
            className={`flex items-center justify-between rounded-xl p-3 text-xs border ${
              syncFeedback.success
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{syncFeedback.msg}</span>
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-gray-500 hover:text-gray-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search size={17} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol, security ID, or name (e.g. HDFC, 1333, NIFTY)..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Segment Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Segments" },
              { id: "NSE_EQ", label: "NSE Equity" },
              { id: "IDX_I", label: "Indices" },
              { id: "NSE_FNO", label: "F&O" },
              { id: "BSE_EQ", label: "BSE" },
            ].map((seg) => (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSegment === seg.id
                    ? "bg-gray-950 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 md:grid">
            <span className="col-span-3">Symbol &amp; Name</span>
            <span className="col-span-2">Dhan Sec ID</span>
            <span className="col-span-2">Segment / Type</span>
            <span className="col-span-2">Lot &amp; Tick</span>
            <span className="col-span-3 text-right">Actions</span>
          </div>

          {filteredItems.map((i) => (
            <div
              key={i.security_id + i.symbol}
              className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-0 md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50/50 transition"
            >
              {/* Symbol & Name */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{i.symbol}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                    {i.trading_symbol}
                  </span>
                </div>
                {i.name && <p className="mt-0.5 text-xs text-gray-500 truncate">{i.name}</p>}
              </div>

              {/* Sec ID */}
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  #{i.security_id}
                </span>
              </div>

              {/* Segment / Type */}
              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-800">{i.segment}</div>
                <div className="text-[11px] text-gray-500">{i.type}</div>
              </div>

              {/* Lot & Tick */}
              <div className="col-span-2 text-xs">
                <div>Lot: <span className="font-semibold text-gray-800">{i.lot}</span></div>
                <div className="text-gray-500">Tick: ₹{i.tick}</div>
              </div>

              {/* Actions */}
              <div className="col-span-3 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenPreview(i)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  title="View Historical Chart"
                >
                  <BarChart3 size={13} />
                  Chart
                </button>

                <button
                  onClick={() => handleQuickSync(i)}
                  disabled={syncingSecId === i.security_id}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  title="Sync Candles from Dhan"
                >
                  <DownloadCloud size={13} className={syncingSecId === i.security_id ? "animate-spin" : ""} />
                  Sync
                </button>

                <Link
                  href={`/dashboard/broker?secId=${i.security_id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  title="Calculate Margin"
                >
                  <Calculator size={13} />
                </Link>
              </div>
            </div>
          ))}

          {!loading && filteredItems.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-500">
              No matching instruments found.
            </p>
          )}

          {loading && items.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-400">Loading master instruments...</p>
          )}
        </div>

        {/* Historical preview drawer */}
        {activePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{activePreview.symbol}</h2>
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      #{activePreview.security_id}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {activePreview.segment}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Historical Daily OHLC Series from Market Data Provider
                  </p>
                </div>
                <button
                  onClick={() => setActivePreview(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                >
                  <X size={18} />
                </button>
              </div>

              {previewLoading && (
                <div className="py-16 text-center text-sm text-gray-500">
                  <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-gray-400" />
                  Fetching historical candle feed...
                </div>
              )}

              {previewError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <p className="font-semibold">Notice: {previewError}</p>
                  <p className="mt-1">
                    You can synchronize live candles for this symbol using the &ldquo;Sync&rdquo; button.
                  </p>
                </div>
              )}

              {!previewLoading && previewCandles.length > 0 && (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={previewCandles.map((c) => ({
                          time: c.timestamp ? c.timestamp.split("T")[0] : "",
                          close: Number(c.close),
                        }))}
                      >
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
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
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "0.5rem",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="close"
                          stroke="#059669"
                          strokeWidth={2}
                          fill="url(#chartGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
                    <span>Candles: <b>{previewCandles.length}</b></span>
                    <Link
                      href={`/dashboard/backtests/new`}
                      className="inline-flex items-center gap-1 font-semibold text-gray-900 hover:underline"
                    >
                      Run backtest on this symbol <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}