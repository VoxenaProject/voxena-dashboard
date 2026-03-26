"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ShoppingBag, Euro, TrendingUp, Clock, ArrowRight, Phone, Copy, Check, CalendarDays, Users, BarChart3, UserX } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PopularItemsChart } from "@/components/charts/popular-items-chart";
import type { Order, OrderItem, SubscriptionPlan, ReservationStatus } from "@/lib/supabase/types";
import type { ReservationStats } from "@/lib/dashboard/reservation-stats";

interface DashboardStats {
  todayOrders: Order[];
  todayCount: number;
  todayRevenue: number;
  todayAvg: number;
  pendingCount: number;
  countTrend: number;
  revenueTrend: number;
  dailyOrders: number[];
  dailyRevenue: number[];
  topItems: { name: string; count: number }[];
}

export interface UpcomingReservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  time_slot: string;
  covers: number;
  status: ReservationStatus;
  table_id: string | null;
  notes: string | null;
  floor_tables: { name: string } | { name: string }[] | null;
}

interface DashboardContentProps {
  stats: DashboardStats | null;
  chartData: { label: string; revenue: number; orders: number }[];
  telnyxPhone?: string | null;
  plan?: SubscriptionPlan;
  reservationStats?: ReservationStats | null;
  upcomingReservations?: UpcomingReservation[];
}

export function DashboardContent({
  stats,
  chartData,
  telnyxPhone,
  plan = "orders",
  reservationStats,
  upcomingReservations = [],
}: DashboardContentProps) {
  const [greeting, setGreeting] = useState("Bonjour");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Bonsoir");
    else if (hour >= 12) setGreeting("Bon après-midi");
    else setGreeting("Bonjour");
  }, []);

  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";

  // Données sparkline pour les réservations hebdomadaires
  const reservationSparkline = reservationStats?.weeklyTrends.map((t) => t.count) || [];

  return (
    <PageWrapper>
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {greeting} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de votre activité du jour
        </p>
      </div>

      {/* ── Section Commandes (orders / pro) ── */}
      {showOrders && stats && (
        <>
          {/* KPI Cards commandes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="kpi-cards">
            <KpiCard
              title="Commandes aujourd'hui"
              value={stats.todayCount}
              icon={ShoppingBag}
              trend={{
                value: Math.abs(stats.countTrend),
                isPositive: stats.countTrend >= 0,
              }}
              sparklineData={stats.dailyOrders}
              accentColor="violet"
              delay={0}
            />
            <KpiCard
              title="Revenus du jour"
              value={stats.todayRevenue}
              suffix="€"
              icon={Euro}
              trend={{
                value: Math.abs(stats.revenueTrend),
                isPositive: stats.revenueTrend >= 0,
              }}
              sparklineData={stats.dailyRevenue}
              accentColor="green"
              delay={1}
            />
            <KpiCard
              title="Panier moyen"
              value={stats.todayAvg}
              suffix="€"
              decimals={0}
              icon={TrendingUp}
              accentColor="blue"
              delay={2}
            />
            <KpiCard
              title="En attente"
              value={stats.pendingCount}
              icon={Clock}
              accentColor="amber"
              delay={3}
            />
          </div>

          {/* Carte numéro Telnyx */}
          {telnyxPhone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mb-8"
            >
              <Card className="shadow-card border-violet/20 bg-gradient-to-r from-violet/[0.04] to-blue/[0.03]">
                <CardContent className="py-5 px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-violet/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-violet" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Votre ligne de commande
                        </p>
                        <p className="font-mono text-xl font-bold tracking-wide mt-0.5">
                          {telnyxPhone}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(telnyxPhone);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/60"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copier
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 ml-15">
                    C&apos;est le numéro que vos clients appellent pour commander
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Revenus 7 jours */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Revenus — 7 derniers jours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={chartData} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Articles populaires */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Articles populaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PopularItemsChart items={stats.topItems} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Dernières commandes */}
          <motion.div
            data-tour="recent-orders"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={showReservations ? "mb-10" : ""}
          >
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-base font-semibold">
                  Dernières commandes
                </CardTitle>
                <Link
                  href="/orders"
                  className="text-xs text-violet hover:text-violet-dark flex items-center gap-1 font-medium transition-colors"
                >
                  Voir tout
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {stats.todayOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      Aucune commande aujourd&apos;hui
                    </p>
                    <p className="text-xs mt-1">
                      Les nouvelles commandes apparaîtront ici en temps réel
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {stats.todayOrders.slice(0, 8).map((order, i) => {
                      const items = (order.items || []) as OrderItem[];
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.55 + i * 0.04, duration: 0.3 }}
                        >
                          <Link
                            href={`/orders/${order.id}`}
                            className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {order.customer_name || "Client"}
                                  </p>
                                  {order.status === "nouvelle" && (
                                    <PulsingDot color="green" size="sm" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {items.length} article
                                  {items.length > 1 ? "s" : ""} ·{" "}
                                  {formatDistanceToNow(
                                    new Date(order.created_at),
                                    { addSuffix: true, locale: fr }
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {order.total_amount != null && (
                                <span className="font-mono text-sm font-semibold">
                                  {Number(order.total_amount).toFixed(0)}€
                                </span>
                              )}
                              <OrderStatusBadge status={order.status} orderType={order.order_type} />
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── Section Réservations (tables / pro) ── */}
      {showReservations && reservationStats && (
        <>
          {/* Séparateur visuel si plan pro (les deux sections) */}
          {plan === "pro" && (
            <div className="mb-6">
              <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-violet" />
                Réservations
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Statistiques du jour pour votre service de réservation
              </p>
            </div>
          )}

          {/* KPI Cards réservations */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showOrders ? 0.6 : 0, duration: 0.4 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                title="Réservations aujourd'hui"
                value={reservationStats.todayReservations}
                icon={CalendarDays}
                sparklineData={reservationSparkline}
                accentColor="violet"
                delay={showOrders ? 8 : 0}
              />
              <KpiCard
                title="Couverts"
                value={reservationStats.todayCovers}
                icon={Users}
                accentColor="blue"
                delay={showOrders ? 9 : 1}
              />
              <KpiCard
                title="Taux d'occupation"
                value={reservationStats.occupancyRate}
                suffix="%"
                icon={BarChart3}
                accentColor="green"
                delay={showOrders ? 10 : 2}
              />
              <KpiCard
                title="No-shows (30j)"
                value={reservationStats.noShowRate}
                suffix="%"
                icon={UserX}
                accentColor="red"
                delay={showOrders ? 11 : 3}
              />
            </div>
          </motion.div>

          {/* Prochaines réservations du jour */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showOrders ? 0.7 : 0.5, duration: 0.4 }}
          >
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-base font-semibold">
                  Prochaines réservations
                </CardTitle>
                <Link
                  href="/reservations"
                  className="text-xs text-violet hover:text-violet-dark flex items-center gap-1 font-medium transition-colors"
                >
                  Voir tout
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingReservations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      Aucune réservation à venir aujourd&apos;hui
                    </p>
                    <p className="text-xs mt-1">
                      Les nouvelles réservations apparaîtront ici en temps réel
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {upcomingReservations.map((resa, i) => {
                      const statusLabels: Record<string, { label: string; class: string }> = {
                        en_attente: { label: "En attente", class: "bg-amber-100 text-amber-700" },
                        confirmee: { label: "Confirmée", class: "bg-green-100 text-green-700" },
                      };
                      const statusInfo = statusLabels[resa.status] || {
                        label: resa.status,
                        class: "bg-gray-100 text-gray-600",
                      };

                      return (
                        <motion.div
                          key={resa.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: (showOrders ? 0.75 : 0.55) + i * 0.04,
                            duration: 0.3,
                          }}
                        >
                          <div className="flex items-center justify-between py-3 -mx-3 px-3 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0 text-center">
                                <span className="font-mono text-lg font-bold text-foreground leading-none">
                                  {resa.time_slot}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {resa.customer_name}
                                  </p>
                                  {resa.status === "en_attente" && (
                                    <PulsingDot color="amber" size="sm" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {resa.covers} couvert
                                  {resa.covers > 1 ? "s" : ""}
                                  {(() => {
                                    const ft = resa.floor_tables;
                                    const tableName = Array.isArray(ft)
                                      ? ft[0]?.name
                                      : ft?.name;
                                    return tableName ? ` · ${tableName}` : "";
                                  })()}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.class}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </PageWrapper>
  );
}
