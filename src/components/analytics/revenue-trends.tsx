"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import type { RevenueTrend } from "@/lib/dashboard/analytics-stats";

interface Props {
  data: RevenueTrend[];
}

export function RevenueTrendsChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: new Date(d.date + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "short" }),
    revenue: d.revenue,
    orders: d.orders,
    panier: d.avgBasket,
  }));

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Comparer première et deuxième moitié de la période
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.revenue, 0);
  const secondHalf = data.slice(mid).reduce((s, d) => s + d.revenue, 0);
  const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Revenue total</p>
          <p className="text-xl font-semibold tabular-nums">{totalRevenue.toFixed(0)}€</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Commandes</p>
          <p className="text-xl font-semibold tabular-nums">{totalOrders}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Panier moyen</p>
          <p className="text-xl font-semibold tabular-nums">{avgBasket.toFixed(1)}€</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tendance</p>
          <p className={`text-xl font-semibold tabular-nums ${trend >= 0 ? "text-green" : "text-red-500"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </p>
        </div>
      </div>

      {/* Chart revenue */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a9a5a" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#1a9a5a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            interval={Math.max(0, Math.floor(chartData.length / 8))}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => `${v}€`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value).toFixed(0)}€`, "Revenus"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1a9a5a"
            strokeWidth={2}
            fill="url(#revTrendGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#1a9a5a" }}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Commandes par jour (barres) */}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            interval={Math.max(0, Math.floor(chartData.length / 8))}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [Number(value), "Commandes"]}
          />
          <Bar dataKey="orders" fill="#4237C4" radius={[3, 3, 0, 0]} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
