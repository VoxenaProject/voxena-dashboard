"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ShoppingBag, Euro, TrendingUp, Clock, ArrowRight, Phone, Copy, Check } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PopularItemsChart } from "@/components/charts/popular-items-chart";
import type { Order, OrderItem } from "@/lib/supabase/types";

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
  stats: DashboardStats;
  chartData: { label: string; revenue: number; orders: number }[];
  telnyxPhone?: string | null;
}

export function DashboardContent({ stats, chartData, telnyxPhone }: DashboardContentProps) {
  const [greeting, setGreeting] = useState("Bonjour");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18) setGreeting("Bonsoir");
    else if (hour >= 12) setGreeting("Bon après-midi");
    else setGreeting("Bonjour");
  }, []);

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

      {/* KPI Cards */}
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
    </PageWrapper>
  );
}
