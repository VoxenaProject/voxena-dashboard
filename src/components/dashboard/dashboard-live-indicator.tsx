"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardLiveIndicatorProps {
  restaurantId: string;
}

// Son de notification via Web Audio API (bip court et doux)
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignorer si le navigateur bloque l'audio
  }
}

export function DashboardLiveIndicator({ restaurantId }: DashboardLiveIndicatorProps) {
  const router = useRouter();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newReservationCount, setNewReservationCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundPlayedRef = useRef(false);

  const totalNew = newOrderCount + newReservationCount;

  // Polling toutes les 30 secondes
  const poll = useCallback(async () => {
    try {
      const supabase = createClient();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Deux requêtes COUNT en parallèle — légères
      const [ordersResult, reservationsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .gte("created_at", fiveMinutesAgo),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .gte("created_at", fiveMinutesAgo),
      ]);

      const orderCount = ordersResult.count ?? 0;
      const reservationCount = reservationsResult.count ?? 0;

      setNewOrderCount(orderCount);
      setNewReservationCount(reservationCount);

      if (orderCount + reservationCount > 0) {
        // Ne montrer que si pas déjà dismissed
        if (!dismissed) {
          setVisible(true);

          // Jouer le son une seule fois par "vague" de nouvelles entrées
          if (!soundPlayedRef.current) {
            playNotificationSound();
            soundPlayedRef.current = true;
          }
        }
      } else {
        // Plus rien de nouveau — réinitialiser
        setVisible(false);
        setDismissed(false);
        soundPlayedRef.current = false;
      }
    } catch {
      // Silencieux en cas d'erreur réseau
    }
  }, [restaurantId, dismissed]);

  useEffect(() => {
    // Premier poll immédiat
    poll();

    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [poll]);

  // Auto-dismiss après 15 secondes
  useEffect(() => {
    if (visible && !dismissed) {
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 15000);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [visible, dismissed]);

  // Clic pour rafraîchir les données serveur
  function handleRefresh() {
    setVisible(false);
    setDismissed(true);
    soundPlayedRef.current = false;
    router.refresh();
  }

  // Fermer la notification
  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setVisible(false);
    setDismissed(true);
  }

  // Construire le message
  function buildMessage(): string {
    const parts: string[] = [];
    if (newOrderCount > 0) {
      parts.push(`${newOrderCount} nouvelle${newOrderCount > 1 ? "s" : ""} commande${newOrderCount > 1 ? "s" : ""}`);
    }
    if (newReservationCount > 0) {
      parts.push(`${newReservationCount} nouvelle${newReservationCount > 1 ? "s" : ""} réservation${newReservationCount > 1 ? "s" : ""}`);
    }
    return parts.join(" + ");
  }

  return (
    <AnimatePresence>
      {visible && totalNew > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={handleRefresh}
          className="rounded-2xl bg-violet/[0.06] border border-violet/20 p-3 mb-4 cursor-pointer hover:bg-violet/[0.1] transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-violet" />
              <span className="text-sm text-violet font-medium">
                {buildMessage()} — Cliquez pour rafraîchir
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-violet/50 hover:text-violet transition-colors p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
