"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  Search,
  Download,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { OrderCard } from "./order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { isTerminalStatus, statusToastLabels } from "@/lib/orders/status";
import type { Order, OrderStatus } from "@/lib/supabase/types";

const statusFilters: { label: string; value: string }[] = [
  { label: "En cours", value: "active" },
  { label: "Nouvelles", value: "nouvelle" },
  { label: "En cuisine", value: "en_preparation" },
  { label: "Prêtes", value: "prete" },
  { label: "Terminées", value: "done" },
];

export function OrderList({
  initialOrders,
  restaurantId,
}: {
  initialOrders: Order[];
  restaurantId?: string | null;
}) {
  const { orders, updateOrderStatus } = useRealtimeOrders(initialOrders, restaurantId);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const prevCountRef = useRef(initialOrders.length);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");
  }, []);

  // Notification son + toast + flash quand nouvelle commande
  useEffect(() => {
    if (orders.length > prevCountRef.current) {
      const newOrder = orders[0];
      audioRef.current?.play().catch(() => {});
      toast.success(
        `Nouvelle commande de ${newOrder.customer_name || "Client"}`,
        {
          description: `${
            newOrder.order_type === "livraison" ? "🚚 Livraison" : "🛍️ À emporter"
          } — ${(newOrder.items as unknown[])?.length || 0} article(s) — ${
            newOrder.total_amount
              ? Number(newOrder.total_amount).toFixed(0) + "€"
              : ""
          }`,
          duration: 8000,
        }
      );

      setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(newOrder.id);
          return next;
        });
      }, 4000);
    }
    prevCountRef.current = orders.length;
  }, [orders.length, orders]);

  // Filtrer par statut + recherche texte
  const filtered = useMemo(() => {
    let result = orders;

    // Filtre statut
    if (filter === "active") {
      result = result.filter((o) => !isTerminalStatus(o.status));
    } else if (filter === "done") {
      result = result.filter((o) => isTerminalStatus(o.status));
    } else {
      result = result.filter((o) => o.status === filter);
    }

    // Recherche texte (nom, téléphone, numéro commande)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.id.slice(0, 6).toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, filter, search]);

  // Stats
  const nouvelleCount = orders.filter((o) => o.status === "nouvelle").length;
  const enPrepCount = orders.filter((o) => o.status === "en_preparation").length;
  const preteCount = orders.filter((o) => o.status === "prete").length;
  const livraisonCount = orders.filter(
    (o) =>
      o.order_type === "livraison" && !isTerminalStatus(o.status)
  ).length;

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    const oldOrder = orders.find((o) => o.id === orderId);
    const oldStatus = oldOrder?.status;
    updateOrderStatus(orderId, status);

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast(statusToastLabels[status] || "Statut mis à jour");
    } else {
      if (oldStatus) updateOrderStatus(orderId, oldStatus);
      toast.error("Erreur lors de la mise à jour");
    }
  }

  // Export CSV
  function handleExportCSV() {
    const rows = [
      ["#", "Client", "Téléphone", "Type", "Articles", "Total", "Statut", "Date"],
    ];
    for (const o of filtered) {
      const items = (o.items || []) as { name: string; quantity: number }[];
      rows.push([
        o.id.slice(0, 6).toUpperCase(),
        o.customer_name || "",
        o.customer_phone || "",
        o.order_type || "",
        items.map((i) => `${i.quantity}x ${i.name}`).join("; "),
        o.total_amount != null ? Number(o.total_amount).toFixed(2) : "",
        o.status,
        new Date(o.created_at).toLocaleString("fr-BE"),
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export téléchargé");
  }

  return (
    <div>
      {/* Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="orders-pipeline">
        <StatsChip icon={Clock} label="À accepter" count={nouvelleCount} color="text-green" bgColor="bg-green/6" active={nouvelleCount > 0} />
        <StatsChip icon={ChefHat} label="En cuisine" count={enPrepCount} color="text-amber-600" bgColor="bg-amber-500/6" active={enPrepCount > 0} />
        <StatsChip icon={CheckCircle2} label="Prêtes" count={preteCount} color="text-blue" bgColor="bg-blue/6" active={preteCount > 0} />
        <StatsChip icon={Truck} label="Livraisons" count={livraisonCount} color="text-violet" bgColor="bg-violet/6" active={livraisonCount > 0} />
      </div>

      {/* Barre de recherche + filtres + export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Chercher par nom, téléphone, n° commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {statusFilters.map((f) => {
              let count = 0;
              if (f.value === "active") count = orders.filter((o) => !isTerminalStatus(o.status)).length;
              else if (f.value === "done") count = orders.filter((o) => isTerminalStatus(o.status)).length;
              else count = orders.filter((o) => o.status === f.value).length;
              return (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                  <span className="ml-1 text-xs opacity-60">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" />
          CSV
        </Button>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={ShoppingBag}
                title={search ? "Aucun résultat" : "Aucune commande"}
                description={
                  search
                    ? `Aucune commande ne correspond à "${search}"`
                    : "Les nouvelles commandes apparaîtront ici en temps réel."
                }
              />
            </motion.div>
          ) : (
            filtered.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                index={i}
                isNew={newOrderIds.has(order.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Chip de stats ──

function StatsChip({
  icon: Icon, label, count, color, bgColor, active = false,
}: {
  icon: React.ElementType; label: string; count: number; color: string; bgColor: string; active?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${active ? `${bgColor} border-current/10` : "bg-muted/30 border-transparent"}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? color : "text-muted-foreground/40"}`} />
      <div className="min-w-0">
        <span className={`text-lg font-bold tabular-nums block leading-none ${active ? color : "text-muted-foreground/40"}`}>{count}</span>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
  );
}
