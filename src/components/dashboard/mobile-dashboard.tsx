"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  restaurantName?: string;
}

const orderEmoji: Record<string, string> = {
  nouvelle: "🆕", en_preparation: "🔥", prete: "✅",
  en_livraison: "🚗", livree: "📦", recuperee: "👋", annulee: "❌",
};
const resaEmoji: Record<string, string> = {
  en_attente: "⏳", confirmee: "✅", assise: "🪑",
  terminee: "👋", annulee: "❌", no_show: "👻",
};

function Trend({ value }: { value: number }) {
  if (value === 0) return null;
  return <span className={`text-xs font-medium ${value > 0 ? "text-green" : "text-red-500"}`}>{value > 0 ? "↑" : "↓"}{Math.abs(value)}%</span>;
}

export function MobileDashboard({ stats, plan, reservationStats, upcomingSummary, restaurantName = "" }: Props) {
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
  const hour = now.getHours();
  const greeting = hour < 6 ? "Bonne nuit 🌙" : hour < 12 ? "Bonjour ☀️" : hour < 17 ? "Bon après-midi 🌤️" : hour < 21 ? "Bonsoir 🌆" : "Bonne soirée ✨";

  // Feed mélangé
  const feed: { type: "order" | "resa"; time: string; name: string; detail: string; emoji: string; id: string; href: string }[] = [];
  if (showOrders && stats) {
    for (const o of stats.todayOrders.slice(0, 6)) {
      const d = new Date(o.created_at);
      feed.push({ type: "order", time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`, name: o.customer_name || "Client", detail: o.total_amount != null ? `${Number(o.total_amount).toFixed(0)}€` : "", emoji: orderEmoji[o.status] || "📋", id: o.id, href: `/orders/${o.id}` });
    }
  }
  if (showReservations && upcomingSummary) {
    for (const r of upcomingSummary.upcomingReservations.slice(0, 6)) {
      feed.push({ type: "resa", time: r.time_slot.slice(0, 5), name: r.customer_name, detail: `${r.covers} couv.`, emoji: resaEmoji[r.status] || "📅", id: r.id, href: "/reservations" });
    }
  }
  feed.sort((a, b) => b.time.localeCompare(a.time));

  // Loading
  if (!stats && !reservationStats) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-3 animate-pulse">
        <div className="h-12 bg-muted/30 rounded-xl" />
        <div className="grid grid-cols-2 gap-3"><div className="h-24 bg-muted/20 rounded-xl" /><div className="h-24 bg-muted/20 rounded-xl" /></div>
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted/15 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Header chaleureux */}
      <div className="mb-5">
        <h1 className="text-xl font-heading font-bold text-foreground">{greeting}</h1>
        {restaurantName && <p className="text-sm text-muted-foreground mt-0.5">{restaurantName}</p>}
        <p className="text-xs text-muted-foreground/60 mt-0.5 capitalize">{dateLabel}</p>
      </div>

      {/* KPIs avec emojis */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {showOrders && stats && (
          <>
            <Link href="/orders" className="bg-card border border-border rounded-xl p-3.5 active:scale-[0.97] transition-transform">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">🛍️</span>
                <span className="text-xs text-muted-foreground">Commandes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">{stats.todayCount}</span>
                <Trend value={stats.countTrend} />
              </div>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">💰</span>
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
            <Link href="/reservations" className="bg-card border border-border rounded-xl p-3.5 active:scale-[0.97] transition-transform">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">📅</span>
                <span className="text-xs text-muted-foreground">Résas</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayReservations}</span>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">👥</span>
                <span className="text-xs text-muted-foreground">Couverts</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayCovers}</span>
            </div>
          </>
        )}
      </div>

      {/* Alertes friendly */}
      {showOrders && stats && stats.pendingCount > 0 && (
        <Link href="/orders" className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/6 border border-amber-200 dark:border-amber-500/12 rounded-xl mb-3 active:scale-[0.98] transition-transform">
          <span className="text-xl">🔔</span>
          <span className="text-sm font-medium text-foreground flex-1">{stats.pendingCount} commande{stats.pendingCount > 1 ? "s" : ""} {stats.pendingCount > 1 ? "attendent" : "attend"} !</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}
      {showReservations && reservationStats && reservationStats.pendingCount > 0 && (
        <Link href="/reservations" className="flex items-center gap-3 px-4 py-3 bg-violet/4 border border-violet/10 rounded-xl mb-3 active:scale-[0.98] transition-transform">
          <span className="text-xl">⏳</span>
          <span className="text-sm font-medium text-foreground flex-1">{reservationStats.pendingCount} résa{reservationStats.pendingCount > 1 ? "s" : ""} à confirmer</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      {/* Feed avec emojis */}
      {feed.length > 0 ? (
        <div className="mt-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📊 Activité du jour</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {feed.slice(0, 8).map((item, i) => (
              <Link key={item.id + i} href={item.href} className="flex items-center px-4 py-3 gap-3 active:bg-muted/20 transition-colors" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="text-base flex-shrink-0">{item.emoji}</span>
                <span className="font-mono text-xs text-muted-foreground w-11 flex-shrink-0">{item.time}</span>
                <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{item.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl block mb-3">☕</span>
          <p className="text-sm font-medium text-muted-foreground">Journée calme pour l'instant</p>
          <p className="text-xs text-muted-foreground/50 mt-1">L'activité apparaîtra ici en temps réel</p>
        </div>
      )}
    </div>
  );
}
