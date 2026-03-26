"use client";

import { useState } from "react";
import { List, GanttChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReservationList } from "./reservation-list";
import { ReservationTimeline } from "./reservation-timeline";
import { ReservationDialog } from "./reservation-dialog";
import { useRealtimeReservations } from "@/hooks/use-realtime-reservations";
import type { Reservation, FloorTable } from "@/lib/supabase/types";

interface ReservationViewsProps {
  initialReservations: Reservation[];
  restaurantId: string;
  tables: FloorTable[];
  selectedDate: string;
}

/**
 * Conteneur des vues réservations : Liste + Timeline Gantt.
 * Gère le switch de vue et le dialog partagé pour ouvrir/créer des résas.
 */
export function ReservationViews({
  initialReservations,
  restaurantId,
  tables,
  selectedDate,
}: ReservationViewsProps) {
  const [view, setView] = useState("liste");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [defaultTime, setDefaultTime] = useState<string | undefined>(undefined);
  const [defaultTableId, setDefaultTableId] = useState<string | undefined>(undefined);

  // Realtime partagé entre les deux vues
  const { reservations } = useRealtimeReservations(initialReservations, restaurantId);

  // Ouvrir le dialog pour une réservation existante (clic depuis timeline)
  function handleReservationClick(reservation: Reservation) {
    setEditingReservation(reservation);
    setDefaultTime(undefined);
    setDefaultTableId(undefined);
    setDialogOpen(true);
  }

  // Ouvrir le dialog pour un créneau vide (clic depuis timeline)
  function handleSlotClick(tableId: string, time: string) {
    setEditingReservation(null);
    setDefaultTime(time);
    setDefaultTableId(tableId);
    setDialogOpen(true);
  }

  return (
    <div>
      {/* Sélecteur de vue */}
      <div className="mb-4">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="liste">
              <List className="w-3.5 h-3.5" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <GanttChart className="w-3.5 h-3.5" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contenu selon la vue — mêmes données realtime pour les deux */}
      {view === "liste" ? (
        <ReservationList
          initialReservations={reservations}
          restaurantId={restaurantId}
          tables={tables}
          selectedDate={selectedDate}
        />
      ) : (
        <ReservationTimeline
          reservations={reservations}
          tables={tables}
          onReservationClick={handleReservationClick}
          onSlotClick={handleSlotClick}
        />
      )}

      {/* Dialog partagé pour la vue timeline */}
      {view === "timeline" && (
        <ReservationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          restaurantId={restaurantId}
          tables={tables}
          reservation={editingReservation}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
