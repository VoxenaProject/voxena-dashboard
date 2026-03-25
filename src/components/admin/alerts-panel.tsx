"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X, ArrowRight } from "lucide-react";
import type { AdminAlert } from "@/lib/dashboard/admin-stats";

// Clé localStorage pour persister les alertes dismissées (par session)
const STORAGE_KEY = "voxena-dismissed-alerts";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* Navigation privée */ }
  return new Set();
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* Navigation privée */ }
}

export function AlertsPanel({ alerts }: { alerts: AdminAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Charger les alertes dismissées depuis localStorage
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  // Créer un ID stable par alerte (titre + description)
  const alertId = (a: AdminAlert) => `${a.type}:${a.title}`;
  const visible = alerts.filter((a) => !dismissed.has(alertId(a)));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {alerts.map((alert, i) => {
          const aid = alertId(alert);
          if (dismissed.has(aid)) return null;
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
                href={alert.link || "#"}
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
                    const newSet = new Set(dismissed).add(aid);
                    setDismissed(newSet);
                    saveDismissed(newSet);
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
