"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  Landmark,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { dhanApi } from "@/lib/dhan-api";
import {
  DhanFunds,
  DhanMarginResponse,
  DhanOrder,
  DhanPosition,
  DhanProfile,
  DhanStatusResponse,
} from "@/types/dhan";

export default function BrokerPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<DhanStatusResponse | null>(null);
  const [funds, setFunds] = useState<DhanFunds | null>(null);
  const [profile, setProfile] = useState<DhanProfile | null>(null);
  const [positions, setPositions] = useState<DhanPosition[]>([]);
  const [orders, setOrders] = useState<DhanOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "margin" | "positions" | "orders">("overview");

  // Margin calculator state
  const [calcSecId, setCalcSecId] = useState("1333");
  const [calcSide, setCalcSide] = useState<"BUY" | "SELL">("BUY");
  const [calcProduct, setCalcProduct] = useState("CNC");
  const [calcQty, setCalcQty] = useState(10);
  const [calcPrice, setCalcPrice] = useState(1650);
  const [calcResult, setCalcResult] = useState<DhanMarginResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, fundsRes, posRes, ordersRes] = await Promise.allSettled([
        dhanApi.getStatus(),
        dhanApi.getFunds(),
        dhanApi.getPositions(),
        dhanApi.getOrders(),
      ]);

      if (statusRes.status === "fulfilled") {
        setStatus(statusRes.value);
        if (statusRes.value.profile) {
          setProfile(statusRes.value.profile);
        }
      }

      if (fundsRes.status === "fulfilled") {
        setFunds(fundsRes.value);
      }

      if (posRes.status === "fulfilled") {
        setPositions(posRes.value);
      }

      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value);
      }
    } catch (err) {
      console.error("Failed to load broker data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCalculateMargin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcError("");
    try {
      const res = await dhanApi.calculateMargin({
        securityId: calcSecId,
        exchangeSegment: "NSE_EQ",
        transactionType: calcSide,
        productType: calcProduct,
        quantity: Number(calcQty),
        price: Number(calcPrice),
      });
      setCalcResult(res);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to calculate margin with Dhan API";
      setCalcError(msg);
    } finally {
      setCalcLoading(false);
    }
  };

  const isConnected = status?.connected ?? false;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Broker Integration
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {isConnected ? "DhanHQ Connected" : "Connecting..."}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Live broker connection for order routing, margin calculation, and account surveillance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Syncing..." : "Sync Dhan"}
            </button>
          </div>
        </div>

        {/* Credentials Status Banner */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Dhan Account{status?.client_id ? `: ${status.client_id}` : ""}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Trading API: Active (Equity)
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-blue-600" />
                    API Key & Secret: Configured
                  </span>
                  {profile?.tokenValidity && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-indigo-600" />
                      Token Valid Until: {profile.tokenValidity}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-mono font-medium text-gray-700 border border-blue-200">
                Segment: {profile?.activeSegment || "Equity"}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Available Cash
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Wallet size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">
              ₹{(funds?.availabelBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Withdrawable: ₹{(funds?.withdrawableBalance ?? 0).toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Utilized Margin
              </span>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Coins size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">
              ₹{(funds?.utilizedAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              SOD Limit: ₹{(funds?.sodLimit ?? 0).toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Collateral Amount
              </span>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">
              ₹{(funds?.collateralAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-gray-500">Pledged margin collateral</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Dhan Data Plan
              </span>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Activity size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">
              {profile?.dataPlan === "Deactive" ? "Free / Trading" : "Active Data"}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {profile?.dataPlan === "Deactive"
                ? "Live execution enabled"
                : "Full market feed enabled"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "overview"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Account Details
          </button>
          <button
            onClick={() => setActiveTab("margin")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "margin"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Live Margin Calculator
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "positions"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "orders"
                ? "border-gray-950 text-gray-950"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Account Specifications */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">Dhan API Configuration</h3>
              <p className="mt-1 text-sm text-gray-500">
                Credentials verified and loaded from backend environment.
              </p>
              <dl className="mt-5 divide-y divide-gray-100 text-sm">
                {status?.client_id && (
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Dhan Client ID</dt>
                    <dd className="font-mono font-semibold text-gray-900">{status.client_id}</dd>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <dt className="text-gray-500">Access Token (JWT)</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <CheckCircle2 size={15} />
                    {isConnected ? "Active" : "Not Configured"}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-gray-500">API Credentials</dt>
                  <dd className="font-mono text-gray-700">
                    {isConnected ? "•••••••• (Secured in backend .env)" : "Not Configured"}
                  </dd>
                </div>
                {profile?.activeSegment && (
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">Active Segment</dt>
                    <dd className="font-semibold text-gray-900">{profile.activeSegment}</dd>
                  </div>
                )}
                {profile?.ddpi && (
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">DDPI Status</dt>
                    <dd className="text-gray-700">{profile.ddpi}</dd>
                  </div>
                )}
                {profile?.mtf && (
                  <div className="flex justify-between py-3">
                    <dt className="text-gray-500">MTF Status</dt>
                    <dd className="text-gray-700">{profile.mtf}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Trading vs Data API Info */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div>
                <h3 className="font-semibold text-gray-900">Integration Capabilities</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Current permissions granted by Dhan for this API credential set.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                    <CheckCircle2 size={18} className="mt-0.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        Order Execution & Margin Calculation
                      </p>
                      <p className="text-xs text-emerald-700">
                        Full access to place orders, check funds, manage positions, and calculate margin in real time.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                    <CheckCircle2 size={18} className="mt-0.5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-950">
                        Historical Backtesting with Stored Market Data
                      </p>
                      <p className="text-xs text-blue-700">
                        High-precision historical candlestick records in the AlgoTest database are active for testing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
                    <AlertCircle size={18} className="mt-0.5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-950">
                        Dhan Historical Data Plan
                      </p>
                      <p className="text-xs text-amber-700">
                        Dhan reports Data Plan: {profile?.dataPlan || "Deactive"}. If you want to download intraday bars straight from Dhan servers, activate the Data API in your DhanHQ developer console.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>DhanHQ API v2</span>
                <a
                  href="https://dhanhq.co/docs/v2/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  Dhan Documentation <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Margin Calculator */}
        {activeTab === "margin" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">Margin Calculation</h3>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Query Dhan&apos;s official margin calculator API in real time.
              </p>

              <form onSubmit={handleCalculateMargin} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">
                    Instrument
                  </label>
                  <select
                    value={calcSecId}
                    onChange={(e) => setCalcSecId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm"
                  >
                    <option value="1333">HDFCBANK (NSE_EQ)</option>
                    <option value="2885">RELIANCE (NSE_EQ)</option>
                    <option value="11536">TCS (NSE_EQ)</option>
                    <option value="1594">INFY (NSE_EQ)</option>
                    <option value="4963">ICICIBANK (NSE_EQ)</option>
                    <option value="3045">SBIN (NSE_EQ)</option>
                    <option value="3456">TATAMOTORS (NSE_EQ)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">
                      Side
                    </label>
                    <select
                      value={calcSide}
                      onChange={(e) => setCalcSide(e.target.value as "BUY" | "SELL")}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm font-semibold"
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">
                      Product
                    </label>
                    <select
                      value={calcProduct}
                      onChange={(e) => setCalcProduct(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm font-semibold"
                    >
                      <option value="CNC">CNC (Delivery)</option>
                      <option value="INTRADAY">INTRADAY (MIS)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={calcQty}
                      onChange={(e) => setCalcQty(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={1}
                      value={calcPrice}
                      onChange={(e) => setCalcPrice(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm"
                    />
                  </div>
                </div>

                {calcError && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                    {calcError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={calcLoading}
                  className="w-full rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {calcLoading ? "Calculating..." : "Calculate Margin via Dhan"}
                </button>
              </form>
            </div>

            {/* Results Display */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
              <h3 className="font-semibold text-gray-900">Margin Breakdown</h3>
              <p className="mt-1 text-xs text-gray-500">
                Official margin computation returned by Dhan API for this order.
              </p>

              {calcResult ? (
                <div className="mt-5 space-y-5">
                  <div className="rounded-2xl bg-gray-900 p-5 text-white">
                    <span className="text-xs uppercase tracking-wider text-gray-400">
                      Total Margin Required
                    </span>
                    <div className="mt-1 text-3xl font-bold">
                      ₹{calcResult.totalMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-300">
                      <span>Leverage: {calcResult.leverage || "1X"}</span>
                      <span>•</span>
                      <span>Estimated Brokerage: ₹{calcResult.brokerage.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 p-4">
                      <span className="text-xs text-gray-500">Span Margin</span>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{calcResult.spanMargin.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4">
                      <span className="text-xs text-gray-500">Exposure Margin</span>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{calcResult.exposureMargin.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4">
                      <span className="text-xs text-gray-500">Insufficient Balance</span>
                      <p className="mt-1 text-lg font-semibold text-amber-700">
                        ₹{calcResult.insufficientBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center p-6">
                  <Calculator size={32} className="text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    No margin calculated yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Adjust quantity/price and click &ldquo;Calculate Margin via Dhan&rdquo; to test the live endpoint.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Positions */}
        {activeTab === "positions" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Active Dhan Positions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Live positions fetched directly from DhanHQ trading engine.
            </p>

            {positions.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs font-bold uppercase text-gray-400">
                    <tr>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Net Qty</th>
                      <th className="p-3">Buy Avg</th>
                      <th className="p-3">Realized PnL</th>
                      <th className="p-3">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {positions.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold">{p.tradingSymbol}</td>
                        <td className="p-3">{p.positionType}</td>
                        <td className="p-3">{p.productType}</td>
                        <td className="p-3">{p.netQty}</td>
                        <td className="p-3">₹{p.buyAvg}</td>
                        <td className={`p-3 font-semibold ${p.realizedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          ₹{p.realizedProfit}
                        </td>
                        <td className={`p-3 font-semibold ${p.unrealizedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          ₹{p.unrealizedProfit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <Activity size={32} className="text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  No open positions for today&apos;s session
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  When strategies or trades are executed on Dhan, positions appear here in real time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Orders */}
        {activeTab === "orders" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Today&apos;s Dhan Orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Orders placed or executed on your Dhan broker account.
            </p>

            {orders.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs font-bold uppercase text-gray-400">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Side</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr key={o.orderId}>
                        <td className="p-3 font-mono text-xs">{o.orderId}</td>
                        <td className="p-3 font-semibold">{o.tradingSymbol}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              o.transactionType === "BUY"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {o.transactionType}
                          </span>
                        </td>
                        <td className="p-3">{o.orderType}</td>
                        <td className="p-3">{o.quantity}</td>
                        <td className="p-3">₹{o.price}</td>
                        <td className="p-3 font-medium">{o.orderStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <Landmark size={32} className="text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  No orders placed today
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Orders submitted through manual or automated trading strategies will be listed here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
