"use client";

import { useState } from "react";
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
  CalendarDays,
  Users,
  BarChart3,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardLiveIndicator } from "@/components/dashboard/dashboard-live-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PopularItemsChart } from "@/components/charts/popular-items-chart";
import type { Order, OrderItem, SubscriptionPlan } from "@/lib/supabase/types";
import type { ReservationStats, UpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";

// -- Types --

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
  restaurantId: string;
}

// -- Composant principal --

export function DashboardContent({
  stats,
  chartData,
  telnyxPhone,
  plan = "orders",
  reservationStats,
  upcomingSummary,
  restaurantId,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState("commandes");

  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";
  const showTabs = plan === "pro";

  // Pour les plans sans tabs, déterminer quel contenu afficher
  const showOrdersContent = showTabs ? activeTab === "commandes" : showOrders;
  const showReservationsContent = showTabs ? activeTab === "reservations" : showReservations;

  // Données sparkline pour les réservations hebdomadaires
  const reservationSparkline = reservationStats?.weeklyTrends.map((t) => t.count) || [];

  return (
    <PageWrapper>
      {/* Indicateur temps réel — polling nouvelles commandes/réservations */}
      <DashboardLiveIndicator restaurantId={restaurantId} />

      {/* Tabs pour le plan pro — style underline */}
      {showTabs && (
        <div className="mb-10">
          <div className="flex gap-6 border-b border-border">
            <button
              onClick={() => setActiveTab("commandes")}
              className={`pb-2.5 text-sm font-medium transition-colors ${
                activeTab === "commandes"
                  ? "text-foreground border-b-2 border-violet"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveTab("reservations")}
              className={`pb-2.5 text-sm font-medium transition-colors ${
                activeTab === "reservations"
                  ? "text-foreground border-b-2 border-violet"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Réservations
            </button>
          </div>
        </div>
      )}

      {/* Numéro de téléphone Voxena */}
      {telnyxPhone && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 mb-10">
          <span className="text-xs text-muted-foreground">Ligne de commande :</span>
          <span className="font-mono text-sm font-medium">{telnyxPhone}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(telnyxPhone); }}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Copier
          </button>
        </div>
      )}

      {/* -- Section Commandes (orders / pro tab commandes) -- */}
      {showOrdersContent && stats && (
        <OrdersSection
          stats={stats}
          chartData={chartData}
        />
      )}

      {/* -- Section Réservations (tables / pro tab réservations) -- */}
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

// -- Section Commandes --

function OrdersSection({
  stats,
  chartData,
}: {
  stats: DashboardStats;
  chartData: { label: string; revenue: number; orders: number }[];
}) {
  return (
    <div className="space-y-10">
      {/* KPI Cards commandes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" data-tour="kpi-cards">
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

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          className="md:col-span-1 lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
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
              <CardTitle className="text-sm font-medium">
                Articles populaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PopularItemsChart items={stats.topItems} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Lien vers les commandes */}
      <div className="flex justify-end">
        <Link
          href="/orders"
          className="text-xs text-violet hover:text-violet/80 font-medium transition-colors"
        >
          Voir les commandes →
        </Link>
      </div>
    </div>
  );
}

// -- Section Réservations --

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
  // Copie locale des réservations pour mise à jour optimiste
  const [localReservations, setLocalReservations] = useState(
    upcomingSummary?.upcomingReservations || []
  );
  const [localDaySummaries, setLocalDaySummaries] = useState(
    upcomingSummary?.daySummaries || []
  );

  const daySummaries = localDaySummaries;
  const upcomingReservations = localReservations;

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

  // Status dot colors pour le dashboard
  const statusDotMap: Record<string, string> = {
    en_attente: "bg-amber-500",
    confirmee: "bg-green",
    assise: "bg-blue",
    terminee: "bg-muted-foreground/30",
    annulee: "bg-red-500",
    no_show: "bg-red-700",
  };

  const statusLabelMap: Record<string, string> = {
    en_attente: "En attente",
    confirmee: "Confirmée",
    assise: "Assise",
    terminee: "Terminée",
    annulee: "Annulée",
    no_show: "No-show",
  };

  return (
    <div className="space-y-10">
      {/* KPI Cards réservations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

      {/* 7 prochains jours — design simplifié */}
      {daySummaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-semibold">
                7 prochains jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-4 max-sm:grid-cols-2 max-lg:gap-3">
                {daySummaries.map((day, i) => {
                  const hasReservations = day.totalReservations > 0;
                  return (
                    <motion.button
                      key={day.date}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                      onClick={() => router.push(`/reservations?date=${day.date}`)}
                      className={`
                        flex flex-col items-center text-center px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer
                        ${day.isToday
                          ? "bg-violet/[0.06] text-violet border border-violet/20"
                          : hasReservations
                            ? "bg-muted/50 border border-transparent"
                            : "bg-transparent border border-transparent"
                        }
                      `}
                    >
                      <span className={`text-[11px] font-medium ${
                        day.isToday ? "text-violet" : "text-muted-foreground"
                      }`}>
                        {day.dayShort}
                      </span>
                      <span className={`text-sm font-semibold ${
                        day.isToday ? "text-violet" : "text-foreground"
                      }`}>
                        {day.dayNumber}
                      </span>
                      <span className={`text-[11px] ${
                        hasReservations
                          ? day.isToday ? "text-violet font-medium" : "text-foreground"
                          : "text-muted-foreground/40"
                      }`}>
                        {hasReservations ? day.totalReservations : "\u00B7"}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Prochaines réservations — simplifié, pas d'actions */}
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
                <button
                  className="text-xs font-medium text-violet hover:text-violet/80 transition-colors disabled:opacity-50"
                  onClick={handleConfirmAll}
                  disabled={confirmingAll}
                >
                  {confirmingAll ? "Confirmation..." : `Tout confirmer (${totalPending})`}
                </button>
              )}
            </div>
            <Link
              href="/reservations"
              className="text-xs text-violet hover:text-violet-dark font-medium transition-colors"
            >
              Voir les réservations &rarr;
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
              <div>
                {upcomingReservations.map((resa, i) => {
                  const isToday = resa.dateLabel === "Aujourd'hui";
                  const dotColor = statusDotMap[resa.status] || "bg-muted-foreground/30";
                  const statusLabel = statusLabelMap[resa.status] || resa.status;

                  return (
                    <motion.div
                      key={resa.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.04, duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between py-3 -mx-3 px-3 rounded-lg hover:bg-muted/30 transition-all duration-200">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Heure */}
                          <span className="font-mono text-sm font-semibold text-foreground w-[44px] flex-shrink-0">
                            {resa.time_slot.slice(0, 5)}
                          </span>

                          {/* Date si pas aujourd'hui */}
                          {!isToday && (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              {resa.dateLabel}
                            </span>
                          )}

                          {/* Nom client */}
                          <p className="text-sm font-medium truncate">
                            {resa.customer_name}
                          </p>

                          {/* Couverts */}
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {resa.covers} couv.
                          </span>
                        </div>

                        {/* Droite : dot + label statut */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="text-xs text-muted-foreground">
                            {statusLabel}
                          </span>
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
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Réservations — 7 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationBarChart data={reservationStats.weeklyTrends} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// -- Mini bar chart pour les tendances de réservations --

function ReservationBarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const dayNamesShort = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="flex items-end gap-3 h-[140px] pt-4">
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
