"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X, ArrowRight } from "lucide-react";
import type { AdminAlert } from "@/lib/dashboard/admin-stats";

export function AlertsPanel({ alerts }: { alerts: AdminAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = alerts.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {alerts.map((alert, i) => {
          if (dismissed.has(i)) return null;
          const isError = alert.type === "error";
          const isWarning = alert.type === "warning";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={alert.link}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isError
                    ? "bg-red-500/6 border-red-500/15 hover:bg-red-500/10"
                    : isWarning
                    ? "bg-amber-500/6 border-amber-500/15 hover:bg-amber-500/10"
                    : "bg-blue/6 border-blue/15 hover:bg-blue/10"
                }`}
              >
                {isError ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-blue flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDismissed((prev) => new Set(prev).add(i));
                  }}
                  className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
