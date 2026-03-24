"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface RevenueChartProps {
  data: { label: string; revenue: number; orders: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4237C4" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#4237C4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
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
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "var(--shadow-lg)",
          }}
          formatter={(value) => [`${Number(value).toFixed(0)}€`, "Revenus"]}
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#4237C4"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#4237C4" }}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
