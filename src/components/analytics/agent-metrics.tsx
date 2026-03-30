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
import { Phone, Clock, CheckCircle, Euro } from "lucide-react";
import type { AgentMetrics } from "@/lib/dashboard/analytics-stats";

interface Props {
  data: AgentMetrics;
}

function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
      <div className="p-2 rounded-lg bg-violet/10">
        <Icon className="w-4 h-4 text-violet" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">
          {value}{suffix}
        </p>
      </div>
    </div>
  );
}

export function AgentMetricsPanel({ data }: Props) {
  const chartData = data.dailyCalls.map((d) => ({
    label: new Date(d.date + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "short" }),
    appels: d.calls,
    erreurs: d.errors,
  }));

  const avgMinutes = data.avgDurationSeconds > 0
    ? `${Math.floor(data.avgDurationSeconds / 60)}m${(data.avgDurationSeconds % 60).toString().padStart(2, "0")}s`
    : "—";

  return (
    <div className="space-y-4">
      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Appels total" value={data.totalCalls} icon={Phone} />
        <MetricCard label="Durée moyenne" value={avgMinutes} icon={Clock} />
        <MetricCard label="Taux de succès" value={data.successRate} suffix="%" icon={CheckCircle} />
        <MetricCard label="Coût total" value={data.totalCost.toFixed(2)} suffix="€" icon={Euro} />
      </div>

      {/* Chart appels par jour */}
      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4237C4" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4237C4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="appels"
              stroke="#4237C4"
              strokeWidth={2}
              fill="url(#callsGradient)"
              dot={false}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
