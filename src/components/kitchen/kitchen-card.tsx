"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Truck } from "lucide-react";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

// Couleurs de bordure gauche par statut
const BORDER_COLORS: Record<string, string> = {
  nouvelle: "#ef4444",
  en_preparation: "#f59e0b",
  prete: "#22c55e",
};

// Boutons d'action par statut
const ACTION_CONFIG: Record<
  string,
  { label: string; bgColor: string; hoverColor: string; nextStatus: OrderStatus }
> = {
  nouvelle: {
    label: "ACCEPTER",
    bgColor: "#22c55e",
    hoverColor: "#16a34a",
    nextStatus: "en_preparation",
  },
  en_preparation: {
    label: "PRÊTE !",
    bgColor: "#3b82f6",
    hoverColor: "#2563eb",
    nextStatus: "prete",
  },
};

interface KitchenCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  isFlashing?: boolean;
}

export function KitchenCard({
  order,
  onStatusChange,
  isFlashing = false,
}: KitchenCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const items = (order.items || []) as OrderItem[];
  const isLivraison = order.order_type === "livraison";

  // Temps écoulé depuis la création
  const elapsedInfo = useMemo(() => {
    const now = Date.now();
    const created = new Date(order.created_at).getTime();
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);

    let color = "text-white/60";
    let urgent = false;
    let bgTint = "";

    if (diffMin > 20) {
      color = "text-red-400";
      urgent = true;
      bgTint = "rgba(239, 68, 68, 0.08)";
    } else if (diffMin > 15) {
      color = "text-red-400";
      urgent = true;
    } else if (diffMin > 10) {
      color = "text-amber-400";
    }

    const label =
      diffMin < 1 ? "À l'instant" : `Il y a ${diffMin} min`;

    return { label, color, urgent, bgTint };
  }, [order.created_at]);

  // Action pour le statut "prete" — dépend du type de commande
  const action = useMemo(() => {
    if (order.status === "prete") {
      if (isLivraison) {
        return {
          label: "PARTIE EN LIVRAISON",
          bgColor: "#8b5cf6",
          hoverColor: "#7c3aed",
          nextStatus: "en_livraison" as OrderStatus,
        };
      }
      return {
        label: "RÉCUPÉRÉE",
        bgColor: "#8b5cf6",
        hoverColor: "#7c3aed",
        nextStatus: "recuperee" as OrderStatus,
      };
    }
    return ACTION_CONFIG[order.status] || null;
  }, [order.status, isLivraison]);

  async function handleAction() {
    if (!action || isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(order.id, action.nextStatus);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div
        className={`rounded-xl overflow-hidden transition-all ${
          isFlashing ? "ring-2 ring-green-400 ring-offset-2 ring-offset-[#0a0a1a]" : ""
        }`}
        style={{
          backgroundColor: elapsedInfo.bgTint || "#1a1a2e",
          borderLeft: `5px solid ${BORDER_COLORS[order.status] || "#6b7280"}`,
        }}
      >
        {/* Animation flash pour nouvelles commandes */}
        {isFlashing && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
            animate={{ opacity: [0.3, 0, 0.3, 0] }}
            transition={{ duration: 2, repeat: 2 }}
          />
        )}

        {/* Animation pulsante si urgent (> 15 min) */}
        {elapsedInfo.urgent && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ border: "2px solid rgba(239, 68, 68, 0.3)" }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <div className="p-3 relative">
          {/* ── En-tête : numéro + type + temps ── */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Numéro de commande — GROS */}
              <span className="text-white font-mono font-black text-xl md:text-2xl">
                #{order.id.slice(0, 4).toUpperCase()}
              </span>

              {/* Badge type */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  isLivraison
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {isLivraison ? (
                  <>
                    <Truck className="w-3 h-3" />
                    Livraison
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3" />
                    À emporter
                  </>
                )}
              </span>
            </div>

            {/* Temps écoulé */}
            <span
              className={`text-sm md:text-base font-bold tabular-nums whitespace-nowrap ${elapsedInfo.color}`}
            >
              {elapsedInfo.label}
            </span>
          </div>

          {/* ── Nom du client ── */}
          <p className="text-white font-bold text-lg md:text-xl mb-2 truncate">
            {order.customer_name || "Client anonyme"}
          </p>

          {/* ── Articles — GROS et lisibles ── */}
          <div className="space-y-1 mb-2">
            {items.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-baseline gap-2"
              >
                <span className="text-white/90 font-bold text-lg md:text-xl tabular-nums min-w-[2.5rem]">
                  {item.quantity}x
                </span>
                <span className="text-white/90 font-semibold text-lg md:text-xl">
                  {item.name}
                </span>
                {item.modifications && item.modifications.length > 0 && (
                  <span className="text-amber-300/70 text-sm">
                    ({item.modifications.join(", ")})
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── Instructions spéciales ── */}
          {order.special_instructions && (
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-2 mb-2">
              <p className="text-amber-300 font-semibold text-base md:text-lg">
                ⚠ {order.special_instructions}
              </p>
            </div>
          )}

          {/* ── Bouton d'action ── */}
          {action && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAction}
              disabled={isUpdating}
              className="w-full py-3 md:py-4 rounded-lg text-white font-black text-base md:text-lg uppercase tracking-wider transition-colors disabled:opacity-50"
              style={{
                backgroundColor: isUpdating
                  ? "#4b5563"
                  : action.bgColor,
              }}
              onMouseEnter={(e) => {
                if (!isUpdating)
                  (e.target as HTMLElement).style.backgroundColor =
                    action.hoverColor;
              }}
              onMouseLeave={(e) => {
                if (!isUpdating)
                  (e.target as HTMLElement).style.backgroundColor =
                    action.bgColor;
              }}
            >
              {isUpdating ? "..." : action.label}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
