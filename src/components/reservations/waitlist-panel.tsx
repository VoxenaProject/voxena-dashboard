"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users,
  Clock,
  XCircle,
  Armchair,
  MapPin,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Reservation, FloorTable } from "@/lib/supabase/types";

// ── Props ──

interface WaitlistPanelProps {
  waitlistItems: Reservation[];
  tables: FloorTable[];
  onSeat: (reservationId: string, tableId: string) => void;
  onCancel: (reservationId: string) => void;
}

// ── Utilitaire : minutes d'attente depuis created_at ──

function getMinutesSince(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - created) / 60000));
}

// ── Utilitaire : progression de l'attente (%) ──

function getWaitProgress(createdAt: string, estimatedMinutes: number | null): number {
  if (!estimatedMinutes || estimatedMinutes <= 0) return 0;
  const waited = getMinutesSince(createdAt);
  return Math.min(100, Math.round((waited / estimatedMinutes) * 100));
}

// ── Composant principal ──

export function WaitlistPanel({
  waitlistItems,
  tables,
  onSeat,
  onCancel,
}: WaitlistPanelProps) {
  // Tri par waitlist_position (ascendant)
  const sorted = [...waitlistItems].sort(
    (a, b) => (a.waitlist_position ?? 999) - (b.waitlist_position ?? 999)
  );

  // État pour forcer le re-render des temps d'attente
  const [, setTick] = useState(0);

  // Dialog de sélection de table
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Notification de table libérée
  const prevFreeTablesRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
  }, []);

  // Auto-refresh des temps d'attente toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Détecter quand une table se libère (la prop tables change)
  useEffect(() => {
    const currentFreeIds = new Set(tables.filter((t) => t.is_active).map((t) => t.id));
    const prevFreeIds = prevFreeTablesRef.current;

    // Nouvelles tables libres = dans current mais pas dans prev
    const newlyFree = [...currentFreeIds].filter((id) => !prevFreeIds.has(id));

    if (newlyFree.length > 0 && sorted.length > 0 && prevFreeIds.size > 0) {
      const firstWaiting = sorted[0];
      const freedTable = tables.find((t) => newlyFree.includes(t.id));

      if (freedTable) {
        const waitMinutes = getMinutesSince(firstWaiting.created_at);

        // Son de notification
        audioRef.current?.play().catch(() => {});

        toast.success(
          `Table ${freedTable.name} vient de se libérer !`,
          {
            description: `${firstWaiting.customer_name} attend depuis ${waitMinutes} min (${firstWaiting.covers} couvert${firstWaiting.covers > 1 ? "s" : ""})`,
            duration: 15000,
            action: {
              label: "Asseoir",
              onClick: () => handleOpenSeatDialog(firstWaiting),
            },
          }
        );
      }
    }

    prevFreeTablesRef.current = currentFreeIds;
  }, [tables, sorted]);

  // Ouvrir la dialog de sélection de table
  const handleOpenSeatDialog = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation);
    setSeatDialogOpen(true);
  }, []);

  // Sélection d'une table dans la dialog
  function handleTableSelect(tableId: string) {
    if (selectedReservation) {
      onSeat(selectedReservation.id, tableId);
      setSeatDialogOpen(false);
      setSelectedReservation(null);
    }
  }

  // Tables disponibles pour le nombre de couverts demandé
  const availableTablesForSeat = selectedReservation
    ? tables.filter(
        (t) => t.is_active && t.capacity >= selectedReservation.covers
      )
    : [];

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-500" />
              Liste d&apos;attente
            </CardTitle>
            {sorted.length > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {sorted.length}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Hourglass className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Aucun client en attente
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Les clients sans table disponible apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {sorted.map((item, index) => (
                  <WaitlistEntry
                    key={item.id}
                    reservation={item}
                    position={item.waitlist_position ?? index + 1}
                    onSeat={() => handleOpenSeatDialog(item)}
                    onCancel={() => onCancel(item.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de sélection de table */}
      <Dialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-green" />
              Choisir une table
            </DialogTitle>
            <DialogDescription>
              {selectedReservation && (
                <>
                  Installer {selectedReservation.customer_name} ({selectedReservation.covers}{" "}
                  couvert{selectedReservation.covers > 1 ? "s" : ""})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {availableTablesForSeat.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune table disponible pour {selectedReservation?.covers} couvert
                {(selectedReservation?.covers ?? 0) > 1 ? "s" : ""}
              </p>
            ) : (
              availableTablesForSeat.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-green/5 hover:border-green/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green/10 text-green font-bold text-sm">
                    {table.name.replace(/[^0-9]/g, "") || table.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {table.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {table.capacity} places
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {table.zone || "salle"}
                      </span>
                    </div>
                  </div>
                  <Armchair className="w-4 h-4 text-muted-foreground/40 group-hover:text-green transition-colors" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Entrée de la liste d'attente ──

function WaitlistEntry({
  reservation,
  position,
  onSeat,
  onCancel,
}: {
  reservation: Reservation;
  position: number;
  onSeat: () => void;
  onCancel: () => void;
}) {
  const waitMinutes = getMinutesSince(reservation.created_at);
  const estimatedMinutes = reservation.estimated_wait_minutes;
  const progress = getWaitProgress(reservation.created_at, estimatedMinutes);
  const isOverdue = estimatedMinutes ? waitMinutes > estimatedMinutes : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className="relative rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
    >
      <div className="flex items-start gap-3">
        {/* Badge de position */}
        <div
          className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${
            position <= 1
              ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
              : position <= 3
                ? "bg-amber-50 text-amber-600"
                : "bg-muted text-muted-foreground"
          }`}
        >
          #{position}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {reservation.customer_name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {reservation.covers} couvert{reservation.covers > 1 ? "s" : ""}
            </span>
          </div>

          {/* Temps d'attente et estimation */}
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`flex items-center gap-1 font-medium ${
                isOverdue ? "text-red-600" : "text-muted-foreground"
              }`}
            >
              <Clock className="w-3 h-3" />
              Depuis {waitMinutes} min
            </span>
            {estimatedMinutes && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Hourglass className="w-3 h-3" />
                ~{estimatedMinutes} min
              </span>
            )}
          </div>

          {/* Barre de progression */}
          {estimatedMinutes && (
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  isOverdue
                    ? "bg-red-500"
                    : progress >= 75
                      ? "bg-amber-500"
                      : "bg-green"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="xs"
            className="bg-green hover:bg-green/90 text-white gap-1"
            onClick={onSeat}
          >
            <Armchair className="w-3 h-3" />
            Asseoir
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
            onClick={onCancel}
          >
            <XCircle className="w-3 h-3" />
            Annuler
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
