"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ShoppingBag, Truck, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./order-status-badge";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

// Prochains statuts possibles
const nextStatus: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  nouvelle: { label: "Préparer", status: "en_preparation" },
  en_preparation: { label: "Prête", status: "prete" },
  prete: { label: "Récupérée", status: "recuperee" },
};

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const items = (order.items || []) as OrderItem[];
  const itemsSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");
  const moreCount = items.length - 3;
  const next = nextStatus[order.status];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor:
          order.status === "nouvelle"
            ? "#1a9a5a"
            : order.status === "en_preparation"
            ? "#f59e0b"
            : order.status === "prete"
            ? "#74a3ff"
            : "#9ca3af",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <Link href={`/orders/${order.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-bold text-sm truncate">
              {order.customer_name || "Client anonyme"}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            {order.order_type === "livraison" ? (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Livraison
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" /> À emporter
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(order.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {itemsSummary}
            {moreCount > 0 && ` +${moreCount} autre${moreCount > 1 ? "s" : ""}`}
          </p>

          {order.total_amount != null && (
            <p className="font-mono text-sm font-bold mt-1">
              {Number(order.total_amount).toFixed(2)}€
            </p>
          )}
        </Link>

        {next && onStatusChange && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onStatusChange(order.id, next.status);
            }}
          >
            {next.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
