"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Plus, Users, Clock, StickyNote } from "lucide-react";
import { ZONES, getZoneConfig } from "@/lib/floor-plan/zones";
import type { Reservation, ReservationStatus, FloorTable } from "@/lib/supabase/types";

// ── Configuration ──

/** Plage horaire : 11:00 -> 23:00 = 24 slots de 30 min */
const START_HOUR = 11;
const END_HOUR = 23;
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2; // 24 slots
const SLOT_WIDTH = 60; // px par slot de 30 min
const PX_PER_MIN = SLOT_WIDTH / 30; // 2px par minute
const TOTAL_WIDTH = SLOT_COUNT * SLOT_WIDTH; // 1440px
const ROW_HEIGHT = 48; // px par ligne de table
const LABEL_WIDTH = 180; // largeur colonne noms de tables
const ZONE_HEADER_HEIGHT = 32; // hauteur header zone

/** Couleurs des statuts pour les blocs Gantt */
const statusStyles: Record<
  ReservationStatus,
  { bg: string; border: string; text: string; label: string; strikethrough?: boolean; dashed?: boolean }
> = {
  en_attente: {
    bg: "bg-amber-100/80",
    border: "border-amber-400",
    text: "text-amber-900",
    label: "En attente",
  },
  confirmee: {
    bg: "bg-green-100/80",
    border: "border-green-400",
    text: "text-green-900",
    label: "Confirmee",
  },
  assise: {
    bg: "bg-blue-100/80",
    border: "border-blue-400",
    text: "text-blue-900",
    label: "Assise",
  },
  terminee: {
    bg: "bg-gray-100/80",
    border: "border-gray-300",
    text: "text-gray-600",
    label: "Terminee",
  },
  annulee: {
    bg: "bg-red-100/80",
    border: "border-red-400",
    text: "text-red-800",
    label: "Annulee",
    strikethrough: true,
  },
  no_show: {
    bg: "bg-red-200/80",
    border: "border-red-500",
    text: "text-red-900",
    label: "No-show",
    strikethrough: true,
  },
  liste_attente: {
    bg: "bg-amber-50/60",
    border: "border-amber-400",
    text: "text-amber-800",
    label: "Liste d'attente",
    dashed: true,
  },
};

/** Labels des créneaux horaires */
function generateTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
    labels.push(`${String(h).padStart(2, "0")}:30`);
  }
  return labels;
}

const TIME_LABELS = generateTimeLabels();

// ── Props ──

interface TimelineProps {
  reservations: Reservation[];
  tables: FloorTable[];
  onReservationClick?: (reservation: Reservation) => void;
  onSlotClick?: (tableId: string, time: string) => void;
}

// ── Helpers ──

/** Convertir "HH:MM" en minutes depuis START_HOUR */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

/** Convertir une position X en heure "HH:MM" arrondie aux 15 min */
function positionToTime(x: number): string {
  const totalMinutes = Math.floor(x / PX_PER_MIN);
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const hours = START_HOUR + Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  return `${String(Math.min(hours, END_HOUR)).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Grouper les tables par zone */
function groupTablesByZone(tables: FloorTable[]): { zone: string; label: string; tables: FloorTable[] }[] {
  const groups = new Map<string, FloorTable[]>();

  // Respecter l'ordre des zones défini dans ZONES
  for (const z of ZONES) {
    const zoneTables = tables.filter((t) => t.zone === z.value);
    if (zoneTables.length > 0) {
      groups.set(z.value, zoneTables);
    }
  }

  // Tables sans zone connue
  const unknownTables = tables.filter((t) => !ZONES.some((z) => z.value === t.zone));
  if (unknownTables.length > 0) {
    groups.set("autre", unknownTables);
  }

  return Array.from(groups.entries()).map(([zone, zoneTables]) => {
    const config = getZoneConfig(zone);
    return {
      zone,
      label: zone === "autre" ? "Autre" : config.label,
      tables: zoneTables.sort((a, b) => a.sort_order - b.sort_order),
    };
  });
}

// ── Composant principal ──

export function ReservationTimeline({
  reservations,
  tables,
  onReservationClick,
  onSlotClick,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  });
  const [hoveredSlot, setHoveredSlot] = useState<{ tableId: string; x: number } | null>(null);
  const [tooltip, setTooltip] = useState<{
    reservation: Reservation;
    x: number;
    y: number;
  } | null>(null);

  // Grouper les tables par zone
  const zoneGroups = useMemo(() => groupTablesByZone(tables), [tables]);

  // Index rapide : réservations par table_id
  const reservationsByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!r.table_id) continue;
      const list = map.get(r.table_id) || [];
      list.push(r);
      map.set(r.table_id, list);
    }
    return map;
  }, [reservations]);

  // Heatmap : occupation par slot de 30 min
  const occupancyHeatmap = useMemo(() => {
    const totalTables = tables.length || 1;
    return TIME_LABELS.map((_, slotIndex) => {
      const slotStart = slotIndex * 30;
      const slotEnd = slotStart + 30;
      let occupied = 0;
      for (const r of reservations) {
        if (!r.table_id || r.status === "annulee" || r.status === "no_show") continue;
        const rStart = timeToMinutes(r.time_slot);
        const rEnd = rStart + (r.duration || 90);
        if (rStart < slotEnd && rEnd > slotStart) {
          occupied++;
        }
      }
      const ratio = occupied / totalTables;
      return ratio;
    });
  }, [reservations, tables.length]);

  // Mettre a jour la ligne "maintenant" chaque minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinutes((now.getHours() - START_HOUR) * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll auto vers l'heure actuelle au montage
  useEffect(() => {
    if (scrollRef.current && nowMinutes > 0 && nowMinutes < (END_HOUR - START_HOUR) * 60) {
      const scrollTo = Math.max(0, nowMinutes * PX_PER_MIN - 200);
      scrollRef.current.scrollLeft = scrollTo;
    }
  }, [nowMinutes]);

  // Toggle zone collapse
  const toggleZone = useCallback((zone: string) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  // Clic sur zone vide d'une table
  const handleEmptyClick = useCallback(
    (tableId: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSlotClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = positionToTime(x);
      onSlotClick(tableId, time);
    },
    [onSlotClick]
  );

  // Position de la ligne "maintenant"
  const nowX = nowMinutes * PX_PER_MIN;
  const showNowLine = nowMinutes >= 0 && nowMinutes <= (END_HOUR - START_HOUR) * 60;

  return (
    <div className="w-full">
      {/* Message responsive mobile */}
      <div className="block md:hidden text-center py-8 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Vue disponible sur tablette/desktop</p>
      </div>

      {/* Timeline (hidden on mobile) */}
      <div className="hidden md:block rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="flex">
          {/* Colonne gauche : noms des tables */}
          <div
            className="flex-shrink-0 border-r bg-muted/30"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header vide au-dessus des labels (aligné avec heatmap + header) */}
            <div
              className="border-b flex items-center justify-center text-xs font-medium text-muted-foreground"
              style={{ height: ZONE_HEADER_HEIGHT + ROW_HEIGHT }}
            >
              Tables
            </div>

            {/* Liste des zones + tables */}
            {zoneGroups.map((group) => {
              const zoneConfig = getZoneConfig(group.zone);
              const isCollapsed = collapsedZones.has(group.zone);

              return (
                <div key={group.zone}>
                  {/* Header zone */}
                  <button
                    onClick={() => toggleZone(group.zone)}
                    className={`w-full flex items-center gap-2 px-3 text-xs font-semibold border-b transition-colors hover:opacity-80 cursor-pointer ${zoneConfig.color}`}
                    style={{ height: ZONE_HEADER_HEIGHT }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className={`w-2 h-2 rounded-full ${zoneConfig.dotColor}`} />
                    {group.label}
                    <span className="ml-auto text-[10px] opacity-60">
                      {group.tables.length}
                    </span>
                  </button>

                  {/* Lignes tables */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed &&
                      group.tables.map((table) => (
                        <motion.div
                          key={table.id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: ROW_HEIGHT, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center px-3 border-b overflow-hidden"
                        >
                          <span className="text-sm font-medium text-foreground truncate">
                            {table.name}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({table.capacity}p)
                          </span>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Zone principale scrollable */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: TOTAL_WIDTH, position: "relative" }}>
              {/* Heatmap d'occupation */}
              <div
                className="flex border-b"
                style={{ height: ZONE_HEADER_HEIGHT }}
              >
                {occupancyHeatmap.map((ratio, i) => {
                  let bg = "bg-green-100";
                  if (ratio > 0.7) bg = "bg-red-200";
                  else if (ratio > 0.4) bg = "bg-amber-200";
                  else if (ratio > 0.1) bg = "bg-green-200";
                  return (
                    <div
                      key={i}
                      className={`${bg} transition-colors border-r border-border/30`}
                      style={{ width: SLOT_WIDTH, height: "100%" }}
                      title={`${Math.round(ratio * 100)}% occupé`}
                    />
                  );
                })}
              </div>

              {/* Header : labels horaires */}
              <div
                className="flex border-b bg-muted/20"
                style={{ height: ROW_HEIGHT }}
              >
                {TIME_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex items-center justify-center border-r border-border/30 text-xs font-mono text-muted-foreground select-none"
                    style={{ width: SLOT_WIDTH }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Grille des tables */}
              {zoneGroups.map((group) => {
                const isCollapsed = collapsedZones.has(group.zone);
                const zoneConfig = getZoneConfig(group.zone);

                return (
                  <div key={group.zone}>
                    {/* Zone header (barre coloree) */}
                    <div
                      className={`border-b ${zoneConfig.color}`}
                      style={{ height: ZONE_HEADER_HEIGHT }}
                    />

                    {/* Lignes de chaque table */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed &&
                        group.tables.map((table, tableIndex) => {
                          const tableReservations = reservationsByTable.get(table.id) || [];

                          return (
                            <motion.div
                              key={table.id}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: ROW_HEIGHT, opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`relative border-b overflow-hidden cursor-pointer ${
                                tableIndex % 2 === 0 ? "bg-card" : "bg-muted/10"
                              }`}
                              onClick={(e) => handleEmptyClick(table.id, e)}
                              onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredSlot({ tableId: table.id, x: e.clientX - rect.left });
                              }}
                              onMouseLeave={() => setHoveredSlot(null)}
                            >
                              {/* Grille verticale subtile */}
                              {TIME_LABELS.map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute top-0 bottom-0 border-r border-border/15"
                                  style={{ left: i * SLOT_WIDTH }}
                                />
                              ))}

                              {/* Indicateur "+" au survol sur zone vide */}
                              {hoveredSlot?.tableId === table.id && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30"
                                  style={{ left: hoveredSlot.x - 8 }}
                                >
                                  <Plus className="w-4 h-4 text-violet" />
                                </div>
                              )}

                              {/* Blocs de réservation */}
                              {tableReservations.map((resa) => {
                                const style = statusStyles[resa.status];
                                const startMin = timeToMinutes(resa.time_slot);
                                const duration = resa.duration || 90;
                                const left = startMin * PX_PER_MIN;
                                const width = duration * PX_PER_MIN;

                                // Verifier que le bloc est dans la plage visible
                                if (left + width < 0 || left > TOTAL_WIDTH) return null;

                                return (
                                  <motion.div
                                    key={resa.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02, zIndex: 20 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                    className={`absolute top-1 bottom-1 rounded-md border ${style.bg} ${style.border} ${style.text} ${
                                      style.dashed ? "border-dashed border-2" : ""
                                    } px-1.5 flex items-center gap-1 overflow-hidden cursor-pointer select-none z-10`}
                                    style={{ left, width: Math.max(width, 30) }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReservationClick?.(resa);
                                    }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({
                                        reservation: resa,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top,
                                      });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                  >
                                    <span
                                      className={`text-[11px] font-medium truncate leading-tight ${
                                        style.strikethrough ? "line-through" : ""
                                      }`}
                                    >
                                      {resa.customer_name}
                                    </span>
                                    <span className="text-[10px] opacity-60 flex-shrink-0">
                                      {resa.covers}p
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Ligne "maintenant" */}
              {showNowLine && (
                <div
                  className="absolute top-0 bottom-0 z-30 pointer-events-none"
                  style={{ left: nowX }}
                >
                  {/* Triangle marqueur en haut */}
                  <div
                    className="absolute -top-0 -translate-x-1/2"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "6px solid #DC2626",
                    }}
                  />
                  {/* Ligne rouge */}
                  <div className="absolute top-1.5 bottom-0 w-[2px] bg-red-500/70 -translate-x-1/2" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip flottant */}
      <AnimatePresence>
        {tooltip && (
          <ReservationTooltip
            reservation={tooltip.reservation}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tooltip ──

function ReservationTooltip({
  reservation,
  x,
  y,
}: {
  reservation: Reservation;
  x: number;
  y: number;
}) {
  const style = statusStyles[reservation.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 pointer-events-none"
      style={{
        left: x,
        top: y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground">
            {reservation.customer_name}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {reservation.covers} couvert{reservation.covers > 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{reservation.time_slot}</span>
            <span className="opacity-60">
              ({reservation.duration || 90} min)
            </span>
          </div>
          {reservation.notes && (
            <div className="flex items-start gap-1.5 mt-1">
              <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{reservation.notes}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
