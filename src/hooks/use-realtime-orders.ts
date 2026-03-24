"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/supabase/types";

export function useRealtimeOrders(
  initialOrders: Order[],
  restaurantId?: string | null
) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const supabase = createClient();

  useEffect(() => {
    setOrders(initialOrders);
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
          setOrders((prev) => [newOrder, ...prev]);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId]);

  // Mise à jour optimiste
  const updateOrderStatus = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    },
    []
  );

  return { orders, updateOrderStatus };
}
