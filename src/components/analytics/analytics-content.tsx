"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PeakHoursHeatmap } from "@/components/analytics/peak-hours-heatmap";
import { AgentMetricsPanel } from "@/components/analytics/agent-metrics";
import { CustomerInsightsPanel } from "@/components/analytics/customer-insights";
import { RevenueTrendsChart } from "@/components/analytics/revenue-trends";
import { ReservationAnalyticsPanel } from "@/components/analytics/reservation-analytics";
import type { SubscriptionPlan } from "@/lib/supabase/types";
import type {
  PeakHourData,
  AgentMetrics,
  CustomerStats,
  RevenueTrend,
  ReservationAnalytics,
  AnalyticsPeriod,
} from "@/lib/dashboard/analytics-stats";

interface Props {
  restaurantId: string;
  plan: SubscriptionPlan;
}

interface AnalyticsData {
  peakHours: PeakHourData[];
  agentMetrics: AgentMetrics;
  customerStats: CustomerStats;
  revenueTrends: RevenueTrend[];
  reservationAnalytics: ReservationAnalytics;
}

const periodLabels: Record<AnalyticsPeriod, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
};

export function AnalyticsContent({ restaurantId, plan }: Props) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?restaurant_id=${restaurantId}&period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("[analytics] Erreur fetch:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [restaurantId, period]);

  return (
    <PageWrapper>
      {/* Sélecteur de période */}
      <div className="flex gap-1 mb-8 p-1 bg-muted/50 rounded-lg w-fit">
        {(["7d", "30d", "90d"] as AnalyticsPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Revenue Trends (orders/pro) */}
          {showOrders && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Revenus — {periodLabels[period]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueTrendsChart data={data.revenueTrends} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Heatmap heures de pointe */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Heures de pointe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PeakHoursHeatmap data={data.peakHours} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Agent + Clients côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métriques agent */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Agent vocal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AgentMetricsPanel data={data.agentMetrics} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Insights clients */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="shadow-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerInsightsPanel data={data.customerStats} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Reservation Analytics (tables/pro) */}
          {showReservations && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Analyse réservations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReservationAnalyticsPanel data={data.reservationAnalytics} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-12">
          Impossible de charger les analytics
        </p>
      )}
    </PageWrapper>
  );
}
