"use client";

import Link from "next/link";
import { Plus, Play, MoreHorizontal } from "lucide-react";

type Strategy = {
  id: number;
  name: string;
  description: string;
  status: "Active" | "Draft";
  trades: number;
  pnl: string;
  winRate: string;
};

const strategies: Strategy[] = [
  {
    id: 1,
    name: "NIFTY Momentum",
    description: "Momentum-based intraday strategy",
    status: "Active",
    trades: 124,
    pnl: "+₹18,420",
    winRate: "68.5%",
  },
  {
    id: 2,
    name: "BANKNIFTY Breakout",
    description: "Opening range breakout strategy",
    status: "Active",
    trades: 87,
    pnl: "+₹12,850",
    winRate: "64.2%",
  },
  {
    id: 3,
    name: "EMA Crossover",
    description: "Moving average crossover strategy",
    status: "Draft",
    trades: 0,
    pnl: "₹0",
    winRate: "—",
  },
];

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategies"
        description="Create, manage and backtest your trading strategies."
        actionHref="/dashboard/strategies/new"
        action="Create Strategy"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total Strategies" value="3" />
        <Metric label="Active Strategies" value="2" />
        <Metric label="Total Trades" value="211" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Your Strategies
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your trading strategies.
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">
                    {strategy.name}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      strategy.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {strategy.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {strategy.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <Metric label="Trades" value={String(strategy.trades)} />
                <Metric label="P&L" value={strategy.pnl} />
                <Metric label="Win Rate" value={strategy.winRate} />
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/strategies/${strategy.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Play size={15} />
                  View
                </Link>

                <button
                  type="button"
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  aria-label={`More options for ${strategy.name}`}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
  actionHref,
  action,
}: {
  title: string;
  description: string;
  actionHref: string;
  action: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <Link
        href={actionHref}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
      >
        <Plus size={17} />
        {action}
      </Link>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}