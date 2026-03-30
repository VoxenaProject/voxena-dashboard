"use client";

import { motion } from "framer-motion";
import type { PeakHourData } from "@/lib/dashboard/analytics-stats";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const hours = Array.from({ length: 14 }, (_, i) => i + 9); // 9h-22h

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/30";
  const intensity = count / max;
  if (intensity > 0.75) return "bg-violet/80";
  if (intensity > 0.5) return "bg-violet/55";
  if (intensity > 0.25) return "bg-violet/35";
  return "bg-violet/15";
}

interface Props {
  data: PeakHourData[];
}

export function PeakHoursHeatmap({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Créer une matrice jour x heure
  const matrix: Record<string, number> = {};
  for (const d of data) {
    matrix[`${d.day}-${d.hour}`] = d.count;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header heures */}
        <div className="flex gap-1 mb-1 pl-12">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
              {h}h
            </div>
          ))}
        </div>

        {/* Grille */}
        {dayLabels.map((dayLabel, dayIndex) => (
          <div key={dayIndex} className="flex gap-1 mb-1 items-center">
            <span className="text-xs text-muted-foreground font-medium w-10 text-right pr-2 flex-shrink-0">
              {dayLabel}
            </span>
            {hours.map((hour) => {
              const count = matrix[`${dayIndex}-${hour}`] || 0;
              return (
                <motion.div
                  key={`${dayIndex}-${hour}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: dayIndex * 0.03 + (hour - 9) * 0.01, duration: 0.2 }}
                  title={`${dayLabel} ${hour}h : ${count} activité${count > 1 ? "s" : ""}`}
                  className={`flex-1 aspect-square rounded-sm cursor-default transition-colors ${getColor(count, maxCount)}`}
                />
              );
            })}
          </div>
        ))}

        {/* Légende */}
        <div className="flex items-center gap-2 mt-3 pl-12 text-[10px] text-muted-foreground">
          <span>Moins</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <div className="w-3 h-3 rounded-sm bg-violet/15" />
            <div className="w-3 h-3 rounded-sm bg-violet/35" />
            <div className="w-3 h-3 rounded-sm bg-violet/55" />
            <div className="w-3 h-3 rounded-sm bg-violet/80" />
          </div>
          <span>Plus</span>
        </div>
      </div>
    </div>
  );
}
