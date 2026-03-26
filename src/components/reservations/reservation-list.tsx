"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useRealtimeReservations } from "@/hooks/use-realtime-reservations";
import { ReservationDialog } from "./reservation-dialog";
import { WaitlistPanel } from "./waitlist-panel";
import { getZoneConfig } from "@/lib/floor-plan/zones";
import type { Reservation, ReservationStatus, FloorTable } from "@/lib/supabase/types";

// ── Configuration ──

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
  liste_attente: {
    label: "Liste d'attente",
    color: "text-amber-800",
    bg: "bg-amber-50",
    dot: "bg-amber-600",
  },
};

// Résolution d'occasion à partir de la colonne dédiée
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

// ── Composant principal ──

interface ReservationListProps {
  initialReservations: Reservation[];
  restaurantId: string;
  tables: FloorTable[];
  selectedDate: string;
}

export function ReservationList({
  initialReservations,
  restaurantId,
  tables,
  selectedDate,
}: ReservationListProps) {
  const { reservations, newReservationIds, updateReservationStatus, setReservations } =
    useRealtimeReservations(initialReservations, restaurantId);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [waitlistMode, setWaitlistMode] = useState(false);

  // Notification son + toast + banner
  const prevCountRef = useRef(initialReservations.length);
  const [showBanner, setShowBanner] = useState<Reservation | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
  }, []);

  // Notification quand nouvelle réservation arrive
  useEffect(() => {
    if (reservations.length > prevCountRef.current) {
      const newResa = reservations[0];

      // Son de notification
      audioRef.current?.play().catch(() => {});
      setTimeout(() => audioRef.current?.play().catch(() => {}), 1500);

      // Formater l'heure sans les secondes (19:30:00 → 19:30)
      const timeShort = newResa.time_slot?.slice(0, 5) || newResa.time_slot;

      // Toast
      toast.success(
        `Nouvelle réservation de ${newResa.customer_name} !`,
        {
          description: `${newResa.covers} couvert${newResa.covers > 1 ? "s" : ""} — ${newResa.date} à ${timeShort}`,
          duration: 8000,
        }
      );

      // Banner (3 secondes)
      setShowBanner(newResa);
      setTimeout(() => setShowBanner(null), 3000);

      // Notification navigateur
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(`Nouvelle réservation — ${newResa.customer_name}`, {
            body: `${newResa.covers} couverts — ${newResa.time_slot}`,
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    }
    prevCountRef.current = reservations.length;
  }, [reservations.length, reservations]);

  // Filtrer par statut + recherche texte
  const filtered = useMemo(() => {
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

    return result;
  }, [reservations, filter, search]);

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

  return (
    <div>
      {/* Banner nouvelle réservation */}
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
                  {showBanner.covers > 1 ? "s" : ""} — {showBanner.date} à {showBanner.time_slot?.slice(0, 5)}
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
          label="Liste d'attente"
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
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
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
              filtered.map((resa, i) => (
                <ReservationCard
                  key={resa.id}
                  reservation={resa}
                  tables={tables}
                  index={i}
                  isNew={newReservationIds.has(resa.id)}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                />
              ))
            )}
          </AnimatePresence>
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
      />
    </div>
  );
}

// ── Carte de réservation ──

function ReservationCard({
  reservation,
  tables,
  index,
  isNew,
  onStatusChange,
  onEdit,
}: {
  reservation: Reservation;
  tables: FloorTable[];
  index: number;
  isNew: boolean;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onEdit: (reservation: Reservation) => void;
}) {
  const status = statusConfig[reservation.status];
  const table = tables.find((t) => t.id === reservation.table_id);
  const occasion = resolveOccasion(reservation.occasion);
  const preferences = reservation.preferences || [];

  // Les notes sont désormais pures (pas de métadonnées encodées)
  const displayNotes = reservation.notes?.trim();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: index * 0.03 },
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover cursor-pointer ${
        isNew ? "ring-2 ring-violet/40 animate-pulse" : ""
      }`}
      onClick={() => onEdit(reservation)}
    >
      <div className="flex items-start gap-4">
        {/* Heure — gros, monospace */}
        <div className="flex-shrink-0 text-center">
          <span className="font-mono text-2xl font-bold text-foreground leading-none">
            {reservation.time_slot}
          </span>
          <span className="block text-[10px] text-muted-foreground mt-0.5 font-medium">
            {reservation.covers} couvert{reservation.covers > 1 ? "s" : ""}
          </span>
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {reservation.customer_name}
            </span>

            {/* Badge statut */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.bg} ${status.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            {/* Badge occasion */}
            {occasion && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet/10 text-violet">
                {occasion.emoji} {occasion.label}
              </span>
            )}

            {/* Tags préférences */}
            {preferences.length > 0 && preferences.map((pref) => (
              <span
                key={pref}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue/10 text-blue"
              >
                {pref}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {reservation.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {reservation.customer_phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {reservation.covers}
            </span>
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

          {/* Notes tronquées */}
          {displayNotes && (
            <p className="text-xs text-muted-foreground flex items-start gap-1 line-clamp-1">
              <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {displayNotes}
            </p>
          )}
        </div>

        {/* Actions rapides */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0"
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
                Annuler
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
                Annuler
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
