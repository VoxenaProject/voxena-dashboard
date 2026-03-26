"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ShoppingBag,
  Euro,
  TrendingUp,
  Clock,
  ArrowRight,
  Phone,
  Copy,
  Check,
  CalendarDays,
  Users,
  BarChart3,
  UserX,
  CheckCheck,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PopularItemsChart } from "@/components/charts/popular-items-chart";
import type { Order, OrderItem, SubscriptionPlan } from "@/lib/supabase/types";
import type { ReservationStats, UpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";

// ── Types ──

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

interface DashboardContentProps {
  stats: DashboardStats | null;
  chartData: { label: string; revenue: number; orders: number }[];
  telnyxPhone?: string | null;
  plan?: SubscriptionPlan;
  reservationStats?: ReservationStats | null;
  upcomingSummary?: UpcomingReservationSummary | null;
}

// ── Composant principal ──

export function DashboardContent({
  stats,
  chartData,
  telnyxPhone,
  plan = "orders",
  reservationStats,
  upcomingSummary,
}: DashboardContentProps) {
  const [greeting, setGreeting] = useState("Bonjour");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("commandes");

  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const showTabs = plan === "pro";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Bonsoir");
    else if (hour >= 12) setGreeting("Bon après-midi");
    else setGreeting("Bonjour");
  }, []);

  // Pour les plans sans tabs, déterminer quel contenu afficher
  const showOrdersContent = showTabs ? activeTab === "commandes" : showOrders;
  const showReservationsContent = showTabs ? activeTab === "reservations" : showReservations;

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

      {/* Tabs pour le plan pro */}
      {showTabs && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="commandes">
                <Package className="w-3.5 h-3.5" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="reservations">
                <CalendarDays className="w-3.5 h-3.5" />
                Réservations
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>
      )}

      {/* ── Section Commandes (orders / pro tab commandes) ── */}
      {showOrdersContent && stats && (
        <OrdersSection
          stats={stats}
          chartData={chartData}
          telnyxPhone={telnyxPhone}
          copied={copied}
          setCopied={setCopied}
        />
      )}

      {/* ── Section Réservations (tables / pro tab réservations) ── */}
      {showReservationsContent && reservationStats && (
        <ReservationsSection
          reservationStats={reservationStats}
          upcomingSummary={upcomingSummary}
          reservationSparkline={reservationSparkline}
        />
      )}
    </PageWrapper>
  );
}

// ── Section Commandes ──

function OrdersSection({
  stats,
  chartData,
  telnyxPhone,
  copied,
  setCopied,
}: {
  stats: DashboardStats;
  chartData: { label: string; revenue: number; orders: number }[];
  telnyxPhone?: string | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  return (
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
  );
}

// ── Section Réservations ──

function ReservationsSection({
  reservationStats,
  upcomingSummary,
  reservationSparkline,
}: {
  reservationStats: ReservationStats;
  upcomingSummary?: UpcomingReservationSummary | null;
  reservationSparkline: number[];
}) {
  const router = useRouter();
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Copie locale des réservations pour mise à jour optimiste
  const [localReservations, setLocalReservations] = useState(
    upcomingSummary?.upcomingReservations || []
  );
  const [localDaySummaries, setLocalDaySummaries] = useState(
    upcomingSummary?.daySummaries || []
  );

  const daySummaries = localDaySummaries;
  const upcomingReservations = localReservations;

  // Confirmer une seule réservation
  async function handleConfirm(id: string) {
    setConfirmingId(id);
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "confirmee" }),
      });
      if (!res.ok) throw new Error("Erreur");

      // Mise à jour optimiste
      setLocalReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "confirmee" } : r))
      );
      setLocalDaySummaries((prev) =>
        prev.map((d) => {
          const resa = upcomingReservations.find((r) => r.id === id);
          if (resa && resa.date === d.date) {
            return { ...d, pendingCount: Math.max(0, d.pendingCount - 1) };
          }
          return d;
        })
      );
      toast.success("Réservation confirmée");
    } catch {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setConfirmingId(null);
    }
  }

  // Annuler une réservation
  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "annulee" }),
      });
      if (!res.ok) throw new Error("Erreur");

      // Retirer de la liste locale
      const resa = upcomingReservations.find((r) => r.id === id);
      setLocalReservations((prev) => prev.filter((r) => r.id !== id));
      if (resa) {
        setLocalDaySummaries((prev) =>
          prev.map((d) => {
            if (resa.date === d.date) {
              return {
                ...d,
                totalReservations: Math.max(0, d.totalReservations - 1),
                totalCovers: Math.max(0, d.totalCovers - resa.covers),
                pendingCount: resa.status === "en_attente"
                  ? Math.max(0, d.pendingCount - 1)
                  : d.pendingCount,
              };
            }
            return d;
          })
        );
      }
      toast.success("Réservation annulée");
    } catch {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancellingId(null);
    }
  }

  // Confirmer toutes les réservations en attente
  async function handleConfirmAll() {
    const pendingResas = upcomingReservations.filter((r) => r.status === "en_attente");
    if (pendingResas.length === 0) return;

    setConfirmingAll(true);
    try {
      const results = await Promise.allSettled(
        pendingResas.map((r) =>
          fetch("/api/reservations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, status: "confirmee" }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;

      // Mise à jour optimiste
      const pendingIds = new Set(pendingResas.map((r) => r.id));
      setLocalReservations((prev) =>
        prev.map((r) => (pendingIds.has(r.id) ? { ...r, status: "confirmee" } : r))
      );
      setLocalDaySummaries((prev) =>
        prev.map((d) => ({ ...d, pendingCount: 0 }))
      );

      toast.success(`${successCount} réservation${successCount > 1 ? "s" : ""} confirmée${successCount > 1 ? "s" : ""}`);
    } catch {
      toast.error("Erreur lors de la confirmation groupée");
    } finally {
      setConfirmingAll(false);
    }
  }

  const totalPending = upcomingReservations.filter((r) => r.status === "en_attente").length;

  return (
    <>
      {/* KPI Cards réservations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Réservations aujourd'hui"
            value={reservationStats.todayReservations}
            icon={CalendarDays}
            sparklineData={reservationSparkline}
            accentColor="violet"
            delay={0}
          />
          <KpiCard
            title="Couverts aujourd'hui"
            value={reservationStats.todayCovers}
            icon={Users}
            accentColor="blue"
            delay={1}
          />
          <KpiCard
            title="Taux d'occupation"
            value={reservationStats.occupancyRate}
            suffix="%"
            icon={BarChart3}
            accentColor="green"
            delay={2}
          />
          <KpiCard
            title="No-shows (30j)"
            value={reservationStats.noShowRate}
            suffix="%"
            icon={UserX}
            accentColor="red"
            delay={3}
          />
        </div>
      </motion.div>

      {/* 7 prochains jours */}
      {daySummaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-8"
        >
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-violet" />
                7 prochains jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 max-md:grid-cols-3 max-md:gap-3 max-sm:grid-cols-2">
                {daySummaries.map((day, i) => (
                  <motion.button
                    key={day.date}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                    onClick={() => router.push(`/reservations?date=${day.date}`)}
                    className={`
                      relative flex flex-col items-center p-3 rounded-xl border text-center transition-all duration-200
                      hover:shadow-card-hover hover:-translate-y-[1px] cursor-pointer
                      ${day.isToday
                        ? "border-l-[3px] border-l-violet bg-violet/5 border-violet/20"
                        : day.totalReservations > 0
                          ? "bg-blue/5 border-blue/15 hover:border-blue/30"
                          : "bg-muted/20 border-border hover:border-border/60"
                      }
                    `}
                  >
                    {/* Jour */}
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {day.dayShort}
                    </span>

                    {/* Numéro + mois */}
                    <span className="text-sm font-semibold mt-0.5">
                      {day.dayNumber}
                      {day.monthShort && (
                        <span className="text-[10px] text-muted-foreground ml-0.5 lowercase">
                          {day.monthShort}
                        </span>
                      )}
                    </span>

                    {/* Nombre de réservations */}
                    <span className={`font-heading text-xl font-bold mt-1.5 leading-none ${
                      day.totalReservations > 0 ? "text-foreground" : "text-muted-foreground/40"
                    }`}>
                      {day.totalReservations}
                    </span>

                    {/* Couverts */}
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {day.totalCovers} couvert{day.totalCovers !== 1 ? "s" : ""}
                    </span>

                    {/* Badge en_attente */}
                    {day.pendingCount > 0 && (
                      <span className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        {day.pendingCount} à confirmer
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Prochaines réservations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="font-heading text-base font-semibold">
                Prochaines réservations
              </CardTitle>
              {totalPending > 0 && (
                <Button
                  size="xs"
                  className="bg-green hover:bg-green/90 text-white gap-1"
                  onClick={handleConfirmAll}
                  disabled={confirmingAll}
                >
                  <CheckCheck className="w-3 h-3" />
                  {confirmingAll ? "Confirmation..." : `Tout confirmer (${totalPending})`}
                </Button>
              )}
            </div>
            <Link
              href="/reservations"
              className="text-xs text-violet hover:text-violet-dark flex items-center gap-1 font-medium transition-colors"
            >
              Voir toutes les réservations
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  Aucune réservation à venir
                </p>
                <p className="text-xs mt-1">
                  Les nouvelles réservations apparaîtront ici en temps réel
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {upcomingReservations.map((resa, i) => {
                  const statusLabels: Record<string, { label: string; className: string }> = {
                    en_attente: { label: "En attente", className: "bg-amber-100 text-amber-700" },
                    confirmee: { label: "Confirmée", className: "bg-green-100 text-green-700" },
                    assise: { label: "Assise", className: "bg-blue-100 text-blue-700" },
                  };
                  const statusInfo = statusLabels[resa.status] || {
                    label: resa.status,
                    className: "bg-gray-100 text-gray-600",
                  };

                  const isToday = resa.dateLabel === "Aujourd'hui";

                  return (
                    <motion.div
                      key={resa.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.04, duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between py-3 -mx-3 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Heure */}
                          <span className="font-mono text-base font-bold text-foreground w-[52px] flex-shrink-0">
                            {resa.time_slot.slice(0, 5)}
                          </span>

                          {/* Date si pas aujourd'hui */}
                          {!isToday && (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              {resa.dateLabel}
                            </span>
                          )}

                          {/* Nom client */}
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
                              {resa.covers} couvert{resa.covers > 1 ? "s" : ""}
                              {resa.table_name && ` · ${resa.table_name}`}
                            </p>
                          </div>
                        </div>

                        {/* Droite : badge + actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>

                          {resa.status === "en_attente" && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="xs"
                                className="bg-green hover:bg-green/90 text-white gap-1"
                                onClick={() => handleConfirm(resa.id)}
                                disabled={confirmingId === resa.id}
                              >
                                <Check className="w-3 h-3" />
                                {confirmingId === resa.id ? "..." : "Confirmer"}
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() => handleCancel(resa.id)}
                                disabled={cancellingId === resa.id}
                              >
                                <UserX className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Chart tendances hebdomadaires */}
      {reservationSparkline.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="mt-8"
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Réservations — 7 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationBarChart data={reservationStats.weeklyTrends} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}

// ── Mini bar chart pour les tendances de réservations ──

function ReservationBarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const dayNamesShort = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="flex items-end gap-3 h-[120px] pt-4">
      {data.map((d, i) => {
        const dateObj = new Date(d.date + "T12:00:00");
        const dayLabel = dayNamesShort[dateObj.getDay()];
        const heightPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        const isToday = d.date === new Date().toISOString().split("T")[0];

        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Valeur */}
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {d.count}
            </span>
            {/* Barre */}
            <motion.div
              className={`w-full rounded-t-md min-h-[4px] ${
                isToday ? "bg-violet" : "bg-violet/30"
              }`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(heightPercent, 5)}%` }}
              transition={{ delay: 0.6 + i * 0.05, duration: 0.4, ease: "easeOut" }}
            />
            {/* Label jour */}
            <span className={`text-[11px] font-medium ${isToday ? "text-violet" : "text-muted-foreground"}`}>
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
