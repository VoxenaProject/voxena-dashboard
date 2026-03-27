"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/supabase/types";

/**
 * Notification pour une nouvelle commande.
 * Appelé UNIQUEMENT depuis le realtime INSERT ou le polling.
 */
function notifyNewOrder(order: Order) {
  // Son
  try {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.play().catch(() => {});
    setTimeout(() => audio.play().catch(() => {}), 1500);
  } catch {}

  // Toast
  toast.success(
    `Nouvelle commande de ${order.customer_name || "Client"} !`,
    {
      description: `${
        order.order_type === "livraison" ? "Livraison" : "À emporter"
      } — ${(order.items as unknown[])?.length || 0} article(s)${
        order.total_amount ? " — " + Number(order.total_amount).toFixed(0) + "€" : ""
      }`,
      duration: 8000,
    }
  );

  // Notification navigateur
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`Nouvelle commande — ${order.customer_name || "Client"}`, {
        body: `${order.order_type === "livraison" ? "Livraison" : "À emporter"}`,
        icon: "/favicon.ico",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
}

export function useRealtimeOrders(
  initialOrders: Order[],
  restaurantId?: string | null,
  selectedDate?: string
) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const supabase = createClient();
  const knownIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState<Order | null>(null);

  // Quand les données serveur changent (changement de date), reset sans notifier
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
            // Notification — VRAIE nouvelle commande (realtime INSERT)
            notifyNewOrder(newOrder);
            setShowBanner(newOrder);
            setTimeout(() => setShowBanner(null), 6000);
            setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
            setTimeout(() => {
              setNewOrderIds((prev) => {
                const next = new Set(prev);
                next.delete(newOrder.id);
                return next;
              });
            }, 8000);
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

    // Polling fallback toutes les 10s — poll la date affichée
    const pollDate = selectedDate || new Date().toISOString().split("T")[0];
    const pollNextDay = new Date(pollDate + "T12:00:00");
    pollNextDay.setDate(pollNextDay.getDate() + 1);
    const pollNextDayStr = pollNextDay.toISOString().split("T")[0];

    const pollInterval = setInterval(async () => {
      if (!restaurantId) return;
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", `${pollDate}T00:00:00`)
        .lt("created_at", `${pollNextDayStr}T00:00:00`)
        .order("created_at", { ascending: false });

      if (data) {
        const newOrders = data.filter((o) => !knownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          newOrders.forEach((o) => knownIdsRef.current.add(o.id));
          setOrders((prev) => [...newOrders, ...prev]);
          // Notification pour la première nouvelle commande (polling)
          notifyNewOrder(newOrders[0]);
          setShowBanner(newOrders[0]);
          setTimeout(() => setShowBanner(null), 6000);
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
  }, [supabase, restaurantId, selectedDate]);

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
          const data = await res.json().catch(() => ({}));
          // Si c'est une erreur de transition (400), ne pas rollback — le realtime corrigera
          if (res.status === 400) {
            console.warn("[orders] Transition refusée:", data.error);
            return;
          }
          throw new Error(data.error || "Échec mise à jour");
        }
      } catch (err) {
        // Rollback en cas d'erreur réseau
        setOrders(previousOrders);
        console.error("[orders] Erreur mise à jour:", err);
      }
    },
    [orders]
  );

  return { orders, updateOrderStatus, newOrderIds, showBanner };
}
