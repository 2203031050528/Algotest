"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EquityChartProps {
  /** Real equity curve data from backtests. Each point is a running capital value. */
  data?: { label: string; value: number }[];
  /** If true, shows a friendly empty-state instead of a flat line */
  empty?: boolean;
}

const EMPTY_PLACEHOLDER = [
  { label: "Start", value: 100000 },
];

export default function EquityChart({ data, empty }: EquityChartProps) {
  const chartData = (!data || data.length === 0) ? EMPTY_PLACEHOLDER : data;
  const isFlat = chartData.length <= 1 || empty;

  return (
    <div className="h-72 w-full">
      {isFlat ? (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center p-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-300 mb-3"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm font-medium text-gray-700">No equity data yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Run a backtest to see your portfolio simulation curve here.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111827" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#111827" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["dataMin - 5000", "dataMax + 5000"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`}
              width={52}
            />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                "Portfolio Value",
              ]}
              contentStyle={{
                backgroundColor: "#0f172a",
                borderRadius: "0.75rem",
                color: "#fff",
                fontSize: "12px",
                border: "none",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#111827"
              strokeWidth={2.5}
              fill="url(#equityFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}