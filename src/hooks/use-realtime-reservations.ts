"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, ReservationStatus } from "@/lib/supabase/types";

/**
 * Déclenche la notification pour une nouvelle réservation.
 * Appelé UNIQUEMENT depuis le realtime INSERT ou le polling.
 */
function notifyNewReservation(resa: Reservation) {
  const timeShort = resa.time_slot?.slice(0, 5) || resa.time_slot;

  // Son
  try {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.play().catch(() => {});
    setTimeout(() => audio.play().catch(() => {}), 1500);
  } catch {}

  // Toast
  toast.success(`Nouvelle réservation de ${resa.customer_name} !`, {
    description: `${resa.covers} couvert${resa.covers > 1 ? "s" : ""} — ${resa.date} à ${timeShort}`,
    duration: 8000,
  });

  // Notification navigateur
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`Nouvelle réservation — ${resa.customer_name}`, {
        body: `${resa.covers} couverts — ${resa.date} à ${timeShort}`,
        icon: "/favicon.ico",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
}

/**
 * Hook realtime pour les réservations.
 * Notifications déclenchées UNIQUEMENT par le realtime INSERT ou le polling.
 */
export function useRealtimeReservations(
  initialReservations: Reservation[],
  restaurantId?: string | null,
  selectedDate?: string
) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const supabase = createClient();
  const knownIdsRef = useRef<Set<string>>(new Set(initialReservations.map((r) => r.id)));
  const [newReservationIds, setNewReservationIds] = useState<Set<string>>(new Set());
  // Banner state exposé pour le composant parent
  const [showBanner, setShowBanner] = useState<Reservation | null>(null);

  // Quand les données serveur changent (changement de date), reset sans notifier
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
            // Notification — c'est une VRAIE nouvelle résa (realtime INSERT)
            notifyNewReservation(newResa);
            setShowBanner(newResa);
            setTimeout(() => setShowBanner(null), 3000);
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

    // Polling fallback toutes les 10s — poll la date affichée, pas "today"
    const pollDate = selectedDate || new Date().toISOString().split("T")[0];
    const pollInterval = setInterval(async () => {
      if (!restaurantId) return;

      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("date", pollDate)
        .order("time_slot", { ascending: true });

      if (data) {
        const newResas = data.filter((r) => !knownIdsRef.current.has(r.id));
        if (newResas.length > 0) {
          newResas.forEach((r) => knownIdsRef.current.add(r.id));
          setReservations((prev) => [...newResas, ...prev]);
          // Notification pour la première nouvelle résa (polling)
          notifyNewReservation(newResas[0]);
          setShowBanner(newResas[0]);
          setTimeout(() => setShowBanner(null), 3000);
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
  }, [supabase, restaurantId, selectedDate]);

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

  return { reservations, newReservationIds, updateReservationStatus, setReservations, showBanner };
}
