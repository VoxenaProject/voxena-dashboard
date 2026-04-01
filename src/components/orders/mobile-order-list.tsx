"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ChevronLeft, ChevronRight, ShoppingBag, Truck, Package, Loader2 } from "lucide-react";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { getNextAction, isTerminalStatus } from "@/lib/orders/status";
import type { Order, OrderItem, OrderStatus, Customer } from "@/lib/supabase/types";

interface Props { initialOrders: Order[]; restaurantId: string; customers: Customer[]; selectedDate: string }

const tabs = [
  { key: "active", label: "🔥 En cours" },
  { key: "nouvelle", label: "🆕 Nouvelles" },
  { key: "prete", label: "✅ Prêtes" },
  { key: "done", label: "📦 Terminées" },
];

const dotColor: Record<string, string> = {
  nouvelle: "bg-green", en_preparation: "bg-amber-500", prete: "bg-blue",
  en_livraison: "bg-violet", livree: "bg-muted-foreground/20", recuperee: "bg-muted-foreground/20", annulee: "bg-red-500",
};

const borderColor: Record<string, string> = {
  nouvelle: "border-l-green", en_preparation: "border-l-amber-500", prete: "border-l-blue", en_livraison: "border-l-violet",
};

function vibrate() { try { navigator?.vibrate?.(10); } catch {} }

export function MobileOrderList({ initialOrders, restaurantId, customers, selectedDate }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const { orders, updateOrderStatus } = useRealtimeOrders(initialOrders, restaurantId, selectedDate);
  const pull = usePullRefresh();

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const dateLabel = isToday ? "Aujourd'hui" : new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
  function navDate(n: number) { const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() + n); router.push(`/orders?date=${d.toISOString().split("T")[0]}`); }

  const q = search.toLowerCase();
  const filtered = orders.filter((o) => !search || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(search) || o.id.slice(0, 6).toLowerCase().includes(q));

  function match(o: Order) {
    if (activeTab === "active") return !isTerminalStatus(o.status) && o.status !== "annulee";
    if (activeTab === "nouvelle") return o.status === "nouvelle";
    if (activeTab === "prete") return o.status === "prete";
    return isTerminalStatus(o.status) || o.status === "annulee";
  }
  const displayed = filtered.filter(match);

  const groups: { label: string; key: string; items: Order[] }[] = [];
  if (activeTab === "active") {
    const n = displayed.filter((o) => o.status === "nouvelle");
    const p = displayed.filter((o) => o.status === "en_preparation");
    const r = displayed.filter((o) => o.status === "prete");
    const l = displayed.filter((o) => o.status === "en_livraison");
    if (n.length) groups.push({ label: "🆕 Nouvelles", key: "nouvelle", items: n });
    if (p.length) groups.push({ label: "🔥 En préparation", key: "en_preparation", items: p });
    if (r.length) groups.push({ label: "✅ Prêtes", key: "prete", items: r });
    if (l.length) groups.push({ label: "🚗 En livraison", key: "en_livraison", items: l });
  } else groups.push({ label: tabs.find((t) => t.key === activeTab)?.label || "", key: activeTab, items: displayed });

  return (
    <div className="px-4 pt-2 pb-24" onTouchStart={pull.onTouchStart} onTouchMove={pull.onTouchMove} onTouchEnd={pull.onTouchEnd}>
      {/* Pull-to-refresh indicator */}
      {pull.pullDistance > 0 && (
        <div className="flex justify-center mb-2 transition-all" style={{ height: pull.pullDistance * 0.4 }}>
          <Loader2 className={`w-5 h-5 text-violet ${pull.refreshing ? "animate-spin" : ""}`} style={{ opacity: Math.min(1, pull.pullDistance / 80) }} />
        </div>
      )}
      {/* Date */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navDate(-1)} className="h-10 w-10 flex items-center justify-center rounded-xl active:bg-muted/50 -ml-2"><ChevronLeft className="w-5 h-5 text-muted-foreground" /></button>
        <button onClick={() => { if (!isToday) router.push("/orders"); }} className="text-sm font-semibold text-foreground px-3 py-2">{dateLabel}</button>
        <button onClick={() => navDate(1)} className="h-10 w-10 flex items-center justify-center rounded-xl active:bg-muted/50 -mr-2"><ChevronRight className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
        {tabs.map((t) => {
          const c = filtered.filter((o) => { if (t.key === "active") return !isTerminalStatus(o.status) && o.status !== "annulee"; if (t.key === "nouvelle") return o.status === "nouvelle"; if (t.key === "prete") return o.status === "prete"; return isTerminalStatus(o.status) || o.status === "annulee"; }).length;
          return (
            <button key={t.key} onClick={() => { setActiveTab(t.key); vibrate(); }} className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all ${activeTab === t.key ? "bg-foreground text-background shadow-sm" : "bg-muted/30 text-muted-foreground"}`}>
              {t.label}{c > 0 ? ` ${c}` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
        <input type="text" placeholder="Chercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-10 text-sm bg-muted/20 border border-border rounded-xl outline-none focus:border-violet focus:ring-1 focus:ring-violet/20 placeholder:text-muted-foreground/35" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      {/* List */}
      {groups.map((section) => (
        <div key={section.key} className="mb-5">
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-10">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor[section.key] || "bg-muted-foreground"}`} />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-xs text-muted-foreground/30 font-mono">{section.items.length}</span>
          </div>
          <div className="space-y-2">
            {section.items.map((order, i) => (
              <OrderCard key={order.id} order={order} onStatus={updateOrderStatus} index={i} />
            ))}
          </div>
        </div>
      ))}

      {displayed.length === 0 && (
        <div className="text-center py-20">
          <span className="text-4xl block mb-3">
            {activeTab === "active" ? "🎉" : activeTab === "nouvelle" ? "😌" : activeTab === "prete" ? "🍽️" : "📭"}
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {activeTab === "active" ? "Tout est géré, bravo !" : activeTab === "nouvelle" ? "Pas de nouvelle commande" : activeTab === "prete" ? "Rien à récupérer" : "Pas encore de commande terminée"}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">Les commandes apparaissent en temps réel</p>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onStatus, index }: { order: Order; onStatus: (id: string, s: OrderStatus) => void; index: number }) {
  const [up, setUp] = useState(false);
  const items = (order.items || []) as OrderItem[];
  const summary = items.slice(0, 3).map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const next = getNextAction(order.status, order.order_type);
  const done = isTerminalStatus(order.status);
  const d = new Date(order.created_at);
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const isLiv = order.order_type === "livraison";

  return (
    <div className={`bg-card border border-border border-l-[3px] ${borderColor[order.status] || "border-l-muted-foreground/15"} rounded-xl overflow-hidden ${done ? "opacity-40" : ""}`} style={{ animation: `fade-in-up 0.3s ease-out ${index * 30}ms both` }}>
      <Link href={`/orders/${order.id}`} className="flex items-center px-4 py-3 gap-3 active:bg-muted/20 transition-colors">
        {/* Icon type */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isLiv ? "bg-green/8" : "bg-blue/8"}`}>
          {isLiv ? <Truck className="w-4 h-4 text-green" /> : <ShoppingBag className="w-4 h-4 text-blue" />}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{order.customer_name || "Client"}</span>
            <span className="font-mono text-sm font-bold text-foreground flex-shrink-0">{order.total_amount != null ? `${Number(order.total_amount).toFixed(0)}€` : ""}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">{time}</span>
            <span className="text-xs text-muted-foreground truncate">{summary}</span>
          </div>
        </div>
      </Link>
      {/* Action */}
      {next && !done && (
        <button disabled={up} onClick={async (e) => { e.stopPropagation(); vibrate(); setUp(true); try { await onStatus(order.id, next.status); } finally { setUp(false); } }} className="w-full text-center text-xs font-semibold text-violet py-3 border-t border-border active:bg-violet/5 disabled:opacity-50 transition-colors">
          {up ? "..." : next.label}
        </button>
      )}
    </div>
  );
}
