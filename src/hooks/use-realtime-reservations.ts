"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, ReservationStatus } from "@/lib/supabase/types";

/**
 * Hook realtime pour les réservations.
 * Même pattern que use-realtime-orders : Supabase Realtime + polling fallback.
 */
export function useRealtimeReservations(
  initialReservations: Reservation[],
  restaurantId?: string | null
) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const supabase = createClient();
  const knownIdsRef = useRef<Set<string>>(new Set(initialReservations.map((r) => r.id)));
  // Track les nouveaux IDs pour les notifications
  const [newReservationIds, setNewReservationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReservations(initialReservations);
    knownIdsRef.current = new Set(initialReservations.map((r) => r.id));
  }, [initialReservations]);

  useEffect(() => {
    // Filtre realtime par restaurant_id si disponible
    const filter = restaurantId
      ? `restaurant_id=eq.${restaurantId}`
      : undefined;

    const channel = supabase
      .channel("reservations-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservations",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const newResa = payload.new as Reservation;
          if (!knownIdsRef.current.has(newResa.id)) {
            knownIdsRef.current.add(newResa.id);
            setReservations((prev) => [newResa, ...prev]);
            // Marquer comme nouvelle pour notification
            setNewReservationIds((prev) => new Set(prev).add(newResa.id));
            setTimeout(() => {
              setNewReservationIds((prev) => {
                const next = new Set(prev);
                next.delete(newResa.id);
                return next;
              });
            }, 8000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservations",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const updatedResa = payload.new as Reservation;
          setReservations((prev) =>
            prev.map((r) => (r.id === updatedResa.id ? updatedResa : r))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "reservations",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          knownIdsRef.current.delete(deletedId);
          setReservations((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    // Polling fallback toutes les 10s
    const pollInterval = setInterval(async () => {
      if (!restaurantId) return;

      // On poll la date du jour uniquement
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("date", today)
        .order("time_slot", { ascending: true });

      if (data) {
        const newResas = data.filter((r) => !knownIdsRef.current.has(r.id));
        if (newResas.length > 0) {
          newResas.forEach((r) => knownIdsRef.current.add(r.id));
          setReservations((prev) => [...newResas, ...prev]);
        }
        // Mettre à jour les statuts des réservations existantes
        setReservations((prev) =>
          prev.map((existing) => {
            const updated = data.find((d) => d.id === existing.id);
            return updated ? { ...existing, ...updated } : existing;
          })
        );
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [supabase, restaurantId]);

  // Mise à jour optimiste du statut avec rollback
  const updateReservationStatus = useCallback(
    async (reservationId: string, newStatus: ReservationStatus) => {
      const previousReservations = reservations;

      // Update optimiste
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: newStatus } : r
        )
      );

      try {
        const res = await fetch("/api/reservations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reservationId, status: newStatus }),
        });
        if (!res.ok) {
          throw new Error("Échec mise à jour");
        }
      } catch {
        // Rollback en cas d'erreur
        setReservations(previousReservations);
        throw new Error("Échec mise à jour du statut");
      }
    },
    [reservations]
  );

  return { reservations, newReservationIds, updateReservationStatus, setReservations };
}
