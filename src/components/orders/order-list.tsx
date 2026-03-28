"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  ChefHat,
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
import type { Order, OrderStatus, Customer } from "@/lib/supabase/types";

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
  customers = [],
  selectedDate,
}: {
  initialOrders: Order[];
  restaurantId?: string | null;
  customers?: Customer[];
  selectedDate?: string;
}) {
  const { orders, updateOrderStatus, newOrderIds, showBanner } = useRealtimeOrders(initialOrders, restaurantId, selectedDate);
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "emporter" | "livraison">("all");
  const [search, setSearch] = useState("");

  // Filtrer par statut + type + recherche texte
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

    // Filtre type (emporter/livraison)
    if (typeFilter !== "all") {
      result = result.filter((o) => o.order_type === typeFilter);
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

    // Trier par heure de création (plus récente en premier)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [orders, filter, typeFilter, search]);

  // Grouper les commandes par tranche horaire
  const groupedOrders = useMemo(() => {
    const groups: { label: string; orders: typeof filtered }[] = [];
    let currentHour = -1;

    for (const order of filtered) {
      const h = new Date(order.created_at).getHours();
      if (h !== currentHour) {
        currentHour = h;
        groups.push({
          label: `${h.toString().padStart(2, "0")}h`,
          orders: [order],
        });
      } else {
        groups[groups.length - 1].orders.push(order);
      }
    }

    return groups;
  }, [filtered]);

  // Stats
  const activeCount = orders.filter((o) => !isTerminalStatus(o.status)).length;
  const emporterCount = orders.filter((o) => o.order_type === "emporter" && !isTerminalStatus(o.status)).length;
  const livraisonCount = orders.filter((o) => o.order_type === "livraison" && !isTerminalStatus(o.status)).length;
  const nouvelleCount = orders.filter((o) => o.status === "nouvelle").length;
  const enPrepCount = orders.filter((o) => o.status === "en_preparation").length;
  const preteCount = orders.filter((o) => o.status === "prete").length;

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
      {/* Banner nouvelle commande — simple fade */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-green/20 bg-green/[0.03] p-4 mb-6"
          >
            <p className="text-sm font-medium text-green">
              Nouvelle commande — {showBanner.customer_name || "Client"} —{" "}
              {showBanner.total_amount ? `${Number(showBanner.total_amount).toFixed(0)}€` : ""} —{" "}
              {showBanner.order_type === "livraison" ? "Livraison" : "À emporter"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline stats — pills colorées subtiles */}
      <div className="flex items-center gap-2 mb-6 flex-wrap" data-tour="orders-pipeline">
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet/[0.06] text-violet">
            <span className="w-1.5 h-1.5 rounded-full bg-violet" />
            {activeCount} en cours
          </span>
        )}
        {nouvelleCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green/[0.06] text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            {nouvelleCount} nouvelle{nouvelleCount > 1 ? "s" : ""}
          </span>
        )}
        {enPrepCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/[0.06] text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {enPrepCount} en cuisine
          </span>
        )}
        {preteCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue/[0.06] text-blue">
            <span className="w-1.5 h-1.5 rounded-full bg-blue" />
            {preteCount} prête{preteCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Toggle emporter / livraison */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-muted/50 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            typeFilter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Toutes ({activeCount})
        </button>
        <button
          onClick={() => setTypeFilter("emporter")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            typeFilter === "emporter" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue" />
          À emporter ({emporterCount})
        </button>
        <button
          onClick={() => setTypeFilter("livraison")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            typeFilter === "livraison" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" />
          Livraison ({livraisonCount})
        </button>
      </div>

      {/* Barre de recherche + filtres + export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Chercher par nom, téléphone, n° commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
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
                  <span className="text-xs">{f.label}</span>
                  <span className="ml-1 text-xs opacity-60">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/kitchen"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-xl border border-border bg-background text-[0.8rem] font-medium hover:bg-muted hover:text-foreground transition-all"
          >
            <ChefHat className="w-3.5 h-3.5" />
            Mode cuisine
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Liste groupée par heure */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={search ? "Aucun résultat" : "Aucune commande"}
            description={
              search
                ? `Aucune commande ne correspond à "${search}"`
                : "Les nouvelles commandes apparaîtront ici en temps réel."
            }
          />
        ) : (
          groupedOrders.map((group) => (
            <div key={group.label}>
              {/* Header de tranche horaire */}
              <div className="sticky top-0 z-10 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40 px-1">
                  {group.label}
                </span>
              </div>
              {/* Commandes de cette tranche */}
              <div className="space-y-2 mb-4">
                <AnimatePresence mode="popLayout">
                  {group.orders.map((order, i) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      index={i}
                      isNew={newOrderIds.has(order.id)}
                      customers={customers}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
