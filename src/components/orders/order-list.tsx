"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { OrderCard } from "./order-card";
import type { Order, OrderStatus } from "@/lib/supabase/types";

const filters: { label: string; value: string }[] = [
  { label: "Toutes", value: "all" },
  { label: "Nouvelles", value: "nouvelle" },
  { label: "En préparation", value: "en_preparation" },
  { label: "Prêtes", value: "prete" },
  { label: "Historique", value: "done" },
];

export function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const orders = useRealtimeOrders(initialOrders);
  const [filter, setFilter] = useState("all");
  const prevCountRef = useRef(initialOrders.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
  }, []);

  // Notification son + toast quand nouvelle commande
  useEffect(() => {
    if (orders.length > prevCountRef.current) {
      const newOrder = orders[0];
      audioRef.current?.play().catch(() => {});
      toast.success(
        `Nouvelle commande de ${newOrder.customer_name || "Client"}`,
        {
          description: `${
            newOrder.order_type === "livraison" ? "Livraison" : "À emporter"
          } — ${(newOrder.items as unknown[])?.length || 0} article(s)`,
        }
      );
    }
    prevCountRef.current = orders.length;
  }, [orders.length, orders]);

  // Filtrer les commandes
  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "done")
      return ["livree", "recuperee", "annulee"].includes(o.status);
    return o.status === filter;
  });

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast.success("Statut mis à jour");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  return (
    <div>
      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              {f.value !== "all" && f.value !== "done" && (
                <span className="ml-1.5 text-xs opacity-60">
                  {orders.filter((o) => o.status === f.value).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Aucune commande</p>
            <p className="text-sm">
              Les nouvelles commandes apparaîtront ici en temps réel.
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
