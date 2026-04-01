"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus, Customer } from "@/lib/supabase/types";

interface Props {
  initialOrders: Order[];
  restaurantId: string;
  customers: Customer[];
  selectedDate: string;
}

const statusGroups = [
  { key: "active", label: "En cours", filter: (o: Order) => !isTerminalStatus(o.status) && o.status !== "annulee" },
  { key: "nouvelle", label: "Nouvelles", filter: (o: Order) => o.status === "nouvelle" },
  { key: "prete", label: "Prêtes", filter: (o: Order) => o.status === "prete" },
  { key: "done", label: "Terminées", filter: (o: Order) => isTerminalStatus(o.status) || o.status === "annulee" },
];

const statusDot: Record<string, string> = {
  nouvelle: "bg-green", en_preparation: "bg-amber-500", prete: "bg-blue",
  en_livraison: "bg-violet", livree: "bg-muted-foreground/30", recuperee: "bg-muted-foreground/30", annulee: "bg-red-500",
};
const statusLabel: Record<string, string> = {
  nouvelle: "Nouvelle", en_preparation: "En préparation", prete: "Prête",
  en_livraison: "En livraison", livree: "Livrée", recuperee: "Récupérée", annulee: "Annulée",
};

export function MobileOrderList({ initialOrders, restaurantId, customers, selectedDate }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const { orders, updateOrderStatus } = useRealtimeOrders(
    initialOrders,
    restaurantId,
    selectedDate,
  );

  // Filtrage
  const searchLower = search.toLowerCase();
  const filtered = orders.filter((o) => {
    if (!search) return true;
    return (
      o.customer_name?.toLowerCase().includes(searchLower) ||
      o.customer_phone?.includes(search) ||
      o.id.slice(0, 6).toLowerCase().includes(searchLower)
    );
  });

  const group = statusGroups.find((g) => g.key === activeTab) || statusGroups[0];
  const displayed = filtered.filter(group.filter);

  // Grouper par statut pour la vue "En cours"
  const grouped: { label: string; status: string; orders: Order[] }[] = [];
  if (activeTab === "active") {
    const nouvelles = displayed.filter((o) => o.status === "nouvelle");
    const enPrep = displayed.filter((o) => o.status === "en_preparation");
    const pretes = displayed.filter((o) => o.status === "prete");
    const enLivraison = displayed.filter((o) => o.status === "en_livraison");
    if (nouvelles.length) grouped.push({ label: "Nouvelles", status: "nouvelle", orders: nouvelles });
    if (enPrep.length) grouped.push({ label: "En préparation", status: "en_preparation", orders: enPrep });
    if (pretes.length) grouped.push({ label: "Prêtes", status: "prete", orders: pretes });
    if (enLivraison.length) grouped.push({ label: "En livraison", status: "en_livraison", orders: enLivraison });
  } else {
    grouped.push({ label: group.label, status: activeTab, orders: displayed });
  }

  async function handleStatus(orderId: string, status: OrderStatus) {
    await updateOrderStatus(orderId, status);
  }

  return (
    <div className="px-3 pt-2 pb-4">
      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-3 px-3 scrollbar-none">
        {statusGroups.map((g) => {
          const count = filtered.filter(g.filter).length;
          const isActive = activeTab === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setActiveTab(g.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {g.label}{count > 0 && ` ${count}`}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Chercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-9 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:border-violet placeholder:text-muted-foreground/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Grouped orders */}
      {grouped.map((section) => (
        <div key={section.label} className="mb-4">
          <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
            <span className={`w-2 h-2 rounded-full ${statusDot[section.status] || "bg-muted-foreground"}`} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-xs text-muted-foreground/50">{section.orders.length}</span>
          </div>
          <div className="space-y-1.5">
            {section.orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} onStatusChange={handleStatus} />
            ))}
          </div>
        </div>
      ))}

      {displayed.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucune commande</p>
        </div>
      )}
    </div>
  );
}

function MobileOrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const [updating, setUpdating] = useState(false);
  const items = (order.items || []) as OrderItem[];
  const itemsSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const isDone = isTerminalStatus(order.status);
  const d = new Date(order.created_at);
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const isLivraison = order.order_type === "livraison";

  return (
    <div className={`bg-card border border-border rounded-xl p-2.5 ${isDone ? "opacity-40" : ""}`}>
      {/* Ligne 1 : heure + nom + total */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0">{time}</span>
        <Link href={`/orders/${order.id}`} className="text-sm font-medium text-foreground truncate flex-1">
          {order.customer_name || "Client"}
        </Link>
        {order.total_amount != null && (
          <span className="text-sm font-mono font-bold text-foreground flex-shrink-0">
            {Number(order.total_amount).toFixed(0)}€
          </span>
        )}
      </div>
      {/* Ligne 2 : items */}
      <p className="text-[11px] text-muted-foreground truncate mt-0.5 pl-12">{itemsSummary}</p>
      {/* Ligne 3 : type + action */}
      <div className="flex items-center justify-between mt-1.5 pl-12">
        <span className="text-[10px] text-muted-foreground">
          {isLivraison ? "Livraison" : "Emporter"}
        </span>
        {next && (
          <button
            disabled={updating}
            className="text-xs font-semibold text-violet px-3 py-1.5 rounded-lg active:bg-violet/5 disabled:opacity-50"
            onClick={async () => {
              setUpdating(true);
              try { await onStatusChange(order.id, next.status); } finally { setUpdating(false); }
            }}
          >
            {updating ? "..." : next.label} →
          </button>
        )}
      </div>
    </div>
  );
}
