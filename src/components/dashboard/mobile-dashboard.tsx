"use client";

import Link from "next/link";
import { ShoppingBag, Euro, CalendarDays, Users, AlertCircle, ChevronRight, Coffee } from "lucide-react";
import type { Order, SubscriptionPlan } from "@/lib/supabase/types";
import type { ReservationStats, UpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";

interface DashboardStats {
  todayOrders: Order[];
  todayCount: number;
  todayRevenue: number;
  pendingCount: number;
  countTrend: number;
  revenueTrend: number;
}

interface Props {
  stats: DashboardStats | null;
  plan: SubscriptionPlan;
  reservationStats?: ReservationStats | null;
  upcomingSummary?: UpcomingReservationSummary | null;
}

const orderDot: Record<string, string> = {
  nouvelle: "bg-green", en_preparation: "bg-amber-500", prete: "bg-blue",
  en_livraison: "bg-violet", livree: "bg-muted-foreground/20", recuperee: "bg-muted-foreground/20", annulee: "bg-red-500",
};
const resaDot: Record<string, string> = {
  en_attente: "bg-amber-500", confirmee: "bg-green", assise: "bg-blue",
  terminee: "bg-muted-foreground/20", annulee: "bg-red-500", no_show: "bg-red-700",
};

function Trend({ value }: { value: number }) {
  if (value === 0) return null;
  return <span className={`text-xs font-medium ${value > 0 ? "text-green" : "text-red-500"}`}>{value > 0 ? "↑" : "↓"}{Math.abs(value)}%</span>;
}

export function MobileDashboard({ stats, plan, reservationStats, upcomingSummary }: Props) {
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // Feed d'activité mélangé
  const feed: { type: "order" | "resa"; time: string; name: string; detail: string; dot: string; id: string; href: string }[] = [];
  if (showOrders && stats) {
    for (const o of stats.todayOrders.slice(0, 6)) {
      const d = new Date(o.created_at);
      feed.push({ type: "order", time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`, name: o.customer_name || "Client", detail: o.total_amount != null ? `${Number(o.total_amount).toFixed(0)}€` : "", dot: orderDot[o.status] || "bg-muted-foreground/20", id: o.id, href: `/orders/${o.id}` });
    }
  }
  if (showReservations && upcomingSummary) {
    for (const r of upcomingSummary.upcomingReservations.slice(0, 6)) {
      feed.push({ type: "resa", time: r.time_slot.slice(0, 5), name: r.customer_name, detail: `${r.covers} couv.`, dot: resaDot[r.status] || "bg-muted-foreground/20", id: r.id, href: "/reservations" });
    }
  }
  feed.sort((a, b) => b.time.localeCompare(a.time));

  // Loading skeleton
  if (!stats && !reservationStats) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-3 animate-pulse">
        <div className="flex justify-between"><div className="h-6 w-24 bg-muted/40 rounded-lg" /><div className="h-4 w-20 bg-muted/30 rounded-lg" /></div>
        <div className="grid grid-cols-2 gap-3"><div className="h-24 bg-muted/30 rounded-xl" /><div className="h-24 bg-muted/30 rounded-xl" /></div>
        <div className="h-12 bg-muted/20 rounded-xl" />
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/20 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-heading font-bold text-foreground">{greeting}</h1>
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {showOrders && stats && (
          <>
            <Link href="/orders" className="bg-card border border-border rounded-xl p-3.5 active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-violet/8 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-violet" /></div>
                <span className="text-xs text-muted-foreground">Commandes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">{stats.todayCount}</span>
                <Trend value={stats.countTrend} />
              </div>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green/8 flex items-center justify-center"><Euro className="w-4 h-4 text-green" /></div>
                <span className="text-xs text-muted-foreground">Revenus</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">{stats.todayRevenue.toFixed(0)}€</span>
                <Trend value={stats.revenueTrend} />
              </div>
            </div>
          </>
        )}
        {showReservations && reservationStats && (
          <>
            <Link href="/reservations" className="bg-card border border-border rounded-xl p-3.5 active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-violet/8 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-violet" /></div>
                <span className="text-xs text-muted-foreground">Résas</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayReservations}</span>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue/8 flex items-center justify-center"><Users className="w-4 h-4 text-blue" /></div>
                <span className="text-xs text-muted-foreground">Couverts</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayCovers}</span>
            </div>
          </>
        )}
      </div>

      {/* Alertes */}
      {showOrders && stats && stats.pendingCount > 0 && (
        <Link href="/orders" className="flex items-center gap-3 px-4 py-3 bg-amber-500/6 border border-amber-500/12 rounded-xl mb-3 active:scale-[0.98] transition-transform">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{stats.pendingCount} commande{stats.pendingCount > 1 ? "s" : ""} en attente</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}
      {showReservations && reservationStats && reservationStats.pendingCount > 0 && (
        <Link href="/reservations" className="flex items-center gap-3 px-4 py-3 bg-violet/5 border border-violet/10 rounded-xl mb-3 active:scale-[0.98] transition-transform">
          <CalendarDays className="w-5 h-5 text-violet flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{reservationStats.pendingCount} résa{reservationStats.pendingCount > 1 ? "s" : ""} à confirmer</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      {/* Feed */}
      {feed.length > 0 ? (
        <div className="mt-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activité récente</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {feed.slice(0, 8).map((item, i) => (
              <Link key={item.id + i} href={item.href} className="flex items-center px-4 py-3 gap-3 active:bg-muted/30 transition-colors" style={{ animationDelay: `${i * 40}ms` }}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="font-mono text-xs text-muted-foreground w-11 flex-shrink-0">{item.time}</span>
                <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{item.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <Coffee className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">Journée calme</p>
          <p className="text-xs text-muted-foreground/60 mt-1">L'activité apparaîtra ici en temps réel</p>
        </div>
      )}
    </div>
  );
}
