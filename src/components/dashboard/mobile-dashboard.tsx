"use client";

import Link from "next/link";
import { ShoppingBag, Euro, CalendarDays, AlertCircle, ChevronRight } from "lucide-react";
import type { Order, SubscriptionPlan } from "@/lib/supabase/types";
import type { ReservationStats, UpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";

interface DashboardStats {
  todayOrders: Order[];
  todayCount: number;
  todayRevenue: number;
  pendingCount: number;
}

interface Props {
  stats: DashboardStats | null;
  plan: SubscriptionPlan;
  reservationStats?: ReservationStats | null;
  upcomingSummary?: UpcomingReservationSummary | null;
}

const statusLabels: Record<string, string> = {
  nouvelle: "Nouv.",
  en_preparation: "En prép.",
  prete: "Prête",
  en_livraison: "Livrais.",
  livree: "Livrée",
  recuperee: "Récup.",
  annulee: "Annulée",
};

const statusDots: Record<string, string> = {
  nouvelle: "bg-green",
  en_preparation: "bg-amber-500",
  prete: "bg-blue",
  en_livraison: "bg-violet",
  livree: "bg-muted-foreground/30",
  recuperee: "bg-muted-foreground/30",
  annulee: "bg-red-500",
};

const statusResaDots: Record<string, string> = {
  en_attente: "bg-amber-500",
  confirmee: "bg-green",
  assise: "bg-blue",
  terminee: "bg-muted-foreground/30",
  annulee: "bg-red-500",
  no_show: "bg-red-700",
};

export function MobileDashboard({ stats, plan, reservationStats, upcomingSummary }: Props) {
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const timeStr = `${now.getHours()}h${now.getMinutes().toString().padStart(2, "0")}`;

  const upcomingResas = upcomingSummary?.upcomingReservations?.slice(0, 4) || [];
  const latestOrders = stats?.todayOrders?.slice(0, 4) || [];

  return (
    <div className="px-3 pt-3 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-heading font-bold text-foreground">{greeting}</h1>
        <span className="text-xs text-muted-foreground font-mono">{timeStr}</span>
      </div>

      {/* KPIs — 2 cards compactes */}
      <div className="grid grid-cols-2 gap-2.5">
        {showOrders && stats && (
          <>
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-violet/10 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5 text-violet" />
                </div>
                <span className="text-[10px] text-muted-foreground">Commandes</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{stats.todayCount}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center">
                  <Euro className="w-3.5 h-3.5 text-green" />
                </div>
                <span className="text-[10px] text-muted-foreground">Revenus</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{stats.todayRevenue.toFixed(0)}€</span>
            </div>
          </>
        )}
        {showReservations && reservationStats && !showOrders && (
          <>
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-violet/10 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-violet" />
                </div>
                <span className="text-[10px] text-muted-foreground">Résas</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayReservations}</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center">
                  <Euro className="w-3.5 h-3.5 text-green" />
                </div>
                <span className="text-[10px] text-muted-foreground">Couverts</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayCovers}</span>
            </div>
          </>
        )}
        {showOrders && showReservations && reservationStats && (
          <>
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col col-span-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-violet/10 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-violet" />
                </div>
                <span className="text-[10px] text-muted-foreground">Résas</span>
              </div>
              <span className="text-2xl font-mono font-bold text-foreground">{reservationStats.todayReservations}</span>
            </div>
          </>
        )}
      </div>

      {/* Alerte urgence — commandes en attente */}
      {showOrders && stats && stats.pendingCount > 0 && (
        <Link
          href="/orders"
          className="flex items-center gap-3 px-3 py-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">
            {stats.pendingCount} commande{stats.pendingCount > 1 ? "s" : ""} en attente
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      {/* Alerte urgence — résas en attente */}
      {showReservations && reservationStats && reservationStats.pendingCount > 0 && (
        <Link
          href="/reservations"
          className="flex items-center gap-3 px-3 py-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">
            {reservationStats.pendingCount} résa{reservationStats.pendingCount > 1 ? "s" : ""} à confirmer
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      {/* Prochaines résas */}
      {showReservations && upcomingResas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Prochaines réservations</h2>
            <Link href="/reservations" className="text-xs text-violet font-medium">Voir tout</Link>
          </div>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {upcomingResas.map((resa) => (
              <div key={resa.id} className="flex items-center px-3 py-2.5 gap-3">
                <span className="font-mono text-sm font-semibold text-foreground w-11 flex-shrink-0">
                  {resa.time_slot.slice(0, 5)}
                </span>
                <span className="text-sm text-foreground truncate flex-1">{resa.customer_name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{resa.covers} couv.</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusResaDots[resa.status] || "bg-muted-foreground/30"}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières commandes */}
      {showOrders && latestOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Dernières commandes</h2>
            <Link href="/orders" className="text-xs text-violet font-medium">Voir tout</Link>
          </div>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {latestOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center px-3 py-2.5 gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDots[order.status] || "bg-muted-foreground/30"}`} />
                <span className="text-sm text-foreground truncate flex-1">
                  {order.customer_name || "Client"}
                </span>
                {order.total_amount != null && (
                  <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">
                    {Number(order.total_amount).toFixed(0)}€
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex-shrink-0 w-14 text-right">
                  {statusLabels[order.status] || order.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
