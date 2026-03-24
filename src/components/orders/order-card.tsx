"use client";

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
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./order-status-badge";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

// Steps de la progress bar
const allSteps = ["nouvelle", "en_preparation", "prete", "done"] as const;
function getProgress(status: OrderStatus): number {
  switch (status) {
    case "nouvelle":
      return 0;
    case "en_preparation":
      return 1;
    case "prete":
      return 2;
    case "livree":
    case "recuperee":
      return 3;
    case "annulee":
      return -1;
    default:
      return 0;
  }
}

const stepLabels = ["Reçue", "En cuisine", "Prête", "Terminée"];

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  index?: number;
  isNew?: boolean;
}

export function OrderCard({
  order,
  onStatusChange,
  index = 0,
  isNew = false,
}: OrderCardProps) {
  const items = (order.items || []) as OrderItem[];
  const itemsSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const isLivraison = order.order_type === "livraison";
  const progress = getProgress(order.status);
  const isDone = isTerminalStatus(order.status);

  // Heure estimée
  const estimatedTime = isLivraison
    ? order.delivery_time_estimate
    : order.pickup_time;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      layout
    >
      <Card
        className={`shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden relative ${
          isNew ? "ring-2 ring-green/40" : ""
        } ${isDone ? "opacity-60" : ""}`}
      >
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
              <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                <Timer className="w-3.5 h-3.5" />
                {isLivraison ? "Livrer" : "Retrait"} {estimatedTime}
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
          {/* Progress bar */}
          {!isDone && order.status !== "annulee" && (
            <div className="flex items-center gap-1 mb-3">
              {allSteps.map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                      i <= progress ? "bg-violet" : "bg-border"
                    }`}
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

              {/* Articles */}
              <p className="text-sm text-muted-foreground line-clamp-1">
                {itemsSummary}
              </p>

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
                    className={`${next.color} text-xs font-semibold shadow-sm`}
                    onClick={(e) => {
                      e.preventDefault();
                      onStatusChange(order.id, next.status);
                    }}
                  >
                    {next.label}
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
