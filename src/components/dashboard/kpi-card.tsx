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
    sparklineSaturated: "#3528b8",
    glowHover: "hover:shadow-[0_8px_25px_rgba(66,55,196,0.1),0_2px_6px_rgba(0,0,0,0.04)]",
    gradientBorder: "from-violet/25 via-blue/15 to-violet/25",
    iconGradient: "radial-gradient(circle at 30% 30%, rgba(66,55,196,0.15), rgba(66,55,196,0.06))",
  },
  green: {
    iconBg: "bg-green/10",
    iconText: "text-green",
    sparkline: "#1a9a5a",
    sparklineSaturated: "#148a4e",
    glowHover: "hover:shadow-[0_8px_25px_rgba(26,154,90,0.1),0_2px_6px_rgba(0,0,0,0.04)]",
    gradientBorder: "from-green/25 via-green-soft/15 to-green/25",
    iconGradient: "radial-gradient(circle at 30% 30%, rgba(26,154,90,0.15), rgba(26,154,90,0.06))",
  },
  blue: {
    iconBg: "bg-blue/10",
    iconText: "text-blue",
    sparkline: "#74a3ff",
    sparklineSaturated: "#5b8ef5",
    glowHover: "hover:shadow-[0_8px_25px_rgba(116,163,255,0.1),0_2px_6px_rgba(0,0,0,0.04)]",
    gradientBorder: "from-blue/25 via-violet/15 to-blue/25",
    iconGradient: "radial-gradient(circle at 30% 30%, rgba(116,163,255,0.15), rgba(116,163,255,0.06))",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
    sparkline: "#f59e0b",
    sparklineSaturated: "#d97706",
    glowHover: "hover:shadow-[0_8px_25px_rgba(245,158,11,0.1),0_2px_6px_rgba(0,0,0,0.04)]",
    gradientBorder: "from-amber-500/25 via-amber-400/15 to-amber-500/25",
    iconGradient: "radial-gradient(circle at 30% 30%, rgba(245,158,11,0.15), rgba(245,158,11,0.06))",
  },
  red: {
    iconBg: "bg-red-500/10",
    iconText: "text-red-500",
    sparkline: "#ef4444",
    sparklineSaturated: "#dc2626",
    glowHover: "hover:shadow-[0_8px_25px_rgba(239,68,68,0.1),0_2px_6px_rgba(0,0,0,0.04)]",
    gradientBorder: "from-red-500/25 via-red-400/15 to-red-500/25",
    iconGradient: "radial-gradient(circle at 30% 30%, rgba(239,68,68,0.15), rgba(239,68,68,0.06))",
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
      {/* Wrapper avec gradient border subtil */}
      <div className={`relative rounded-xl p-[1px] bg-gradient-to-br ${accent.gradientBorder} h-full`}>
        <Card
          className={`
            p-5 shadow-card transition-all duration-250 overflow-hidden relative group h-full flex flex-col
            rounded-[calc(var(--radius)*1.35)]
            hover:-translate-y-0.5 ${accent.glowHover}
          `}
          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          <div className="flex items-start justify-between mb-3">
            {/* Icône avec radial gradient au lieu de couleur plate */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: accent.iconGradient }}
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
                {/* Point pulsant : vert si positif, rouge si négatif */}
                <span
                  className={`w-1.5 h-1.5 rounded-full pulse-dot-live ${
                    trend.isPositive ? "bg-green" : "bg-destructive"
                  }`}
                />
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
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            />
          </div>

          <p className="text-xs text-muted-foreground font-medium">{title}</p>

          <div className="flex-1" />

          {sparklineData && sparklineData.length > 1 ? (
            <div className="mt-3 -mx-1 -mb-1">
              <Sparkline
                data={sparklineData}
                color={accent.sparklineSaturated}
                height={36}
              />
            </div>
          ) : (
            <div className="mt-3 h-[36px]" />
          )}
        </Card>
      </div>
    </motion.div>
  );
}
