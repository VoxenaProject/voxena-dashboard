"use client";

import { motion } from "framer-motion";
import type { ReservationAnalytics } from "@/lib/dashboard/analytics-stats";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const sourceLabels: Record<string, string> = {
  manual: "Manuel",
  phone: "Téléphone (agent)",
  web: "Widget web",
  widget: "Widget web",
};

const zoneLabels: Record<string, string> = {
  salle: "Salle",
  terrasse: "Terrasse",
  bar: "Bar",
  salle_privee: "Salle privée",
  vip: "VIP",
  "non assignée": "Non assignée",
};

interface Props {
  data: ReservationAnalytics;
}

export function ReservationAnalyticsPanel({ data }: Props) {
  const maxDayCount = Math.max(...data.byDayOfWeek.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Couverts moyens */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Couverts moyens par réservation :</span>
        <span className="text-lg font-semibold tabular-nums">{data.avgCovers}</span>
      </div>

      {/* Par jour de semaine */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3">Réservations par jour de semaine</h4>
        <div className="flex items-end gap-2 h-[120px]">
          {data.byDayOfWeek.map((d, i) => {
            const heightPercent = maxDayCount > 0 ? (d.count / maxDayCount) * 100 : 0;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {d.count}
                </span>
                <motion.div
                  className="w-full rounded-t-md bg-violet/50 min-h-[3px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPercent, 4)}%` }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {dayLabels[d.day]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Par source et par zone côte à côte */}
      <div className="grid grid-cols-2 gap-6">
        {/* Par source */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Par source</h4>
          <div className="space-y-1.5">
            {data.bySource.map((s) => {
              const total = data.bySource.reduce((sum, x) => sum + x.count, 0);
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.source} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate">{sourceLabels[s.source] || s.source}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-violet/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Par zone */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Par zone</h4>
          <div className="space-y-1.5">
            {data.byZone.map((z) => {
              const total = data.byZone.reduce((sum, x) => sum + x.count, 0);
              const pct = total > 0 ? Math.round((z.count / total) * 100) : 0;
              return (
                <div key={z.zone} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate">{zoneLabels[z.zone] || z.zone}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{z.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {data.bySource.length === 0 && data.byZone.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Aucune donnée de réservation pour cette période
        </p>
      )}
    </div>
  );
}
