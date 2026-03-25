"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface ProfitChartProps {
  data: { label: string; revenue: number; cost: number; profit: number }[];
}

export function ProfitChart({ data }: ProfitChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a9a5a" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#1a9a5a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => `${v}€`}
          width={55}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "var(--shadow-lg)",
          }}
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              revenue: "Revenus",
              cost: "Coûts",
            };
            return [`${Number(value).toFixed(2)}€`, labels[String(name)] || String(name)];
          }}
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#1a9a5a"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#1a9a5a" }}
          animationDuration={1200}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#costGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#f59e0b" }}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
