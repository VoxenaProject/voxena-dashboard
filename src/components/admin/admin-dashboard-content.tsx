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
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { AlertsPanel } from "@/components/admin/alerts-panel";
import type { RestaurantHealth, AdminAlert } from "@/lib/dashboard/admin-stats";

interface AdminStats {
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

export function AdminDashboardContent({
  stats,
  chartData,
}: {
  stats: AdminStats;
  chartData: { label: string; revenue: number; orders: number }[];
}) {
  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centre de contrôle Voxena — {stats.totalRestaurants} restaurant
          {stats.totalRestaurants > 1 ? "s" : ""}
        </p>
      </div>

      {/* Alertes */}
      <AlertsPanel alerts={stats.alerts} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Restaurants actifs"
          value={stats.activeRestaurants}
          suffix={`/${stats.totalRestaurants}`}
          icon={Store}
          accentColor="violet"
          delay={0}
        />
        <KpiCard
          title="Commandes aujourd'hui"
          value={stats.todayOrderCount}
          icon={ShoppingBag}
          trend={{
            value: Math.abs(stats.orderTrend),
            isPositive: stats.orderTrend >= 0,
          }}
          accentColor="green"
          delay={1}
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
          accentColor="blue"
          delay={2}
        />
        <KpiCard
          title="Agents en erreur"
          value={stats.errorCount}
          icon={AlertTriangle}
          accentColor={stats.errorCount > 0 ? "amber" : "green"}
          delay={3}
        />
      </div>

      {/* Chart revenus */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
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

      {/* Liste restaurants avec santé */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-base font-semibold">
              Restaurants
            </CardTitle>
            <Link
              href="/admin/restaurants"
              className="text-xs text-violet hover:text-violet-dark flex items-center gap-1 font-medium"
            >
              Gérer
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.restaurantHealth.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Aucun restaurant.{" "}
                <Link href="/admin/restaurants/new" className="text-violet hover:underline">
                  Ajouter le premier
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.restaurantHealth.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.03 }}
                  >
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Health dot */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            r.health === "green"
                              ? "bg-green"
                              : r.health === "yellow"
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {r.name}
                            </p>
                            {/* Onboarding status */}
                            {(!r.hasMenu || !r.hasAgentId) && (
                              <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/20">
                                Setup incomplet
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {r.owner_name && <span>{r.owner_name}</span>}
                            {r.telnyx_phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3" />
                                {r.telnyx_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {r.todayOrders} cmd
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {r.todayRevenue.toFixed(0)}€
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
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
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageWrapper>
  );
}
