"use client";

import { useState, useMemo, useCallback } from "react";
import { format, subDays, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  Download,
  X,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  StickyNote,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import type { Reservation, ReservationStatus } from "@/lib/supabase/types";

// --- Types ---

interface AdminReservationListProps {
  reservations: (Reservation & { restaurants: { name: string } | null })[];
  restaurants: { id: string; name: string }[];
}

// --- Constantes ---

const PAGE_SIZE = 50;

const STATUS_OPTIONS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmée" },
  { value: "assise", label: "Assise" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
  { value: "no_show", label: "No-show" },
];

type DateRange = "today" | "7d" | "30d" | "all";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "all", label: "Tout" },
];

// Configuration des badges de statut
const statusConfig: Record<
  ReservationStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  en_attente: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-100",
    dot: "bg-amber-500",
  },
  confirmee: {
    label: "Confirmée",
    color: "text-green-700",
    bg: "bg-green-100",
    dot: "bg-green-500",
  },
  assise: {
    label: "Assise",
    color: "text-blue-700",
    bg: "bg-blue-100",
    dot: "bg-blue-500",
  },
  terminee: {
    label: "Terminée",
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  },
  annulee: {
    label: "Annulée",
    color: "text-red-700",
    bg: "bg-red-100",
    dot: "bg-red-500",
  },
  no_show: {
    label: "No-show",
    color: "text-red-900",
    bg: "bg-red-200",
    dot: "bg-red-700",
  },
};

// Couleurs par restaurant — rotation déterministe
const RESTAURANT_COLORS = [
  "bg-violet",
  "bg-blue",
  "bg-green",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function getRestaurantColor(restaurantId: string): string {
  let hash = 0;
  for (let i = 0; i < restaurantId.length; i++) {
    hash = restaurantId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return RESTAURANT_COLORS[Math.abs(hash) % RESTAURANT_COLORS.length];
}

// --- Composant principal ---

export function AdminReservationList({
  reservations,
  restaurants,
}: AdminReservationListProps) {
  // Filtres
  const [search, setSearch] = useState("");
  const [restoFilter, setRestoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(0);

  // Lignes expandées
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrage combiné
  const filtered = useMemo(() => {
    let result = reservations;

    // Filtre restaurant
    if (restoFilter) {
      result = result.filter((r) => r.restaurant_id === restoFilter);
    }

    // Filtre statut
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Filtre date (basé sur le champ date de la réservation)
    if (dateRange !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (dateRange) {
        case "today":
          cutoff = startOfDay(now);
          break;
        case "7d":
          cutoff = startOfDay(subDays(now, 7));
          break;
        case "30d":
          cutoff = startOfDay(subDays(now, 30));
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((r) =>
        isAfter(new Date(r.date + "T23:59:59"), cutoff)
      );
    }

    // Recherche texte
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(q) ||
          r.customer_phone?.includes(q) ||
          r.restaurants?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [reservations, search, restoFilter, statusFilter, dateRange]);

  // Stats chips
  const stats = useMemo(() => {
    const confirmees = filtered.filter((r) => r.status === "confirmee").length;
    const enAttente = filtered.filter((r) => r.status === "en_attente").length;
    const noShows = filtered.filter((r) => r.status === "no_show").length;
    return { total: filtered.length, confirmees, enAttente, noShows };
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedReservations = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page quand les filtres changent
  const resetPage = useCallback(() => setPage(0), []);

  // Export CSV
  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Aucune réservation à exporter");
      return;
    }

    const rows = [
      ["Date", "Heure", "Restaurant", "Client", "Téléphone", "Couverts", "Table", "Statut", "Notes"],
    ];

    for (const r of filtered) {
      rows.push([
        r.date,
        r.time_slot,
        r.restaurants?.name || "",
        r.customer_name || "",
        r.customer_phone || "",
        String(r.covers),
        r.table_id || "—",
        statusConfig[r.status]?.label || r.status,
        r.notes || "",
      ]);
    }

    const csv = rows
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxena-reservations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `${filtered.length} réservation${filtered.length > 1 ? "s" : ""} exportée${filtered.length > 1 ? "s" : ""}`
    );
  }

  // Toggle expansion d'une ligne
  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Style commun pour les selects natifs
  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat";

  return (
    <div>
      {/* Stats chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatChip label="Total" count={stats.total} />
        <StatChip label="Confirmées" count={stats.confirmees} color="green" pulsing />
        <StatChip label="En attente" count={stats.enAttente} color="amber" />
        <StatChip label="No-shows" count={stats.noShows} color="red" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Ligne 1 : recherche + selects */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nom, téléphone, restaurant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  resetPage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Restaurant */}
          <select
            value={restoFilter}
            onChange={(e) => {
              setRestoFilter(e.target.value);
              resetPage();
            }}
            className={selectClass}
          >
            <option value="">Tous les restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Statut */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReservationStatus | "");
              resetPage();
            }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ligne 2 : dates + export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Boutons dates */}
          <div className="flex items-center gap-1.5">
            {DATE_RANGES.map((dr) => (
              <Button
                key={dr.value}
                variant={dateRange === dr.value ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDateRange(dr.value);
                  resetPage();
                }}
              >
                {dr.label}
              </Button>
            ))}
          </div>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Liste des réservations */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune réservation"
          description={
            search || restoFilter || statusFilter || dateRange !== "all"
              ? "Aucun résultat avec ces filtres."
              : "Pas encore de réservations."
          }
        />
      ) : (
        <>
          {/* Tableau */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {/* En-tête tableau */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Restaurant</span>
              <span>Client</span>
              <span className="text-center">Couverts</span>
              <span>Heure</span>
              <span>Date</span>
              <span className="text-center">Statut</span>
              <span className="text-right">Créée</span>
            </div>

            {/* Lignes */}
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {paginatedReservations.map((resa, i) => (
                  <ReservationRow
                    key={resa.id}
                    reservation={resa}
                    index={i}
                    isExpanded={expandedId === resa.id}
                    onToggle={() => toggleExpand(resa.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} sur {totalPages} ({filtered.length} réservation
                {filtered.length > 1 ? "s" : ""})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="gap-1 text-xs"
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Sous-composants ---

/** Chip de statistique */
function StatChip({
  label,
  count,
  color,
  pulsing,
}: {
  label: string;
  count: number;
  color?: "green" | "amber" | "red" | "muted";
  pulsing?: boolean;
}) {
  const bgMap: Record<string, string> = {
    green: "bg-green/8 text-green border-green/20",
    amber: "bg-amber-500/8 text-amber-600 border-amber-500/20",
    red: "bg-red-500/8 text-red-500 border-red-500/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  const chipClass = color
    ? bgMap[color]
    : "bg-foreground/5 text-foreground border-border";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${chipClass}`}
    >
      {pulsing && count > 0 && <PulsingDot color="green" size="sm" />}
      {label}
      <span className="font-mono font-bold">{count}</span>
    </span>
  );
}

/** Ligne de réservation dans le tableau */
function ReservationRow({
  reservation,
  index,
  isExpanded,
  onToggle,
}: {
  reservation: Reservation & { restaurants: { name: string } | null };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = statusConfig[reservation.status];
  const restaurantColor = getRestaurantColor(reservation.restaurant_id);

  // Formater la date en français
  const formattedDate = (() => {
    try {
      return format(new Date(reservation.date + "T12:00:00"), "d MMM yyyy", {
        locale: fr,
      });
    } catch {
      return reservation.date;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      layout
    >
      {/* Ligne principale — cliquable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        {/* Vue desktop */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center">
          {/* Restaurant */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${restaurantColor}`}
            />
            <span className="text-sm font-medium truncate">
              {reservation.restaurants?.name || "—"}
            </span>
          </div>

          {/* Client */}
          <div className="min-w-0">
            <span className="text-sm truncate block">
              {reservation.customer_name || "Client anonyme"}
            </span>
            {reservation.customer_phone && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {reservation.customer_phone}
              </span>
            )}
          </div>

          {/* Couverts */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue/10 text-blue border border-blue/20">
            <Users className="w-3 h-3" />
            {reservation.covers}
          </span>

          {/* Heure */}
          <span className="font-mono text-sm font-bold tabular-nums whitespace-nowrap">
            {reservation.time_slot}
          </span>

          {/* Date */}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formattedDate}
          </span>

          {/* Statut */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.bg} ${status.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          {/* Chevron */}
          <div className="flex items-center justify-end">
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Vue mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${restaurantColor}`}
              />
              <span className="text-sm font-medium truncate">
                {reservation.customer_name || "Client anonyme"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-sm font-bold tabular-nums">
                {reservation.time_slot}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {reservation.restaurants?.name || "—"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" />
              {reservation.covers}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formattedDate}
            </span>
          </div>
        </div>
      </button>

      {/* Détails expandés */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-dashed border-border/60 bg-muted/20">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {/* Contact */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Contact
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    {reservation.customer_phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {reservation.customer_phone}
                        </span>
                      </div>
                    )}
                    {reservation.customer_email && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-xs">
                          {reservation.customer_email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Détails réservation */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Détails
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      Source :{" "}
                      <span className="font-medium text-foreground">
                        {reservation.source === "phone"
                          ? "Téléphone"
                          : reservation.source === "web"
                          ? "Web"
                          : "Manuelle"}
                      </span>
                    </div>
                    <div>
                      Durée :{" "}
                      <span className="font-medium text-foreground">
                        {reservation.duration} min
                      </span>
                    </div>
                    <div>
                      ID :{" "}
                      <span className="font-mono">
                        {reservation.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      Créée le{" "}
                      {format(
                        new Date(reservation.created_at),
                        "d MMMM yyyy 'à' HH:mm",
                        { locale: fr }
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  {reservation.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Notes
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {reservation.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
