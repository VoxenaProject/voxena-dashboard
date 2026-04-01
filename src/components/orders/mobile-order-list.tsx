"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ChevronLeft, ChevronRight, ShoppingBag, Truck } from "lucide-react";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus, Customer } from "@/lib/supabase/types";

interface Props {
  initialOrders: Order[];
  restaurantId: string;
  customers: Customer[];
  selectedDate: string;
}

const tabs = [
  { key: "active", label: "En cours" },
  { key: "nouvelle", label: "Nouvelles" },
  { key: "prete", label: "Prêtes" },
  { key: "done", label: "Terminées" },
];

const dotColor: Record<string, string> = {
  nouvelle: "bg-green", en_preparation: "bg-amber-500", prete: "bg-blue",
  en_livraison: "bg-violet", livree: "bg-muted-foreground/20", recuperee: "bg-muted-foreground/20", annulee: "bg-red-500",
};

const statusBg: Record<string, string> = {
  nouvelle: "border-l-green",
  en_preparation: "border-l-amber-500",
  prete: "border-l-blue",
  en_livraison: "border-l-violet",
};

export function MobileOrderList({ initialOrders, restaurantId, customers, selectedDate }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const { orders, updateOrderStatus } = useRealtimeOrders(initialOrders, restaurantId, selectedDate);

  // Date nav
  const dateObj = new Date(selectedDate + "T12:00:00");
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const dateLabel = isToday ? "Aujourd'hui" : dateObj.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

  function navDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    router.push(`/orders?date=${d.toISOString().split("T")[0]}`);
  }

  // Filtrage
  const q = search.toLowerCase();
  const filtered = orders.filter((o) => {
    if (!search) return true;
    return o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(search) || o.id.slice(0, 6).toLowerCase().includes(q);
  });

  function matchTab(o: Order) {
    if (activeTab === "active") return !isTerminalStatus(o.status) && o.status !== "annulee";
    if (activeTab === "nouvelle") return o.status === "nouvelle";
    if (activeTab === "prete") return o.status === "prete";
    if (activeTab === "done") return isTerminalStatus(o.status) || o.status === "annulee";
    return true;
  }

  const displayed = filtered.filter(matchTab);

  // Groupe par statut pour "En cours"
  const groups: { label: string; key: string; items: Order[] }[] = [];
  if (activeTab === "active") {
    const n = displayed.filter((o) => o.status === "nouvelle");
    const p = displayed.filter((o) => o.status === "en_preparation");
    const r = displayed.filter((o) => o.status === "prete");
    const l = displayed.filter((o) => o.status === "en_livraison");
    if (n.length) groups.push({ label: "Nouvelles", key: "nouvelle", items: n });
    if (p.length) groups.push({ label: "En préparation", key: "en_preparation", items: p });
    if (r.length) groups.push({ label: "Prêtes", key: "prete", items: r });
    if (l.length) groups.push({ label: "En livraison", key: "en_livraison", items: l });
  } else {
    groups.push({ label: tabs.find((t) => t.key === activeTab)?.label || "", key: activeTab, items: displayed });
  }

  return (
    <div className="px-3 pt-1 pb-4">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navDate(-1)} className="p-2 -ml-2 rounded-lg active:bg-muted/50"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
        <button onClick={() => { if (!isToday) router.push("/orders"); }} className="text-sm font-semibold text-foreground">{dateLabel}</button>
        <button onClick={() => navDate(1)} className="p-2 -mr-2 rounded-lg active:bg-muted/50"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none">
        {tabs.map((t) => {
          const count = filtered.filter((o) => {
            if (t.key === "active") return !isTerminalStatus(o.status) && o.status !== "annulee";
            if (t.key === "nouvelle") return o.status === "nouvelle";
            if (t.key === "prete") return o.status === "prete";
            if (t.key === "done") return isTerminalStatus(o.status) || o.status === "annulee";
            return false;
          }).length;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === t.key ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {t.label}{count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Chercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-9 text-sm bg-muted/20 border border-border rounded-xl outline-none focus:border-violet placeholder:text-muted-foreground/40"
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      {/* Orders */}
      {groups.map((section) => (
        <div key={section.key} className="mb-5">
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
            <span className={`w-2 h-2 rounded-full ${dotColor[section.key] || "bg-muted-foreground"}`} />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-[11px] text-muted-foreground/40">{section.items.length}</span>
          </div>
          <div className="space-y-2">
            {section.items.map((order) => (
              <MobileCard key={order.id} order={order} onStatusChange={updateOrderStatus} />
            ))}
          </div>
        </div>
      ))}

      {displayed.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Aucune commande</p>
        </div>
      )}
    </div>
  );
}

function MobileCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const [updating, setUpdating] = useState(false);
  const items = (order.items || []) as OrderItem[];
  const summary = items.slice(0, 3).map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const isDone = isTerminalStatus(order.status);
  const d = new Date(order.created_at);
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const isLivraison = order.order_type === "livraison";

  return (
    <div className={`bg-card border border-border border-l-[3px] ${statusBg[order.status] || "border-l-muted-foreground/20"} rounded-xl overflow-hidden ${isDone ? "opacity-40" : ""}`}>
      <Link href={`/orders/${order.id}`} className="block px-3 py-2.5 active:bg-muted/30">
        {/* Row 1 */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground w-10 flex-shrink-0">{time}</span>
          <span className="text-sm font-semibold text-foreground truncate flex-1">{order.customer_name || "Client"}</span>
          <span className="font-mono text-sm font-bold text-foreground flex-shrink-0">
            {order.total_amount != null ? `${Number(order.total_amount).toFixed(0)}€` : ""}
          </span>
        </div>
        {/* Row 2 */}
        <div className="flex items-center gap-2 mt-1 pl-12">
          {isLivraison ? <Truck className="w-3 h-3 text-green flex-shrink-0" /> : <ShoppingBag className="w-3 h-3 text-blue flex-shrink-0" />}
          <span className="text-[11px] text-muted-foreground truncate">{summary}</span>
        </div>
      </Link>
      {/* Action bar */}
      {next && !isDone && (
        <div className="flex border-t border-border" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={updating}
            className="flex-1 text-center text-xs font-semibold text-violet py-2.5 active:bg-violet/5 disabled:opacity-50"
            onClick={async () => {
              setUpdating(true);
              try { await onStatusChange(order.id, next.status); } finally { setUpdating(false); }
            }}
          >
            {updating ? "..." : next.label}
          </button>
        </div>
      )}
    </div>
  );
}
