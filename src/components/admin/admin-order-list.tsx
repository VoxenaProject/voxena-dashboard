"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Download, X, ShoppingBag, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import type { Order, OrderItem } from "@/lib/supabase/types";

interface AdminOrderListProps {
  orders: (Order & { restaurants: { name: string } | null })[];
  restaurants: { id: string; name: string }[];
}

export function AdminOrderList({ orders, restaurants }: AdminOrderListProps) {
  const [search, setSearch] = useState("");
  const [restoFilter, setRestoFilter] = useState("");

  const filtered = useMemo(() => {
    let result = orders;

    if (restoFilter) {
      result = result.filter((o) => o.restaurant_id === restoFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.id.slice(0, 6).toLowerCase().includes(q) ||
          o.restaurants?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, search, restoFilter]);

  function handleExport() {
    const rows = [["#", "Restaurant", "Client", "Téléphone", "Type", "Total", "Statut", "Date"]];
    for (const o of filtered) {
      rows.push([
        o.id.slice(0, 6).toUpperCase(),
        o.restaurants?.name || "",
        o.customer_name || "",
        o.customer_phone || "",
        o.order_type || "",
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
    a.download = `commandes-admin-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export téléchargé");
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nom, téléphone, restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={restoFilter}
          onChange={(e) => setRestoFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="">Tous les restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {filtered.length} commande{filtered.length > 1 ? "s" : ""}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande"
          description={search ? `Aucun résultat pour "${search}"` : "Pas encore de commandes."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card key={order.id} className="shadow-card p-3 hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">
                        {order.customer_name || "Client"}
                      </span>
                      <OrderStatusBadge status={order.status} orderType={order.order_type} />
                      {order.order_type === "livraison" ? (
                        <Truck className="w-3.5 h-3.5 text-blue" />
                      ) : (
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        {order.restaurants?.name || "—"}
                      </span>
                      <span>
                        {(order.items as OrderItem[]).length} article{(order.items as OrderItem[]).length > 1 ? "s" : ""}
                      </span>
                      <span>
                        {format(new Date(order.created_at), "d MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {order.total_amount != null && (
                    <span className="font-mono text-sm font-bold">
                      {Number(order.total_amount).toFixed(0)}€
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{order.id.slice(0, 6).toUpperCase()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
