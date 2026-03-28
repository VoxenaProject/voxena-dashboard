"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Plus,
  Phone,
  StickyNote,
  UserPlus,
  AlertTriangle,
  Hourglass,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReservationDialog } from "./reservation-dialog";
import { WalkinDialog } from "./walkin-dialog";
import { WaitlistPanel } from "./waitlist-panel";
import { getZoneConfig } from "@/lib/floor-plan/zones";
import type { Reservation, ReservationStatus, FloorTable, Customer } from "@/lib/supabase/types";
import type { DaySummary } from "@/lib/dashboard/reservation-stats";

// -- Helpers --

/** Formate un time_slot "HH:MM:SS" ou "HH:MM" en "HH:MM" pour l'affichage */
function formatTime(timeSlot: string): string {
  return timeSlot.slice(0, 5);
}

// -- Configuration --

const statusFilters: { label: string; value: string }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "en_attente" },
  { label: "Confirmées", value: "confirmee" },
  { label: "Assises", value: "assise" },
  { label: "Terminées", value: "terminee" },
  { label: "Liste d'attente", value: "liste_attente" },
];

const statusConfig: Record<
  ReservationStatus,
  { label: string; dot: string; strikethrough?: boolean; dashed?: boolean }
> = {
  en_attente: {
    label: "En attente",
    dot: "bg-amber-500",
  },
  confirmee: {
    label: "Confirmée",
    dot: "bg-green",
  },
  assise: {
    label: "Assise",
    dot: "bg-blue",
  },
  terminee: {
    label: "Terminée",
    dot: "bg-muted-foreground/30",
  },
  annulee: {
    label: "Annulée",
    dot: "bg-red-500",
    strikethrough: true,
  },
  no_show: {
    label: "No-show",
    dot: "bg-red-700",
    strikethrough: true,
  },
  liste_attente: {
    label: "Liste d'attente",
    dot: "bg-amber-400",
    dashed: true,
  },
};

/** Résolution d'occasion à partir de la colonne dédiée */
function resolveOccasion(occasion: string | null): { emoji: string; label: string } | null {
  if (!occasion) return null;
  const lower = occasion.toLowerCase();
  if (lower.includes("anniversaire")) return { emoji: "\u{1F382}", label: "Anniversaire" };
  if (lower.includes("affaires") || lower.includes("business"))
    return { emoji: "\u{1F4BC}", label: "Business" };
  if (lower.includes("rendez-vous") || lower.includes("premier"))
    return { emoji: "\u{2764}\uFE0F", label: "Rendez-vous" };
  if (lower.includes("fête") || lower.includes("fete"))
    return { emoji: "\u{1F389}", label: "Fête" };
  return { emoji: "\u{2728}", label: occasion };
}

// -- Type pour les props du hook realtime --

interface RealtimeState {
  reservations: Reservation[];
  newReservationIds: Set<string>;
  updateReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  showBanner: Reservation | null;
}

// -- Composant principal --

interface ReservationListProps {
  realtimeState: RealtimeState;
  restaurantId: string;
  tables: FloorTable[];
  selectedDate: string;
  daySummaries?: DaySummary[];
  customers?: Customer[];
}

export function ReservationList({
  realtimeState,
  restaurantId,
  tables,
  selectedDate,
  daySummaries,
  customers = [],
}: ReservationListProps) {
  const { reservations, newReservationIds, updateReservationStatus, setReservations, showBanner } =
    realtimeState;

  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [walkinDialogOpen, setWalkinDialogOpen] = useState(false);

  // Séparer les réservations en attente (section prioritaire) et les autres
  const { pendingReservations, regularReservations } = useMemo(() => {
    let result = reservations;

    // Filtre statut
    if (filter !== "all") {
      result = result.filter((r) => r.status === filter);
    }

    // Recherche texte (nom, téléphone)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          r.customer_phone?.includes(q)
      );
    }

    // Séparer en_attente du reste — seulement si on n'a pas filtré sur un statut spécifique
    const pending = result.filter((r) => r.status === "en_attente");
    const regular = result
      .filter((r) => r.status !== "en_attente")
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    return { pendingReservations: pending, regularReservations: regular };
  }, [reservations, filter, search]);

  const allFiltered = [...pendingReservations, ...regularReservations];

  // Stats
  const totalResas = reservations.length;
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const confirmedCount = reservations.filter((r) => r.status === "confirmee").length;
  const pendingCount = reservations.filter((r) => r.status === "en_attente").length;
  const noShowCount = reservations.filter((r) => r.status === "no_show").length;
  const waitlistCount = reservations.filter((r) => r.status === "liste_attente").length;
  const waitlistItems = useMemo(
    () => reservations.filter((r) => r.status === "liste_attente"),
    [reservations]
  );

  // Asseoir un client de la liste d'attente
  const handleSeatFromWaitlist = useCallback(
    async (reservationId: string, tableId: string) => {
      try {
        const res = await fetch("/api/reservations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: reservationId,
            status: "assise",
            table_id: tableId,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur");
        }

        // Mise à jour optimiste locale
        setReservations((prev) =>
          prev.map((r) =>
            r.id === reservationId
              ? { ...r, status: "assise" as ReservationStatus, table_id: tableId, waitlist_position: null, estimated_wait_minutes: null }
              : r
          )
        );

        toast.success("Client installé avec succès !");
      } catch {
        toast.error("Erreur lors de l'installation du client");
      }
    },
    [setReservations]
  );

  // Annuler une entrée de la liste d'attente
  const handleCancelWaitlist = useCallback(
    async (reservationId: string) => {
      try {
        await updateReservationStatus(reservationId, "annulee");
        toast.success("Entrée retirée de la liste d'attente");
      } catch {
        toast.error("Erreur lors de l'annulation");
      }
    },
    [updateReservationStatus]
  );

  // Ouvrir la dialog en mode "liste d'attente"
  function handleNewWaitlist() {
    setWaitlistMode(true);
    setEditingReservation(null);
    setDialogOpen(true);
  }

  // Actions rapides sur une réservation
  async function handleStatusChange(resaId: string, status: ReservationStatus) {
    try {
      await updateReservationStatus(resaId, status);
      const labels: Record<string, string> = {
        confirmee: "Réservation confirmée",
        assise: "Client installé",
        terminee: "Réservation terminée",
        annulee: "Réservation annulée",
        no_show: "Marquée no-show",
      };
      toast.success(labels[status] || "Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  }

  function handleEdit(reservation: Reservation) {
    setEditingReservation(reservation);
    setDialogOpen(true);
  }

  function handleNewReservation() {
    setWaitlistMode(false);
    setEditingReservation(null);
    setDialogOpen(true);
  }

  // Confirmer toutes les réservations en attente d'un coup
  async function handleConfirmAllPending() {
    if (pendingReservations.length === 0) return;
    setConfirmingAll(true);
    try {
      const results = await Promise.allSettled(
        pendingReservations.map((r) =>
          fetch("/api/reservations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, status: "confirmee" }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;

      // Mise à jour optimiste
      setReservations((prev) =>
        prev.map((r) =>
          r.status === "en_attente"
            ? { ...r, status: "confirmee" as ReservationStatus }
            : r
        )
      );

      toast.success(
        `${successCount} réservation${successCount > 1 ? "s" : ""} confirmée${successCount > 1 ? "s" : ""}`
      );
    } catch {
      toast.error("Erreur lors de la confirmation groupée");
    } finally {
      setConfirmingAll(false);
    }
  }

  return (
    <div>
      {/* Banner nouvelle réservation — design minimal */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-violet/20 bg-violet/[0.03] p-4 mb-4"
          >
            <p className="text-sm text-violet font-medium">
              Nouvelle réservation — {showBanner.customer_name} — {showBanner.covers} couvert{showBanner.covers > 1 ? "s" : ""} — {showBanner.date} à {formatTime(showBanner.time_slot)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bande 7 jours — design simplifié */}
      {daySummaries && daySummaries.length > 0 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {daySummaries.map((day) => {
            const isSelected = day.date === selectedDate;
            const hasReservations = day.totalReservations > 0;
            return (
              <button
                key={day.date}
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  if (day.date === today) {
                    router.push("/reservations");
                  } else {
                    router.push(`/reservations?date=${day.date}`);
                  }
                }}
                className={`
                  flex-shrink-0 flex flex-col items-center text-center px-3 py-2 rounded-xl transition-all duration-200
                  cursor-pointer min-w-[64px]
                  ${isSelected
                    ? "bg-violet/[0.06] text-violet border border-violet/20"
                    : hasReservations
                      ? "bg-muted/50 border border-transparent"
                      : "bg-transparent border border-transparent"
                  }
                `}
              >
                <span className={`text-[11px] font-medium ${
                  isSelected ? "text-violet" : "text-muted-foreground"
                }`}>
                  {day.dayShort}
                </span>
                <span className={`text-sm font-semibold ${
                  isSelected ? "text-violet" : "text-foreground"
                }`}>
                  {day.dayNumber}
                </span>
                <span className={`text-[11px] ${
                  hasReservations
                    ? isSelected ? "text-violet font-medium" : "text-foreground"
                    : "text-muted-foreground/40"
                }`}>
                  {hasReservations ? day.totalReservations : "\u00B7"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stats chips */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        <StatsChip
          icon={CalendarDays}
          label="Résas aujourd'hui"
          count={totalResas}
          color="text-violet"
          bgColor="bg-violet/6"
          active={totalResas > 0}
        />
        <StatsChip
          icon={Users}
          label="Couverts total"
          count={totalCovers}
          color="text-blue"
          bgColor="bg-blue/6"
          active={totalCovers > 0}
        />
        <StatsChip
          icon={CheckCircle2}
          label="Confirmées"
          count={confirmedCount}
          color="text-green"
          bgColor="bg-green/6"
          active={confirmedCount > 0}
        />
        <StatsChip
          icon={Clock}
          label="En attente"
          count={pendingCount}
          color="text-amber-600"
          bgColor="bg-amber-500/6"
          active={pendingCount > 0}
        />
        <StatsChip
          icon={Hourglass}
          label="Liste d'attente"
          count={waitlistCount}
          color="text-amber-700"
          bgColor="bg-amber-100/50"
          active={waitlistCount > 0}
        />
        <StatsChip
          icon={AlertCircle}
          label="No-shows"
          count={noShowCount}
          color="text-red-600"
          bgColor="bg-red-500/6"
          active={noShowCount > 0}
        />
      </div>

      {/* Barre de recherche + filtres + bouton ajout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Chercher par nom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {statusFilters.map((f) => {
              const count =
                f.value === "all"
                  ? reservations.length
                  : reservations.filter((r) => r.status === f.value).length;
              return (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                  <span className="ml-1 text-xs opacity-60">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-violet hover:bg-violet/90 text-white"
            onClick={handleNewReservation}
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle réservation
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green hover:bg-green/90 text-white"
            onClick={() => setWalkinDialogOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Walk-in
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={handleNewWaitlist}
          >
            <Hourglass className="w-3.5 h-3.5" />
            Liste d&apos;attente
          </Button>
        </div>
      </div>

      {/* Contenu : liste classique ou panel waitlist */}
      {filter === "liste_attente" ? (
        <WaitlistPanel
          waitlistItems={waitlistItems}
          tables={tables}
          onSeat={handleSeatFromWaitlist}
          onCancel={handleCancelWaitlist}
        />
      ) : (
        <div className="space-y-2">
          {allFiltered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                icon={CalendarDays}
                title={search ? "Aucun résultat" : "Aucune réservation"}
                description={
                  search
                    ? `Aucune réservation ne correspond à "${search}"`
                    : "Les nouvelles réservations apparaîtront ici en temps réel."
                }
                actionLabel="Nouvelle réservation"
                onAction={handleNewReservation}
              />
            </motion.div>
          ) : (
            <>
              {/* Section prioritaire : réservations en attente */}
              {pendingReservations.length > 0 && filter === "all" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  {/* Titre section avec point statique + bouton tout confirmer */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        À confirmer
                      </h3>
                      <span className="text-xs text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-full">
                        {pendingReservations.length}
                      </span>
                    </div>
                    {pendingReservations.length > 1 && (
                      <button
                        className="text-xs font-medium text-violet hover:text-violet/80 transition-colors disabled:opacity-50"
                        onClick={handleConfirmAllPending}
                        disabled={confirmingAll}
                      >
                        {confirmingAll ? "Confirmation..." : "Tout confirmer"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {pendingReservations.map((resa, i) => (
                        <ReservationCard
                          key={resa.id}
                          reservation={resa}
                          tables={tables}
                          index={i}
                          isNew={newReservationIds.has(resa.id)}
                          isPending
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                          customers={customers}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Réservations régulières (triées par heure) */}
              <AnimatePresence mode="popLayout">
                {regularReservations.map((resa, i) => (
                  <ReservationCard
                    key={resa.id}
                    reservation={resa}
                    tables={tables}
                    index={i}
                    isNew={newReservationIds.has(resa.id)}
                    isPending={false}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEdit}
                    customers={customers}
                  />
                ))}
              </AnimatePresence>

              {/* Si filtre "en_attente", afficher les pending dans le flux normal */}
              {filter === "en_attente" && (
                <AnimatePresence mode="popLayout">
                  {pendingReservations.map((resa, i) => (
                    <ReservationCard
                      key={resa.id}
                      reservation={resa}
                      tables={tables}
                      index={i}
                      isNew={newReservationIds.has(resa.id)}
                      isPending
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                      customers={customers}
                    />
                  ))}
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      )}

      {/* Dialog création/édition */}
      <ReservationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setWaitlistMode(false);
        }}
        restaurantId={restaurantId}
        tables={tables}
        reservation={editingReservation}
        defaultDate={selectedDate}
        forceWaitlist={waitlistMode}
        customers={customers}
      />

      {/* Dialog walk-in rapide */}
      <WalkinDialog
        open={walkinDialogOpen}
        onOpenChange={setWalkinDialogOpen}
        restaurantId={restaurantId}
      />
    </div>
  );
}

// -- Carte de réservation — Design minimal Apple-quality --

function ReservationCard({
  reservation,
  tables,
  index,
  isNew,
  isPending,
  onStatusChange,
  onEdit,
  customers = [],
}: {
  reservation: Reservation;
  tables: FloorTable[];
  index: number;
  isNew: boolean;
  isPending: boolean;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onEdit: (reservation: Reservation) => void;
  customers?: Customer[];
}) {
  const status = statusConfig[reservation.status];
  const table = tables.find((t) => t.id === reservation.table_id);
  const occasion = resolveOccasion(reservation.occasion);
  const preferences = reservation.preferences || [];
  const displayNotes = reservation.notes?.trim();
  const timeDisplay = formatTime(reservation.time_slot);

  // Historique client — match par téléphone
  const customer = reservation.customer_phone
    ? customers.find((c) => c.phone === reservation.customer_phone)
    : undefined;
  const isRecidiviste = customer?.tags?.includes("recidiviste") || customer?.tags?.includes("récidiviste");
  const customerNoShowTags = customer?.tags?.filter((t) => t === "no_show").length || 0;
  const hasNoShowHistory = isRecidiviste || customerNoShowTags > 0;

  // Zone label
  const zoneLabel = table?.zone ? getZoneConfig(table.zone).label : null;

  // Bottom row: has content?
  const hasBottomRow = occasion || (preferences.length > 0) || displayNotes || reservation.status === "en_attente" || reservation.status === "confirmee" || reservation.status === "assise";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: index * 0.03, type: "spring", damping: 25, stiffness: 300 },
      }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={`
        border rounded-2xl p-5 transition-shadow duration-200 cursor-pointer
        hover:shadow-card-hover
        ${isNew ? "ring-1 ring-violet/30" : ""}
        ${isPending ? "border-amber-200" : "border-border"}
      `}
      onClick={() => onEdit(reservation)}
    >
      {/* Row 1 — heure, couverts, zone */}
      <div className="flex items-center">
        <span className="text-sm font-mono font-semibold">
          {timeDisplay}
        </span>
        <span className="text-xs text-muted-foreground ml-4 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {reservation.covers} couvert{reservation.covers > 1 ? "s" : ""}
        </span>
        {zoneLabel && (
          <span className="text-xs text-muted-foreground ml-auto">
            {zoneLabel}
          </span>
        )}
        {!zoneLabel && table && (
          <span className="text-xs text-muted-foreground ml-auto">
            {table.name}
          </span>
        )}
      </div>

      {/* Row 2 — nom + statut */}
      <div className="mt-3 flex justify-between items-center">
        <span className={`text-base font-medium ${status.strikethrough ? "line-through opacity-60" : ""}`}>
          {reservation.customer_name}
        </span>
        <span className="flex items-center">
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span className="text-xs text-muted-foreground ml-2">
            {status.label}
          </span>
        </span>
      </div>

      {/* Row 3 — téléphone + historique client */}
      <div className="mt-1 flex items-center gap-3">
        {reservation.customer_phone && (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {reservation.customer_phone}
          </span>
        )}
        {customer && customer.visit_count > 1 && (
          <span className="text-xs text-muted-foreground/50">
            {customer.visit_count}ème visite
          </span>
        )}
        {reservation.status === "no_show" && hasNoShowHistory && (
          <span className="text-xs text-red-600/70 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Récidiviste
          </span>
        )}
      </div>

      {/* Row 4 — occasion, préférences, notes, actions */}
      {hasBottomRow && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {occasion && (
              <span className="text-xs text-muted-foreground">
                {occasion.emoji} {occasion.label}
              </span>
            )}
            {preferences.length > 0 && (
              <span className="text-xs text-muted-foreground/50 truncate">
                {preferences.join(", ")}
              </span>
            )}
            {displayNotes && (
              <span className="text-xs text-muted-foreground/50 italic truncate max-w-[200px] flex items-center gap-1">
                <StickyNote className="w-3 h-3 flex-shrink-0" />
                {displayNotes}
              </span>
            )}
          </div>

          {/* Actions — text buttons */}
          <div
            className="flex items-center gap-3 flex-shrink-0 ml-3"
            onClick={(e) => e.stopPropagation()}
          >
            {reservation.status === "en_attente" && (
              <>
                <button
                  className="text-xs font-medium text-violet hover:text-violet/80 transition-colors"
                  onClick={() => onStatusChange(reservation.id, "confirmee")}
                >
                  Confirmer
                </button>
                <button
                  className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                  onClick={() => onStatusChange(reservation.id, "annulee")}
                >
                  Annuler
                </button>
              </>
            )}

            {reservation.status === "confirmee" && (
              <>
                <button
                  className="text-xs font-medium text-violet hover:text-violet/80 transition-colors"
                  onClick={() => onStatusChange(reservation.id, "assise")}
                >
                  Asseoir &rarr;
                </button>
                <button
                  className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                  onClick={() => onStatusChange(reservation.id, "annulee")}
                >
                  Annuler
                </button>
              </>
            )}

            {reservation.status === "assise" && (
              <button
                className="text-xs font-medium text-violet hover:text-violet/80 transition-colors"
                onClick={() => onStatusChange(reservation.id, "terminee")}
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// -- Chip de stats --

function StatsChip({
  icon: Icon,
  label,
  count,
  color,
  bgColor,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${
        active
          ? `${bgColor} border-current/10`
          : "bg-muted/30 border-transparent"
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          active ? color : "text-muted-foreground/40"
        }`}
      />
      <div className="min-w-0">
        <span
          className={`text-lg font-bold tabular-nums block leading-none ${
            active ? color : "text-muted-foreground/40"
          }`}
        >
          {count}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}
