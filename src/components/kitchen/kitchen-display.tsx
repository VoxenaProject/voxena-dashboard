"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { statusToastLabels } from "@/lib/orders/status";
import { KitchenCard } from "./kitchen-card";
import type { Order, OrderStatus } from "@/lib/supabase/types";

// Statuts affichés dans le KDS
const KDS_STATUSES = ["nouvelle", "en_preparation", "prete"] as const;

// Config des colonnes
const COLUMN_CONFIG = {
  nouvelle: {
    title: "Nouvelles",
    accent: "#ef4444",
    bgAccent: "rgba(239, 68, 68, 0.15)",
    borderColor: "border-red-500",
  },
  en_preparation: {
    title: "En préparation",
    accent: "#f59e0b",
    bgAccent: "rgba(245, 158, 11, 0.15)",
    borderColor: "border-amber-500",
  },
  prete: {
    title: "Prêtes",
    accent: "#22c55e",
    bgAccent: "rgba(34, 197, 94, 0.15)",
    borderColor: "border-green-500",
  },
} as const;

interface KitchenDisplayProps {
  initialOrders: Order[];
  restaurantId: string;
}

export function KitchenDisplay({
  initialOrders,
  restaurantId,
}: KitchenDisplayProps) {
  const { orders, updateOrderStatus } = useRealtimeOrders(
    initialOrders,
    restaurantId
  );

  // Son activé par défaut
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(initialOrders.length);

  // Horloge en temps réel
  const [currentTime, setCurrentTime] = useState(new Date());

  // Onglet mobile
  const [mobileTab, setMobileTab] = useState<
    "nouvelle" | "en_preparation" | "prete"
  >("nouvelle");

  // Timer — force re-render toutes les 30s pour mettre à jour "il y a X min"
  const [, setTick] = useState(0);

  // IDs des nouvelles commandes (pour animation flash)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
  }, []);

  // Horloge — mise à jour chaque seconde
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer — mise à jour toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Notification son + flash quand nouvelle commande
  useEffect(() => {
    if (orders.length > prevCountRef.current) {
      const newOrder = orders[0];

      // Son (2x pour attirer l'attention)
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
        setTimeout(() => audioRef.current?.play().catch(() => {}), 1500);
      }

      // Toast
      toast.success(
        `Nouvelle commande de ${newOrder.customer_name || "Client"} !`,
        {
          description: `${
            newOrder.order_type === "livraison" ? "Livraison" : "À emporter"
          } — ${(newOrder.items as unknown[])?.length || 0} article(s)`,
          duration: 10000,
        }
      );

      // Flash sur la carte
      setFlashIds((prev) => new Set(prev).add(newOrder.id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(newOrder.id);
          return next;
        });
      }, 6000);
    }
    prevCountRef.current = orders.length;
  }, [orders.length, orders, soundEnabled]);

  // Changer le statut d'une commande
  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const oldOrder = orders.find((o) => o.id === orderId);
      const oldStatus = oldOrder?.status;

      // Update optimiste via le hook
      try {
        await updateOrderStatus(orderId, newStatus);
        toast(statusToastLabels[newStatus] || "Statut mis à jour");
      } catch {
        // Rollback géré par le hook
        if (oldStatus) {
          toast.error("Erreur lors de la mise à jour");
        }
      }
    },
    [orders, updateOrderStatus]
  );

  // Filtrer les commandes actives KDS seulement
  const kdsOrders = useMemo(
    () =>
      orders.filter((o) =>
        KDS_STATUSES.includes(o.status as (typeof KDS_STATUSES)[number])
      ),
    [orders]
  );

  // Commandes par colonne
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, Order[]> = {
      nouvelle: [],
      en_preparation: [],
      prete: [],
    };
    for (const order of kdsOrders) {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    }
    return grouped;
  }, [kdsOrders]);

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none">
      {/* ── Barre supérieure ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#0f1025] border-b border-white/10 flex-shrink-0">
        {/* Horloge */}
        <div className="flex items-center gap-3">
          <span className="text-white/90 font-mono text-lg font-bold tabular-nums">
            {currentTime.toLocaleTimeString("fr-BE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span className="text-white/30 text-sm hidden sm:inline">
            Kitchen Display System
          </span>
        </div>

        {/* Total commandes actives */}
        <div className="hidden sm:flex items-center gap-4">
          {KDS_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLUMN_CONFIG[status].accent }}
              />
              <span className="text-white/60 text-sm">
                {ordersByStatus[status].length}
              </span>
            </div>
          ))}
        </div>

        {/* Contrôles */}
        <div className="flex items-center gap-2">
          {/* Toggle son */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            title={soundEnabled ? "Couper le son" : "Activer le son"}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>

          {/* Bouton retour */}
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </Link>

          {/* Bouton fermer */}
          <Link
            href="/orders"
            className="p-2 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            title="Fermer le mode cuisine"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* ── Onglets mobile ── */}
      <div className="sm:hidden flex bg-[#0f1025] border-b border-white/10 flex-shrink-0">
        {KDS_STATUSES.map((status) => {
          const config = COLUMN_CONFIG[status];
          const count = ordersByStatus[status].length;
          const isActive = mobileTab === status;
          return (
            <button
              key={status}
              onClick={() => setMobileTab(status)}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative ${
                isActive ? "text-white" : "text-white/40"
              }`}
            >
              {config.title}
              {count > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: config.accent }}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="kds-mobile-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: config.accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Colonnes Kanban (desktop/tablette) ── */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 p-3 flex-1 overflow-hidden">
        {KDS_STATUSES.map((status) => {
          const config = COLUMN_CONFIG[status];
          const columnOrders = ordersByStatus[status];
          return (
            <div
              key={status}
              className="flex flex-col rounded-xl overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              {/* En-tête colonne */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ backgroundColor: config.bgAccent }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.accent }}
                  />
                  <h2 className="text-white font-bold text-base uppercase tracking-wide">
                    {config.title}
                  </h2>
                </div>
                <span
                  className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: config.accent }}
                >
                  {columnOrders.length}
                </span>
              </div>

              {/* Cartes — scroll si overflow */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <AnimatePresence mode="popLayout">
                  {columnOrders.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-12 text-white/20 text-sm"
                    >
                      Aucune commande
                    </motion.div>
                  ) : (
                    columnOrders.map((order) => (
                      <KitchenCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        isFlashing={flashIds.has(order.id)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Vue mobile (une seule colonne avec onglets) ── */}
      <div className="sm:hidden flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {ordersByStatus[mobileTab].length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20 text-white/20 text-base"
            >
              Aucune commande
            </motion.div>
          ) : (
            ordersByStatus[mobileTab].map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isFlashing={flashIds.has(order.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
