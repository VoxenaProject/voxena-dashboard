"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardLiveIndicatorProps {
  restaurantId: string;
}

// Clé sessionStorage pour se souvenir de ce qu'on a déjà vu
const STORAGE_KEY = "voxena-dash-last-seen";

// Lire le timestamp du dernier dismiss
function getLastSeen(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

// Sauvegarder le timestamp du dismiss
function setLastSeen(ts: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, ts);
  } catch {}
}

// Son de notification via Web Audio API
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
  } catch {}
}

export function DashboardLiveIndicator({ restaurantId }: DashboardLiveIndicatorProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundPlayedRef = useRef(false);
  const lastSeenRef = useRef(getLastSeen());

  // Polling toutes les 30 secondes
  const poll = useCallback(async () => {
    try {
      const supabase = createClient();

      // Chercher les items créés APRÈS le dernier dismiss
      // Si jamais dismissé → chercher les 5 dernières minutes
      const since = lastSeenRef.current || new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [ordersResult, reservationsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .gt("created_at", since),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .gt("created_at", since),
      ]);

      const orderCount = ordersResult.count ?? 0;
      const resaCount = reservationsResult.count ?? 0;
      const total = orderCount + resaCount;

      if (total > 0) {
        // Construire le message
        const parts: string[] = [];
        if (orderCount > 0) parts.push(`${orderCount} nouvelle${orderCount > 1 ? "s" : ""} commande${orderCount > 1 ? "s" : ""}`);
        if (resaCount > 0) parts.push(`${resaCount} nouvelle${resaCount > 1 ? "s" : ""} réservation${resaCount > 1 ? "s" : ""}`);
        setMessage(parts.join(" + "));

        if (!visible) {
          setVisible(true);
          if (!soundPlayedRef.current) {
            playNotificationSound();
            soundPlayedRef.current = true;
          }
        }
      } else {
        setVisible(false);
        soundPlayedRef.current = false;
      }
    } catch {}
  }, [restaurantId, visible]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [poll]);

  // Auto-dismiss après 15 secondes
  useEffect(() => {
    if (visible) {
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 15000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    setVisible(false);
    soundPlayedRef.current = false;
    // Sauvegarder le timestamp actuel → les prochains polls ne montreront que les NOUVEAUX items
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    setLastSeen(now);
  }

  function handleRefresh() {
    dismiss();
    router.refresh();
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    dismiss();
  }

  return (
    <AnimatePresence>
      {visible && message && (
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
                {message} — Cliquez pour rafraîchir
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
