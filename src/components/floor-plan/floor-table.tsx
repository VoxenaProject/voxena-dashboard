"use client";

import { useDraggable } from "@dnd-kit/core";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FloorTable as FloorTableType } from "@/lib/supabase/types";

interface FloorTableProps {
  table: FloorTableType & { _tempId?: string };
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

export function FloorTableElement({ table, isSelected, onSelect }: FloorTableProps) {
  const dragId = table.id || table._tempId || "unknown";

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
      {/* Chaises */}
      {chairs.map((chair, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full transition-colors",
            isSelected
              ? "bg-violet/40 border border-violet/60"
              : "bg-blue/30 border border-blue/50"
          )}
          style={{ left: chair.x, top: chair.y }}
        />
      ))}

      {/* La table elle-même */}
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center gap-0.5 border-2 transition-all",
          // Formes
          table.shape === "round" && "rounded-full",
          table.shape === "rectangle" && "rounded-lg",
          table.shape === "square" && "rounded-lg",
          // Couleurs
          isSelected
            ? "bg-violet/15 border-violet ring-2 ring-violet/30 shadow-lg"
            : "bg-blue/10 border-blue/30 hover:bg-blue/15 hover:border-blue/40",
          // Drag
          isDragging && "opacity-80 shadow-xl scale-105"
        )}
      >
        <span className="text-[10px] font-medium text-foreground/80 leading-none truncate px-1 max-w-full">
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
