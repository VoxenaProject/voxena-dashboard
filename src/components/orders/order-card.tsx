"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus, Customer } from "@/lib/supabase/types";

// Progression du statut (pour la barre fine)
function getProgress(status: string): number {
  switch (status) {
    case "nouvelle": return 20;
    case "en_preparation": return 50;
    case "prete": return 75;
    case "en_livraison": return 90;
    case "livree": case "recuperee": return 100;
    default: return 0;
  }
}

// Couleur de la progress bar
const progressColors: Record<string, string> = {
  nouvelle: "bg-green",
  en_preparation: "bg-amber-500",
  prete: "bg-blue",
  en_livraison: "bg-violet",
  livree: "bg-muted-foreground/30",
  recuperee: "bg-muted-foreground/30",
  annulee: "bg-red-500",
};

// Couleurs du point de statut
const statusDotColors: Record<string, string> = {
  nouvelle: "bg-green",
  en_preparation: "bg-amber-500",
  prete: "bg-blue",
  en_livraison: "bg-violet",
  livree: "bg-muted-foreground/30",
  recuperee: "bg-muted-foreground/30",
  annulee: "bg-red-500",
};

// Labels de statut lisibles
const statusLabels: Record<string, string> = {
  nouvelle: "Nouvelle",
  en_preparation: "En préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  recuperee: "Récupérée",
  annulee: "Annulée",
};

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, status: OrderStatus) => void | Promise<void>;
  index?: number;
  isNew?: boolean;
  customers?: Customer[];
}

export function OrderCard({
  order,
  onStatusChange,
  index = 0,
  isNew = false,
  customers = [],
}: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const items = (order.items || []) as OrderItem[];
  const itemsSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const isLivraison = order.order_type === "livraison";
  const isDone = isTerminalStatus(order.status);

  // Heure de création formatée
  const createdTime = useMemo(() => {
    const d = new Date(order.created_at);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }, [order.created_at]);

  // Type de commande en texte
  const orderTypeLabel = isLivraison ? "Livraison" : "À emporter";

  // Accent latéral par type
  const typeAccent = isLivraison ? "border-l-green" : "border-l-blue";

  // Timer de retard : minutes écoulées depuis la création
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  useEffect(() => {
    const update = () => setMinutesElapsed(Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  // Déterminer si la commande est en retard (> 30 min emporter, > 45 min livraison)
  const maxMinutes = isLivraison ? 45 : 30;
  const isLate = !isDone && order.status !== "annulee" && minutesElapsed > maxMinutes;
  const isUrgent = !isDone && order.status !== "annulee" && minutesElapsed > maxMinutes + 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      layout
    >
      <div
        className={`border border-border border-l-[3px] ${typeAccent} rounded-2xl p-5 bg-card hover:shadow-card-hover transition-shadow duration-200
          ${isNew ? "ring-1 ring-violet/30" : ""}
          ${isDone ? "opacity-60" : ""}
          ${isUrgent ? "bg-red-500/[0.02]" : isLate ? "bg-amber-500/[0.02]" : ""}
        `}
      >
        {/* Progress bar fine */}
        {!isDone && order.status !== "annulee" && (
          <div className="h-[2px] bg-border/50 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColors[order.status] || "bg-muted"}`}
              style={{ width: `${getProgress(order.status)}%` }}
            />
          </div>
        )}

        {/* Ligne 1 : heure, type, timer, ID */}
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground font-mono">
            {createdTime}
          </span>
          <span className="text-xs text-muted-foreground ml-3">
            {orderTypeLabel}
          </span>
          {/* Timer — minutes écoulées */}
          {!isDone && order.status !== "annulee" && (
            <span className={`text-[11px] font-mono ml-3 ${
              isUrgent ? "text-red-500 font-semibold" : isLate ? "text-amber-600 font-medium" : "text-muted-foreground/50"
            }`}>
              {minutesElapsed} min
            </span>
          )}
          <span className="text-xs text-muted-foreground/50 font-mono ml-auto">
            #{order.id.slice(0, 4).toUpperCase()}
          </span>
        </div>

        {/* Ligne 2 : nom client + total */}
        <div className="mt-3 flex justify-between items-baseline">
          <Link href={`/orders/${order.id}`} className="min-w-0">
            <span className="text-base font-medium truncate">
              {order.customer_name || "Client anonyme"}
            </span>
          </Link>
          {order.total_amount != null && (
            <span className="text-lg font-semibold font-mono tabular-nums flex-shrink-0 ml-3">
              {Number(order.total_amount).toFixed(2).replace(".", ",")}€
            </span>
          )}
        </div>

        {/* Ligne 3 : articles */}
        <div className="mt-1">
          <p className="text-sm text-muted-foreground truncate">
            {itemsSummary}
          </p>

          {/* Adresse de livraison — bien visible */}
          {isLivraison && order.delivery_address && (
            <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-green/[0.04] border border-green/10">
              <MapPin className="w-3.5 h-3.5 text-green flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/80">{order.delivery_address}</span>
            </div>
          )}

          {/* Instructions spéciales */}
          {order.special_instructions && (
            <p className="text-xs text-muted-foreground/70 italic mt-1 truncate">
              {order.special_instructions}
            </p>
          )}
        </div>

        {/* Ligne 4 : statut + action */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center">
            <span
              className={`w-2 h-2 rounded-full ${statusDotColors[order.status] || "bg-muted-foreground/30"}`}
            />
            <span className="text-xs text-muted-foreground ml-2">
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          {next && onStatusChange && (
            <button
              disabled={isUpdating}
              className="text-xs font-medium text-violet hover:text-violet/80 transition-colors flex items-center gap-0.5 disabled:opacity-50"
              onClick={async (e) => {
                e.preventDefault();
                if (isUpdating) return;
                setIsUpdating(true);
                try {
                  await onStatusChange(order.id, next.status);
                } finally {
                  setIsUpdating(false);
                }
              }}
            >
              {isUpdating ? "..." : next.label}
              {!isUpdating && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
