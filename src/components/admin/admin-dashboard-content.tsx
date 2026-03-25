"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Store,
  ShoppingBag,
  Euro,
  AlertTriangle,
  ArrowRight,
  Phone,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { AlertsPanel } from "@/components/admin/alerts-panel";
import type { RestaurantHealth, AdminAlert } from "@/lib/dashboard/admin-stats";

// Types pour les stats admin
interface AdminStats {
  mrr: number;
  totalRestaurants: number;
  activeRestaurants: number;
  todayOrderCount: number;
  todayRevenue: number;
  orderTrend: number;
  revenueTrend: number;
  errorCount: number;
  dailyRevenue: number[];
  restaurantHealth: RestaurantHealth[];
  alerts: AdminAlert[];
}

// Calcul du pourcentage d'onboarding complété
function getOnboardingProgress(r: RestaurantHealth): number {
  const steps = [r.hasMenu, r.hasAgentId, r.hasWhatsApp, r.hasPhone];
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

export function AdminDashboardContent({
  stats,
  chartData,
}: {
  stats: AdminStats;
  chartData: { label: string; revenue: number; orders: number }[];
}) {
  return (
    <PageWrapper>
      {/* En-tete */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centre de controle Voxena — {stats.totalRestaurants} restaurant
          {stats.totalRestaurants > 1 ? "s" : ""}
        </p>
      </div>

      {/* Row 1 : 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard
          title="MRR"
          value={stats.mrr}
          prefix=""
          suffix="€"
          icon={Wallet}
          accentColor="green"
          delay={0}
        />
        <KpiCard
          title="Restaurants actifs"
          value={stats.activeRestaurants}
          suffix={`/${stats.totalRestaurants}`}
          icon={Store}
          accentColor="violet"
          delay={1}
        />
        <KpiCard
          title="Commandes aujourd'hui"
          value={stats.todayOrderCount}
          icon={ShoppingBag}
          trend={{
            value: Math.abs(stats.orderTrend),
            isPositive: stats.orderTrend >= 0,
          }}
          accentColor="blue"
          delay={2}
        />
        <KpiCard
          title="Revenus aujourd'hui"
          value={stats.todayRevenue}
          suffix="€"
          icon={Euro}
          trend={{
            value: Math.abs(stats.revenueTrend),
            isPositive: stats.revenueTrend >= 0,
          }}
          accentColor="amber"
          delay={3}
        />
        <KpiCard
          title="Agents en erreur"
          value={stats.errorCount}
          icon={AlertTriangle}
          accentColor="red"
          delay={4}
        />
      </div>

      {/* Row 2 : Alertes (conditionnelles) */}
      <AlertsPanel alerts={stats.alerts} />

      {/* Row 3 : Chart revenus 7 jours */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mb-8"
      >
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus globaux — 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 4 : Restaurant Health Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-semibold">
            Sante des restaurants
          </h2>
          <Link
            href="/admin/restaurants"
            className="text-xs text-violet hover:text-violet-dark flex items-center gap-1 font-medium transition-colors"
          >
            Voir tout
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.restaurantHealth.length === 0 ? (
          <Card className="shadow-card">
            <CardContent>
              <p className="text-center text-muted-foreground py-8 text-sm">
                Aucun restaurant.{" "}
                <Link
                  href="/admin/restaurants/new"
                  className="text-violet hover:underline"
                >
                  Ajouter le premier
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.restaurantHealth.map((r, i) => {
              const onboarding = getOnboardingProgress(r);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.5 + i * 0.04,
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <Link href={`/admin/restaurants/${r.id}`}>
                    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer group h-full">
                      <CardContent className="pt-1">
                        {/* Ligne 1 : Nom + Health dot */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                r.health === "green"
                                  ? "bg-green"
                                  : r.health === "yellow"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <p className="text-sm font-semibold truncate">
                              {r.name}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize flex-shrink-0 ${
                              r.agent_status === "error"
                                ? "text-red-500 border-red-500/20"
                                : r.agent_status === "paused"
                                ? "text-amber-600 border-amber-500/20"
                                : "text-green border-green/20"
                            }`}
                          >
                            {r.agent_status}
                          </Badge>
                        </div>

                        {/* Ligne 2 : Owner */}
                        {r.owner_name && (
                          <p className="text-xs text-muted-foreground mb-3 truncate">
                            {r.owner_name}
                            {r.telnyx_phone && (
                              <span className="inline-flex items-center gap-0.5 ml-2">
                                <Phone className="w-3 h-3" />
                                {r.telnyx_phone}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Ligne 3 : Commandes + Revenus du jour */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm font-bold tabular-nums">
                              {r.todayOrders}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              cmd
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm font-bold tabular-nums">
                              {r.todayRevenue.toFixed(0)}€
                            </span>
                          </div>
                        </div>

                        {/* Ligne 4 : Onboarding + Subscription */}
                        <div className="flex items-center justify-between">
                          {/* Barre de progression onboarding */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {onboarding === 100 ? (
                              <div className="flex items-center gap-1 text-xs text-green">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="font-medium">Complet</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
                                  <div
                                    className="h-full bg-violet rounded-full transition-all duration-500"
                                    style={{ width: `${onboarding}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                  {onboarding}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Badge subscription */}
                          <Badge
                            variant="secondary"
                            className="text-[9px] ml-2 flex-shrink-0"
                          >
                            {r.agent_status === "active"
                              ? "Actif"
                              : r.agent_status === "paused"
                              ? "Pause"
                              : r.agent_status === "error"
                              ? "Erreur"
                              : "Setup"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
