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
  MapPin,
  StickyNote,
  UserCheck,
  UserX,
  Armchair,
  Hourglass,
  UserPlus,
  Star,
  AlertTriangle,
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

// ── Helpers ──

/** Formate un time_slot "HH:MM:SS" ou "HH:MM" en "HH:MM" pour l'affichage */
function formatTime(timeSlot: string): string {
  return timeSlot.slice(0, 5);
}

// ── Configuration ──

const statusFilters: { label: string; value: string }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "en_attente" },
  { label: "Confirmées", value: "confirmee" },
  { label: "Assises", value: "assise" },
  { label: "Terminées", value: "terminee" },
  { label: "Liste d\u2019attente", value: "liste_attente" },
];

const statusConfig: Record<
  ReservationStatus,
  { label: string; color: string; bg: string; dot: string; border: string; strikethrough?: boolean; dashed?: boolean }
> = {
  en_attente: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    border: "border-amber-300",
  },
  confirmee: {
    label: "Confirmée",
    color: "text-green-700",
    bg: "bg-green-50",
    dot: "bg-green-500",
    border: "border-green-300",
  },
  assise: {
    label: "Assise",
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
    border: "border-blue-300",
  },
  terminee: {
    label: "Terminée",
    color: "text-gray-500",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
    border: "border-gray-200",
  },
  annulee: {
    label: "Annulée",
    color: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-500",
    border: "border-red-300",
    strikethrough: true,
  },
  no_show: {
    label: "No-show",
    color: "text-red-900",
    bg: "bg-red-100",
    dot: "bg-red-700",
    border: "border-red-400",
    strikethrough: true,
  },
  liste_attente: {
    label: "Liste d\u2019attente",
    color: "text-amber-800",
    bg: "bg-amber-50/60",
    dot: "bg-amber-600",
    border: "border-amber-300",
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

// ── Type pour les props du hook realtime ──

interface RealtimeState {
  reservations: Reservation[];
  newReservationIds: Set<string>;
  updateReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  showBanner: Reservation | null;
}

// ── Composant principal ──

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
        toast.error("Erreur lors de l\u2019installation du client");
      }
    },
    [setReservations]
  );

  // Annuler une entrée de la liste d'attente
  const handleCancelWaitlist = useCallback(
    async (reservationId: string) => {
      try {
        await updateReservationStatus(reservationId, "annulee");
        toast.success("Entrée retirée de la liste d\u2019attente");
      } catch {
        toast.error("Erreur lors de l\u2019annulation");
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
      {/* Bug 4 — Banner nouvelle réservation depuis le hook realtime */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="mb-6 relative overflow-hidden rounded-2xl border-2 border-violet bg-gradient-to-r from-violet/10 via-violet/5 to-blue/10 p-6 shadow-lg"
          >
            <motion.div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet/20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div
              className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-blue/15"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            />
            <div className="relative flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-violet/20 flex items-center justify-center"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 2 }}
              >
                <CalendarDays className="w-7 h-7 text-violet" />
              </motion.div>
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">
                  Nouvelle réservation !
                </p>
                <p className="text-sm text-muted-foreground">
                  {showBanner.customer_name} — {showBanner.covers} couvert
                  {showBanner.covers > 1 ? "s" : ""} — {showBanner.date} à {formatTime(showBanner.time_slot)}
                </p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="px-4 py-2 bg-violet text-white rounded-xl font-semibold text-sm shadow-md"
              >
                À confirmer
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bande 7 jours compact */}
      {daySummaries && daySummaries.length > 0 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {daySummaries.map((day) => {
            const isSelected = day.date === selectedDate;
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
                  flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-center transition-all duration-200
                  hover:shadow-sm cursor-pointer min-w-[72px]
                  ${isSelected
                    ? "border-violet bg-violet/8 ring-1 ring-violet/20"
                    : day.isToday
                      ? "border-violet/30 bg-violet/[0.03]"
                      : day.totalReservations > 0
                        ? "border-blue/15 bg-blue/[0.03] hover:bg-blue/[0.06]"
                        : "border-border bg-muted/10 hover:bg-muted/20"
                  }
                `}
              >
                <span className={`text-[10px] font-medium uppercase tracking-wide ${
                  isSelected ? "text-violet" : "text-muted-foreground"
                }`}>
                  {day.dayShort}
                </span>
                <span className={`text-sm font-bold leading-tight ${
                  isSelected ? "text-violet" : "text-foreground"
                }`}>
                  {day.dayNumber}
                  {day.monthShort && (
                    <span className="text-[9px] text-muted-foreground ml-0.5 lowercase font-medium">
                      {day.monthShort}
                    </span>
                  )}
                </span>
                <span className={`text-xs font-semibold tabular-nums ${
                  day.totalReservations > 0
                    ? isSelected ? "text-violet" : "text-foreground"
                    : "text-muted-foreground/40"
                }`}>
                  {day.totalReservations}
                </span>
                {day.pendingCount > 0 && (
                  <span className="mt-0.5 inline-flex items-center px-1 py-[1px] rounded-full text-[9px] font-medium bg-amber-100 text-amber-700">
                    {day.pendingCount} att.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Stats chips */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        <StatsChip
          icon={CalendarDays}
          label="Résas aujourd\u2019hui"
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
          dotColor="bg-green-500"
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
          label="Liste d\u2019attente"
          count={waitlistCount}
          color="text-amber-700"
          bgColor="bg-amber-100/50"
          active={waitlistCount > 0}
          dotColor="bg-amber-600"
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
                    ? `Aucune réservation ne correspond à \u201C${search}\u201D`
                    : "Les nouvelles réservations apparaîtront ici en temps réel."
                }
                actionLabel="Nouvelle réservation"
                onAction={handleNewReservation}
              />
            </motion.div>
          ) : (
            <>
              {/* Bug 1 — Section prioritaire : réservations en attente en haut */}
              {pendingReservations.length > 0 && filter === "all" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  {/* Titre section avec point pulsant + bouton tout confirmer */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <h3 className="text-sm font-semibold text-amber-800">
                        Nouvelles réservations à confirmer
                      </h3>
                      <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                        {pendingReservations.length}
                      </span>
                    </div>
                    {pendingReservations.length > 1 && (
                      <Button
                        size="xs"
                        className="bg-green hover:bg-green/90 text-white gap-1"
                        onClick={handleConfirmAllPending}
                        disabled={confirmingAll}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {confirmingAll ? "Confirmation..." : "Tout confirmer"}
                      </Button>
                    )}
                  </div>

                  {/* Fond ambré subtil */}
                  <div className="rounded-xl bg-gradient-to-b from-amber-50/80 to-amber-50/30 border border-amber-200/60 p-3 space-y-2">
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

// ── Carte de réservation — Design premium ──

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
  const isVip = customer?.tags?.includes("vip");
  const isFidele = customer?.tags?.includes("habituee") || customer?.tags?.includes("habituée");
  const isRecidiviste = customer?.tags?.includes("recidiviste") || customer?.tags?.includes("récidiviste");
  const customerNoShowTags = customer?.tags?.filter((t) => t === "no_show").length || 0;
  // Compter les no-shows aussi via le tag récidiviste (au moins 2 no-shows)
  const hasNoShowHistory = isRecidiviste || customerNoShowTags > 0;

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
      className={`group relative rounded-xl border bg-card transition-all duration-200 cursor-pointer
        ${isPending ? "border-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_2px_8px_rgba(245,158,11,0.08)]" : "shadow-card border-border"}
        ${isNew ? "ring-2 ring-violet/40 shadow-[0_0_20px_rgba(66,55,196,0.12)]" : ""}
        hover:shadow-card-hover hover:-translate-y-[1px]
      `}
      onClick={() => onEdit(reservation)}
    >
      {/* Barre d'accentuation latérale pour les réservations en attente */}
      {isPending && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-400" />
      )}

      <div className="flex items-stretch p-4">
        {/* Colonne gauche : heure en gros + couverts */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pr-4 border-r border-border/50 min-w-[72px]">
          <span className="font-mono text-2xl font-bold text-foreground leading-none tracking-tight">
            {timeDisplay}
          </span>
          <div className="flex items-center gap-1 mt-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {reservation.covers} couvert{reservation.covers > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Colonne milieu : informations principales */}
        <div className="flex-1 min-w-0 pl-4 space-y-2">
          {/* Ligne 1 : nom + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm text-foreground truncate ${status.strikethrough ? "line-through opacity-60" : ""}`}>
              {reservation.customer_name}
            </span>

            {/* Étoile VIP */}
            {isVip && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
            )}

            {/* Badge statut */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.bg} ${status.color} ${status.dashed ? "border border-dashed border-amber-400" : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${isNew ? "animate-pulse" : ""}`} />
              {status.label}
            </span>

            {/* Badge occasion */}
            {occasion && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet/8 text-violet border border-violet/15">
                {occasion.emoji} {occasion.label}
              </span>
            )}

            {/* Badge client fidèle */}
            {isFidele && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet/10 text-violet border border-violet/20">
                Client fidèle
              </span>
            )}

            {/* Badge visite */}
            {customer && customer.visit_count > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue/8 text-blue/80">
                {customer.visit_count}ème visite
              </span>
            )}

            {/* Badge no-show récidiviste */}
            {reservation.status === "no_show" && hasNoShowHistory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3" />
                Récidiviste
              </span>
            )}
          </div>

          {/* Sous-ligne : total dépensé (subtil) */}
          {customer && customer.total_spent > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              {customer.total_spent.toFixed(0)}€ dépensés
            </span>
          )}

          {/* Ligne 2 : téléphone, table, zone */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {reservation.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {reservation.customer_phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {table ? table.name : "Pas de table"}
              {table && (() => {
                const zoneConf = getZoneConfig(table.zone || "salle");
                return (
                  <span className={`inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${zoneConf.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${zoneConf.dotColor}`} />
                    {zoneConf.label}
                  </span>
                );
              })()}
            </span>
          </div>

          {/* Ligne 3 : préférences + notes */}
          {(preferences.length > 0 || displayNotes) && (
            <div className="flex items-center gap-2 flex-wrap">
              {preferences.map((pref) => (
                <span
                  key={pref}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue/8 text-blue border border-blue/15"
                >
                  {pref}
                </span>
              ))}
              {displayNotes && (
                <span className="text-xs text-muted-foreground/70 italic flex items-center gap-1 truncate max-w-[240px]">
                  <StickyNote className="w-3 h-3 flex-shrink-0" />
                  {displayNotes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite : actions rapides */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0 pl-3 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {reservation.status === "en_attente" && (
            <>
              <Button
                size="xs"
                className="bg-green hover:bg-green/90 text-white gap-1"
                onClick={() => onStatusChange(reservation.id, "confirmee")}
              >
                <UserCheck className="w-3 h-3" />
                Confirmer
              </Button>
              <Button
                size="xs"
                variant="destructive"
                className="gap-1"
                onClick={() => onStatusChange(reservation.id, "annulee")}
              >
                <UserX className="w-3 h-3" />
              </Button>
            </>
          )}

          {reservation.status === "confirmee" && (
            <>
              <Button
                size="xs"
                className="bg-blue hover:bg-blue/90 text-white gap-1"
                onClick={() => onStatusChange(reservation.id, "assise")}
              >
                <Armchair className="w-3 h-3" />
                Asseoir
              </Button>
              <Button
                size="xs"
                variant="destructive"
                className="gap-1"
                onClick={() => onStatusChange(reservation.id, "annulee")}
              >
                <UserX className="w-3 h-3" />
              </Button>
            </>
          )}

          {reservation.status === "assise" && (
            <Button
              size="xs"
              variant="secondary"
              className="gap-1"
              onClick={() => onStatusChange(reservation.id, "terminee")}
            >
              <CheckCircle2 className="w-3 h-3" />
              Terminer
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Chip de stats ──

function StatsChip({
  icon: Icon,
  label,
  count,
  color,
  bgColor,
  active = false,
  dotColor,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  active?: boolean;
  dotColor?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${
        active
          ? `${bgColor} border-current/10`
          : "bg-muted/30 border-transparent"
      }`}
    >
      <div className="relative">
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${
            active ? color : "text-muted-foreground/40"
          }`}
        />
        {dotColor && active && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor}`}
          />
        )}
      </div>
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
