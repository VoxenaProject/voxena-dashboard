"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/supabase/types";

export function useRealtimeOrders(
  initialOrders: Order[],
  restaurantId?: string | null
) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const supabase = createClient();
  const knownIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  useEffect(() => {
    setOrders(initialOrders);
    knownIdsRef.current = new Set(initialOrders.map((o) => o.id));
  }, [initialOrders]);

  useEffect(() => {
    // Filtre realtime par restaurant_id si disponible
    const filter = restaurantId
      ? `restaurant_id=eq.${restaurantId}`
      : undefined;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const newOrder = payload.new as Order;
          if (!knownIdsRef.current.has(newOrder.id)) {
            knownIdsRef.current.add(newOrder.id);
            setOrders((prev) => [newOrder, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
        }
      )
      .subscribe();

    // Polling fallback toutes les 10s (au cas où le realtime ne passe pas)
    const pollInterval = setInterval(async () => {
      if (!restaurantId) return;
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (data) {
        const newOrders = data.filter((o) => !knownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          newOrders.forEach((o) => knownIdsRef.current.add(o.id));
          setOrders((prev) => [...newOrders, ...prev]);
        }
        // Mettre à jour les statuts des commandes existantes
        setOrders((prev) =>
          prev.map((existing) => {
            const updated = data.find((d) => d.id === existing.id);
            return updated ? { ...existing, ...updated } : existing;
          })
        );
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [supabase, restaurantId]);

  // Mise à jour optimiste avec rollback
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      // Sauvegarder l'état précédent pour rollback
      const previousOrders = orders;
      // Update optimiste
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          throw new Error("Échec mise à jour");
        }
      } catch {
        // Rollback en cas d'erreur
        setOrders(previousOrders);
        throw new Error("Échec mise à jour du statut");
      }
    },
    [orders]
  );

  return { orders, updateOrderStatus };
}
