"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  violet: {
    iconBg: "bg-violet/10",
    iconText: "text-violet",
    sparkline: "#4237C4",
  },
  green: {
    iconBg: "bg-green/10",
    iconText: "text-green",
    sparkline: "#1a9a5a",
  },
  blue: {
    iconBg: "bg-blue/10",
    iconText: "text-blue",
    sparkline: "#74a3ff",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
    sparkline: "#f59e0b",
  },
  red: {
    iconBg: "bg-red-500/10",
    iconText: "text-red-500",
    sparkline: "#ef4444",
  },
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: delay * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="h-full"
    >
      <Card className="p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden relative group h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-9 h-9 rounded-xl ${accent.iconBg} flex items-center justify-center`}
          >
            <Icon className={`w-4.5 h-4.5 ${accent.iconText}`} />
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.isPositive
                  ? "text-green bg-green/8"
                  : "text-destructive bg-destructive/8"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        <div className="mb-1">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
            className="font-heading text-2xl font-bold tracking-tight"
          />
        </div>

        <p className="text-xs text-muted-foreground font-medium">{title}</p>

        <div className="flex-1" />

        {sparklineData && sparklineData.length > 1 ? (
          <div className="mt-3 -mx-1 -mb-1">
            <Sparkline
              data={sparklineData}
              color={accent.sparkline}
              height={36}
            />
          </div>
        ) : (
          <div className="mt-3 h-[36px]" />
        )}
      </Card>
    </motion.div>
  );
}
