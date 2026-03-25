"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Users,
  PhoneCall,
  TrendingUp,
  MoreHorizontal,
  Pause,
  Play,
  XCircle,
  PencilLine,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfitChart } from "@/components/charts/profit-chart";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BillingStats, RestaurantBilling, BillingAlert } from "@/lib/dashboard/billing-stats";
import type { SubscriptionStatus } from "@/lib/supabase/types";

// --- Actions billing ---

async function updateBilling(
  restaurantId: string,
  updates: Record<string, unknown>
) {
  const res = await fetch("/api/billing", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurant_id: restaurantId, ...updates }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erreur lors de la mise à jour");
  }
  return res.json();
}

// --- Composant principal ---

export function FinancesDashboardContent({
  stats,
}: {
  stats: BillingStats;
}) {
  return (
    <PageWrapper>
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Finances
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Billing, abonnements et rentabilité — {stats.totalSubscriptions} restaurant
          {stats.totalSubscriptions > 1 ? "s" : ""}
        </p>
      </div>

      {/* Row 1 : 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          title="Abonnements actifs"
          value={stats.activeSubscriptions}
          suffix={`/${stats.totalSubscriptions}`}
          icon={Users}
          accentColor="violet"
          delay={1}
        />
        <KpiCard
          title="Coûts du mois"
          value={stats.monthlyUsageCost}
          prefix=""
          suffix="€"
          decimals={2}
          icon={PhoneCall}
          accentColor="amber"
          delay={2}
        />
        <KpiCard
          title="Marge nette"
          value={stats.profitMargin}
          prefix=""
          suffix="€"
          icon={TrendingUp}
          trend={{
            value: Math.round(stats.profitMarginPercent),
            isPositive: stats.profitMarginPercent >= 0,
          }}
          accentColor="blue"
          delay={3}
        />
      </div>

      {/* Row 2 : Profit Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-8"
      >
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus vs Coûts — 6 derniers mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitChart data={stats.monthlyTrends} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3 : Table billing par restaurant */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mb-8"
      >
        <RestaurantBillingTable restaurants={stats.restaurantBilling} />
      </motion.div>

      {/* Row 4 : Alertes billing */}
      {stats.billingAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <BillingAlertsPanel alerts={stats.billingAlerts} />
        </motion.div>
      )}
    </PageWrapper>
  );
}

// --- Table billing ---

function RestaurantBillingTable({
  restaurants,
}: {
  restaurants: RestaurantBilling[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [items, setItems] = useState(restaurants);

  async function handleAction(
    restaurantId: string,
    action: "pause" | "resume" | "cancel" | "amount",
    currentStatus: string
  ) {
    setLoading(restaurantId);
    try {
      let updates: Record<string, unknown> = {};

      if (action === "pause") {
        updates = { subscription_status: "paused", previous_status: currentStatus };
      } else if (action === "resume") {
        updates = { subscription_status: "active", previous_status: currentStatus };
      } else if (action === "cancel") {
        updates = { subscription_status: "cancelled", previous_status: currentStatus };
      } else if (action === "amount") {
        const newAmount = prompt("Nouveau montant mensuel (€) :");
        if (!newAmount || isNaN(Number(newAmount))) {
          setLoading(null);
          return;
        }
        updates = { subscription_amount: Number(newAmount) };
      }

      await updateBilling(restaurantId, updates);

      // Mettre à jour localement
      setItems((prev) =>
        prev.map((r) => {
          if (r.id !== restaurantId) return r;
          return {
            ...r,
            ...(updates.subscription_status
              ? { subscription_status: updates.subscription_status as string }
              : {}),
            ...(updates.subscription_amount !== undefined
              ? {
                  subscription_amount: Number(updates.subscription_amount),
                  profitability:
                    Number(updates.subscription_amount) - r.currentMonthCost,
                }
              : {}),
          };
        })
      );
    } catch (err) {
      console.error("[finances] Erreur action billing:", err);
      alert("Erreur lors de la mise à jour. Voir la console.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Billing par restaurant
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-medium text-muted-foreground">Restaurant</th>
              <th className="pb-3 font-medium text-muted-foreground">Statut</th>
              <th className="pb-3 font-medium text-muted-foreground text-right">Abo/mois</th>
              <th className="pb-3 font-medium text-muted-foreground text-right">Minutes</th>
              <th className="pb-3 font-medium text-muted-foreground text-right">Coût</th>
              <th className="pb-3 font-medium text-muted-foreground text-right">Profit</th>
              <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.03, duration: 0.25 }}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    {r.owner_name && (
                      <p className="text-xs text-muted-foreground">{r.owner_name}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <SubscriptionBadge status={r.subscription_status as SubscriptionStatus} />
                </td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums">
                  {r.subscription_amount.toFixed(2)}€
                </td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums">
                  {r.currentMonthMinutes.toFixed(1)}
                </td>
                <td className="py-3 pr-4 text-right font-mono tabular-nums">
                  {r.currentMonthCost.toFixed(2)}€
                </td>
                <td
                  className={`py-3 pr-4 text-right font-mono tabular-nums font-semibold ${
                    r.profitability >= 0 ? "text-green" : "text-red-500"
                  }`}
                >
                  {r.profitability >= 0 ? "+" : ""}
                  {r.profitability.toFixed(2)}€
                </td>
                <td className="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      disabled={loading === r.id}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.subscription_status === "paused" ? (
                        <DropdownMenuItem
                          onClick={() => handleAction(r.id, "resume", r.subscription_status)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Reprendre
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleAction(r.id, "pause", r.subscription_status)}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Mettre en pause
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleAction(r.id, "amount", r.subscription_status)}
                      >
                        <PencilLine className="w-4 h-4 mr-2" />
                        Changer montant
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction(r.id, "cancel", r.subscription_status)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Résilier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </motion.tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aucun restaurant configuré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// --- Alertes billing ---

function BillingAlertsPanel({ alerts }: { alerts: BillingAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = alerts.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-base font-semibold mb-3">
        Alertes billing
      </h2>
      <AnimatePresence>
        {alerts.map((alert, i) => {
          if (dismissed.has(i)) return null;
          const isError = alert.type === "error";
          const isWarning = alert.type === "warning";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                isError
                  ? "bg-red-500/6 border-red-500/15"
                  : isWarning
                  ? "bg-amber-500/6 border-amber-500/15"
                  : "bg-blue/6 border-blue/15"
              }`}
            >
              {isError ? (
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.description}
                </p>
              </div>
              <button
                onClick={() =>
                  setDismissed((prev) => new Set(prev).add(i))
                }
                className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
