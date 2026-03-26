"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ShoppingBag,
  Truck,
  Clock,
  Phone,
  MapPin,
  ChevronRight,
  Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./order-status-badge";
import { StatusFlash } from "@/components/ui/success-animation";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus, Customer } from "@/lib/supabase/types";

// Steps de la progress bar — adapté au type
function getStepCount(orderType?: string | null): number {
  return orderType === "livraison" ? 5 : 4;
}

function getProgress(status: OrderStatus): number {
  switch (status) {
    case "nouvelle":
      return 0;
    case "en_preparation":
      return 1;
    case "prete":
      return 2;
    case "en_livraison":
      return 3;
    case "livree":
    case "recuperee":
      return 4; // terminal
    case "annulee":
      return -1;
    default:
      return 0;
  }
}

// Couleur de flash selon le nouveau statut
const statusFlashColors: Record<string, string> = {
  en_preparation: "rgba(66, 55, 196, 0.08)",
  prete: "rgba(26, 154, 90, 0.08)",
  en_livraison: "rgba(116, 163, 255, 0.08)",
  livree: "rgba(26, 154, 90, 0.1)",
  recuperee: "rgba(26, 154, 90, 0.1)",
  annulee: "rgba(239, 68, 68, 0.08)",
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
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showFlash, setShowFlash] = React.useState(false);
  const [flashColor, setFlashColor] = React.useState("rgba(66, 55, 196, 0.08)");
  const prevStatusRef = React.useRef(order.status);
  const [showTooltip, setShowTooltip] = React.useState(false);

  const items = (order.items || []) as OrderItem[];
  const itemsSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const isLivraison = order.order_type === "livraison";
  const progress = getProgress(order.status);
  const isDone = isTerminalStatus(order.status);

  // Historique client — match par téléphone
  const customer = order.customer_phone
    ? customers.find((c) => c.phone === order.customer_phone)
    : undefined;

  // Heure estimée — fournie par l'agent ou calculée (+30min par défaut)
  const agentTime = isLivraison
    ? order.delivery_time_estimate
    : order.pickup_time;

  const estimatedTime = agentTime || (() => {
    const d = new Date(order.created_at);
    d.setMinutes(d.getMinutes() + 30);
    return `~${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  })();

  // Détecter les changements de statut pour le flash
  React.useEffect(() => {
    if (prevStatusRef.current !== order.status) {
      setFlashColor(statusFlashColors[order.status] || "rgba(66, 55, 196, 0.08)");
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 600);
      prevStatusRef.current = order.status;
      return () => clearTimeout(t);
    }
  }, [order.status]);

  // Détecter si l'heure est urgente (<5 min)
  const isUrgent = React.useMemo(() => {
    if (!estimatedTime || isDone) return false;
    // Essayer de parser l'heure (format HH:MM ou ~HH:MM)
    const cleanTime = estimatedTime.replace("~", "");
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;
    const now = new Date();
    const target = new Date();
    target.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
    const diffMin = (target.getTime() - now.getTime()) / 60000;
    return diffMin >= 0 && diffMin < 5;
  }, [estimatedTime, isDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      layout
    >
      <Card
        className={`shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden relative
          hover:-translate-y-0.5
          ${isNew ? "ring-2 ring-green/40" : ""}
          ${isDone ? "opacity-60" : ""}
        `}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        {/* Flash overlay lors d'un changement de statut */}
        <StatusFlash active={showFlash} color={flashColor} />

        {/* Bandeau type + heure */}
        <div
          className={`px-4 py-2 flex items-center justify-between ${
            isLivraison
              ? "bg-blue/6 border-b border-blue/10"
              : "bg-amber-500/6 border-b border-amber-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {isLivraison ? (
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue" />
                <span className="text-xs font-bold text-blue uppercase tracking-wide">
                  Livraison
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                  À emporter
                </span>
              </div>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/60">
              #{order.id.slice(0, 6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {estimatedTime && (
              <div className={`flex items-center gap-1 text-xs font-semibold text-foreground ${isUrgent ? "animate-urgent text-red-600" : ""}`}>
                <Timer className="w-3.5 h-3.5" />
                {isLivraison ? "Livrer" : "Retrait"} {estimatedTime}
                {isUrgent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot-live" />
                )}
              </div>
            )}
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(order.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Progress bar avec animation de largeur */}
          {!isDone && order.status !== "annulee" && (
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: getStepCount(order.order_type) }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ease-out ${
                      i <= progress ? "bg-violet" : "bg-border"
                    }`}
                    style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            {/* Infos principales */}
            <Link href={`/orders/${order.id}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-heading font-semibold text-[15px] truncate">
                  {order.customer_name || "Client anonyme"}
                </span>
                <OrderStatusBadge
                  status={order.status}
                  orderType={order.order_type}
                />
                {/* Badge visite client */}
                {customer && customer.visit_count > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue/8 text-blue/80">
                    {customer.visit_count}ème visite
                  </span>
                )}
              </div>

              {/* Méta-infos */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                {order.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {order.customer_phone}
                  </span>
                )}
                {isLivraison && order.delivery_address && (
                  <span className="flex items-center gap-1 truncate max-w-[220px]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {order.delivery_address}
                  </span>
                )}
              </div>

              {/* Articles avec tooltip au hover */}
              <div
                className="relative"
                onMouseEnter={() => items.length > 2 && setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {itemsSummary}
                </p>
                {/* Tooltip détaillé des articles */}
                <AnimatePresence>
                  {showTooltip && items.length > 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground max-w-[280px]"
                    >
                      {items.map((item, idx) => (
                        <div key={idx} className="py-0.5">
                          <span className="font-medium text-foreground">{item.quantity}x</span>{" "}
                          {item.name}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Instructions spéciales */}
              {order.special_instructions && (
                <p className="text-xs text-amber-600 bg-amber-500/8 rounded px-2 py-1 mt-2 line-clamp-1">
                  ⚠ {order.special_instructions}
                </p>
              )}
            </Link>

            {/* Colonne droite */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {order.total_amount != null && (
                <span className="font-mono text-lg font-bold tabular-nums">
                  {Number(order.total_amount).toFixed(0)}€
                </span>
              )}

              {next && onStatusChange && (
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    disabled={isUpdating}
                    className={`${next.color} text-xs font-semibold shadow-sm btn-lift`}
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
                  </Button>
                </motion.div>
              )}

              <Link
                href={`/orders/${order.id}`}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                Détails
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
