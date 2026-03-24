"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Order, OrderStatus } from "@/lib/supabase/types";

const nextStatus: Partial<
  Record<OrderStatus, { label: string; status: OrderStatus }>
> = {
  nouvelle: { label: "Lancer la préparation", status: "en_preparation" },
  en_preparation: { label: "Marquer prête", status: "prete" },
  prete: { label: "Marquer récupérée", status: "recuperee" },
};

export function OrderActions({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = nextStatus[order.status];

  async function handleStatusChange(status: OrderStatus) {
    setLoading(true);
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast.success("Statut mis à jour");
      router.refresh();
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setLoading(false);
  }

  // Commande terminée ou annulée — pas d'actions
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
          disabled={loading}
          onClick={() => handleStatusChange(next.status)}
        >
          {next.label}
        </Button>
      )}
    </div>
  );
}
