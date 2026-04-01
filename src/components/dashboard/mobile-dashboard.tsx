"use client";

import Link from "next/link";
import { ShoppingBag, Euro, CalendarDays, Users, AlertCircle, ChevronRight } from "lucide-react";
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

const orderStatusDot: Record<string, string> = {
  nouvelle: "bg-green", en_preparation: "bg-amber-500", prete: "bg-blue",
  en_livraison: "bg-violet", livree: "bg-muted-foreground/30", recuperee: "bg-muted-foreground/30", annulee: "bg-red-500",
};
const orderStatusLabel: Record<string, string> = {
  nouvelle: "Nouv.", en_preparation: "En prép.", prete: "Prête",
  en_livraison: "Livrais.", livree: "Livrée", recuperee: "Récup.", annulee: "Annulée",
};
const resaStatusDot: Record<string, string> = {
  en_attente: "bg-amber-500", confirmee: "bg-green", assise: "bg-blue",
  terminee: "bg-muted-foreground/30", annulee: "bg-red-500", no_show: "bg-red-700",
};

function Trend({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span className={`text-[10px] font-medium ${value > 0 ? "text-green" : "text-red-500"}`}>
      {value > 0 ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

export function MobileDashboard({ stats, plan, reservationStats, upcomingSummary }: Props) {
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

  // Feed d'activité mélangé : commandes + résas triées par heure
  const feedItems: { type: "order" | "resa"; time: string; name: string; detail: string; dot: string; id: string; href: string }[] = [];

  if (showOrders && stats) {
    for (const order of stats.todayOrders.slice(0, 6)) {
      const d = new Date(order.created_at);
      feedItems.push({
        type: "order",
        time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
        name: order.customer_name || "Client",
        detail: order.total_amount != null ? `${Number(order.total_amount).toFixed(0)}€` : "",
        dot: orderStatusDot[order.status] || "bg-muted-foreground/30",
        id: order.id,
        href: `/orders/${order.id}`,
      });
    }
  }

  if (showReservations && upcomingSummary) {
    for (const resa of upcomingSummary.upcomingReservations.slice(0, 6)) {
      feedItems.push({
        type: "resa",
        time: resa.time_slot.slice(0, 5),
        name: resa.customer_name,
        detail: `${resa.covers} couv.`,
        dot: resaStatusDot[resa.status] || "bg-muted-foreground/30",
        id: resa.id,
        href: "/reservations",
      });
    }
  }

  feedItems.sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="px-3 pt-2 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-heading font-bold text-foreground">Bonjour</h1>
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {showOrders && stats && (
          <>
            <Link href="/orders" className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-violet" />
                <span className="text-[10px] text-muted-foreground">Commandes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">{stats.todayCount}</span>
                <Trend value={stats.countTrend} />
              </div>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Euro className="w-3.5 h-3.5 text-green" />
                <span className="text-[10px] text-muted-foreground">Revenus</span>
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
            <Link href="/reservations" className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-violet" />
                <span className="text-[10px] text-muted-foreground">Résas</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayReservations}</span>
            </Link>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-blue" />
                <span className="text-[10px] text-muted-foreground">Couverts</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayCovers}</span>
            </div>
          </>
        )}
      </div>

      {/* Alertes urgence */}
      {showOrders && stats && stats.pendingCount > 0 && (
        <Link href="/orders" className="flex items-center gap-2.5 px-3 py-2 bg-amber-500/6 border border-amber-500/12 rounded-xl mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{stats.pendingCount} commande{stats.pendingCount > 1 ? "s" : ""} en attente</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>
      )}
      {showReservations && reservationStats && reservationStats.pendingCount > 0 && (
        <Link href="/reservations" className="flex items-center gap-2.5 px-3 py-2 bg-violet/5 border border-violet/10 rounded-xl mb-2">
          <CalendarDays className="w-4 h-4 text-violet flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{reservationStats.pendingCount} résa{reservationStats.pendingCount > 1 ? "s" : ""} à confirmer</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>
      )}

      {/* Feed d'activité mélangé */}
      {feedItems.length > 0 && (
        <div className="mt-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activité récente</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {feedItems.slice(0, 8).map((item) => (
              <Link key={item.id} href={item.href} className="flex items-center px-3 py-2.5 gap-2.5 active:bg-muted/50">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="font-mono text-xs text-muted-foreground w-10 flex-shrink-0">{item.time}</span>
                <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{item.detail}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
