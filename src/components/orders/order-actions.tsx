"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getNextAction, statusToastLabels } from "@/lib/orders/status";
import type { Order, OrderStatus } from "@/lib/supabase/types";

export function OrderActions({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = getNextAction(order.status, order.order_type);

  async function handleStatusChange(status: OrderStatus) {
    setLoading(true);
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast(statusToastLabels[status] || "Statut mis à jour");
      router.refresh();
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setLoading(false);
  }

  if (!next && order.status !== "prete") return null;

  return (
    <div className="flex items-center gap-2">
      {order.status !== "annulee" &&
        order.status !== "livree" &&
        order.status !== "recuperee" && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleStatusChange("annulee")}
          >
            Annuler
          </Button>
        )}
      {next && (
        <Button
          size="sm"
          className={next.color}
          disabled={loading}
          onClick={() => handleStatusChange(next.status)}
        >
          {next.label}
        </Button>
      )}
    </div>
  );
}
