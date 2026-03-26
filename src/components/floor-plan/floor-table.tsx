"use client";

import { useDraggable } from "@dnd-kit/core";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getZoneConfig } from "@/lib/floor-plan/zones";
import type { FloorTable as FloorTableType } from "@/lib/supabase/types";

interface FloorTableProps {
  table: FloorTableType & { _tempId?: string };
  zone?: string;
  isSelected: boolean;
  onSelect: () => void;
}

// Générer les positions des chaises autour de la table
function getChairPositions(
  shape: string,
  capacity: number,
  width: number,
  height: number
): { x: number; y: number }[] {
  const chairs: { x: number; y: number }[] = [];
  const chairSize = 8;
  const offset = 6; // Distance du bord de la table

  if (shape === "round") {
    // Chaises en cercle autour
    const radius = width / 2 + offset + chairSize / 2;
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < capacity; i++) {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      chairs.push({
        x: cx + radius * Math.cos(angle) - chairSize / 2,
        y: cy + radius * Math.sin(angle) - chairSize / 2,
      });
    }
  } else {
    // Rectangle ou carré : distribuer sur les côtés
    const perSide = Math.ceil(capacity / 4);
    const sides = [
      { count: Math.min(perSide, capacity), side: "top" },
      { count: Math.min(perSide, Math.max(0, capacity - perSide)), side: "bottom" },
      { count: Math.min(perSide, Math.max(0, capacity - perSide * 2)), side: "left" },
      { count: Math.min(perSide, Math.max(0, capacity - perSide * 3)), side: "right" },
    ];

    // Redistribuer plus équitablement
    let remaining = capacity;
    const distribution = { top: 0, bottom: 0, left: 0, right: 0 };
    const sideOrder: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom", "left", "right"];
    let idx = 0;
    while (remaining > 0) {
      distribution[sideOrder[idx % 4]]++;
      remaining--;
      idx++;
    }

    // Top
    for (let i = 0; i < distribution.top; i++) {
      const spacing = width / (distribution.top + 1);
      chairs.push({ x: spacing * (i + 1) - chairSize / 2, y: -offset - chairSize });
    }
    // Bottom
    for (let i = 0; i < distribution.bottom; i++) {
      const spacing = width / (distribution.bottom + 1);
      chairs.push({ x: spacing * (i + 1) - chairSize / 2, y: height + offset });
    }
    // Left
    for (let i = 0; i < distribution.left; i++) {
      const spacing = height / (distribution.left + 1);
      chairs.push({ x: -offset - chairSize, y: spacing * (i + 1) - chairSize / 2 });
    }
    // Right
    for (let i = 0; i < distribution.right; i++) {
      const spacing = height / (distribution.right + 1);
      chairs.push({ x: width + offset, y: spacing * (i + 1) - chairSize / 2 });
    }

    // Ignorer les côtés non utilisés
    void sides;
  }

  return chairs;
}

// Couleurs de fond subtiles selon la zone (en inline pour le tint léger)
const zoneTintMap: Record<string, string> = {
  salle: "rgba(59, 130, 246, 0.06)",
  terrasse: "rgba(16, 185, 129, 0.06)",
  bar: "rgba(245, 158, 11, 0.06)",
  salle_privee: "rgba(139, 92, 246, 0.06)",
  vip: "rgba(234, 179, 8, 0.06)",
};

export function FloorTableElement({ table, zone, isSelected, onSelect }: FloorTableProps) {
  const dragId = table.id || table._tempId || "unknown";
  const zoneConfig = getZoneConfig(zone || table.zone || "salle");

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
    });

  const style: React.CSSProperties = {
    position: "absolute",
    left: table.x,
    top: table.y,
    width: table.width,
    height: table.height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  const chairs = getChairPositions(table.shape, table.capacity, table.width, table.height);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="group"
    >
      {/* Chaises — légèrement plus grandes avec ombre */}
      {chairs.map((chair, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2.5 h-2.5 rounded-full transition-all duration-150",
            isSelected
              ? "bg-violet/50 border border-violet/70 shadow-[0_1px_3px_rgba(66,55,196,0.2)]"
              : "bg-blue/30 border border-blue/50 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          )}
          style={{ left: chair.x - 0.25, top: chair.y - 0.25 }}
        />
      ))}

      {/* La table elle-même — premium avec shadow + hover lift */}
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-150 relative shadow-md",
          // Formes
          table.shape === "round" && "rounded-full",
          table.shape === "rectangle" && "rounded-lg",
          table.shape === "square" && "rounded-lg",
          // Couleurs + effects
          isSelected
            ? "bg-violet/15 border-violet ring-2 ring-violet/40 floor-table-selected-glow"
            : "border-blue/30 hover:border-blue/40 floor-table-hover",
          // Drag
          isDragging && "opacity-80 shadow-xl scale-105"
        )}
        style={
          !isSelected
            ? { backgroundColor: zoneTintMap[zone || table.zone || "salle"] || zoneTintMap.salle }
            : undefined
        }
      >
        {/* Indicateur de zone (point colore en haut a droite) */}
        <span
          className={cn(
            "absolute w-2.5 h-2.5 rounded-full border border-white/80 shadow-sm",
            zoneConfig.dotColor,
            table.shape === "round" ? "top-1 right-1" : "top-1 right-1"
          )}
        />

        {/* Nom de table avec backdrop blur pour lisibilite */}
        <span className="text-[10px] font-medium text-foreground/80 leading-none truncate px-1.5 max-w-full table-name-backdrop rounded-sm">
          {table.name}
        </span>
        <div className="flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground font-mono">
            {table.capacity}
          </span>
        </div>
      </div>
    </div>
  );
}
