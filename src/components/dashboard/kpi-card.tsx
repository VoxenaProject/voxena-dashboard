"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Sparkline } from "@/components/charts/sparkline";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  sparklineData?: number[];
  accentColor?: "violet" | "green" | "blue" | "amber" | "red";
  delay?: number;
}

const accentColors = {
  violet: { iconText: "text-violet", iconBg: "bg-violet/10", sparkline: "#4237C4" },
  green: { iconText: "text-green", iconBg: "bg-green/10", sparkline: "#1a9a5a" },
  blue: { iconText: "text-blue", iconBg: "bg-blue/10", sparkline: "#74a3ff" },
  amber: { iconText: "text-amber-600", iconBg: "bg-amber-500/10", sparkline: "#f59e0b" },
  red: { iconText: "text-red-500", iconBg: "bg-red-500/10", sparkline: "#ef4444" },
};

export function KpiCard({
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  icon: Icon,
  trend,
  sparklineData,
  accentColor = "violet",
  delay = 0,
}: KpiCardProps) {
  const accent = accentColors[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className="h-full"
    >
      <div className="border border-border rounded-2xl p-3 sm:p-4 md:p-6 h-full flex flex-col bg-card hover:shadow-card-hover transition-shadow duration-200">
        {/* Icône + titre sur la même ligne */}
        <div className="flex items-center">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${accent.iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${accent.iconText}`} />
          </div>
          <span className="text-[11px] sm:text-xs text-muted-foreground font-normal ml-2 sm:ml-3">
            {title}
          </span>
        </div>

        {/* Valeur */}
        <div className="mt-2 sm:mt-4">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
            className="text-xl sm:text-2xl font-semibold tracking-tight"
          />
        </div>

        {/* Tendance */}
        {trend && (
          <p
            className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${
              trend.isPositive ? "text-green" : "text-red-500"
            }`}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </p>
        )}

        <div className="flex-1" />

        {/* Sparkline — masqué sur mobile */}
        {sparklineData && sparklineData.length > 1 ? (
          <div className="mt-2 sm:mt-3 -mx-1 -mb-1 hidden sm:block">
            <Sparkline
              data={sparklineData}
              color={accent.sparkline}
              height={28}
            />
          </div>
        ) : (
          <div className="mt-2 sm:mt-3 h-0 sm:h-[28px]" />
        )}
      </div>
    </motion.div>
  );
}
