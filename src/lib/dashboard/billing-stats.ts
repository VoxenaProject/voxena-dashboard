import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "@/lib/supabase/types";

// --- Interfaces ---

export interface BillingStats {
  mrr: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  churnRate: number;
  monthlyUsageCost: number;
  profitMargin: number;
  profitMarginPercent: number;
  restaurantBilling: RestaurantBilling[];
  monthlyTrends: MonthlyTrend[];
  billingAlerts: BillingAlert[];
}

export interface RestaurantBilling {
  id: string;
  name: string;
  owner_name: string | null;
  subscription_status: string;
  subscription_amount: number;
  subscription_started_at: string | null;
  trial_ends_at: string | null;
  currentMonthMinutes: number;
  currentMonthCost: number;
  currentMonthCalls: number;
  profitability: number;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  restaurantCount: number;
}

export interface BillingAlert {
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  restaurantId?: string;
}

// --- Helpers ---

/** Formater un mois en label lisible (ex: "Jan 2026") */
function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

/** Retourne les 6 derniers mois au format "YYYY-MM" (du plus ancien au plus récent) */
function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${m}`);
  }
  return months;
}

/** Mois courant au format "YYYY-MM" */
function getCurrentMonth(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${m}`;
}

// --- Fetch principal ---

/**
 * Récupère toutes les statistiques billing pour la page Finances admin.
 * Gère gracieusement le cas où la table usage_records n'existe pas encore.
 */
export async function getBillingStats(
  supabase: SupabaseClient
): Promise<BillingStats> {
  const currentMonth = getCurrentMonth();
  const last6 = getLast6Months();
  const oldestMonth = last6[0];

  // --- Requêtes parallèles ---
  const [
    { data: restaurants },
    currentUsageResult,
    historicalUsageResult,
  ] = await Promise.all([
    // 1. Tous les restaurants
    supabase.from("restaurants").select("*"),

    // 2. Usage du mois courant (gère table inexistante)
    supabase
      .from("usage_records")
      .select("*")
      .eq("month", currentMonth)
      .then((res) => {
        // Si la table n'existe pas, retourner un résultat vide
        if (res.error) return { data: [], error: null };
        return res;
      }),

    // 3. Usage des 6 derniers mois
    supabase
      .from("usage_records")
      .select("*")
      .gte("month", oldestMonth)
      .order("month", { ascending: true })
      .then((res) => {
        if (res.error) return { data: [], error: null };
        return res;
      }),
  ]);

  const allRestos = (restaurants as Restaurant[]) || [];
  const currentUsage = (currentUsageResult.data || []) as {
    restaurant_id: string;
    month: string;
    call_count: number;
    total_minutes: number;
    total_cost: number;
  }[];
  const historicalUsage = (historicalUsageResult.data || []) as {
    restaurant_id: string;
    month: string;
    call_count: number;
    total_minutes: number;
    total_cost: number;
  }[];

  // --- Lookup usage par restaurant pour le mois courant ---
  const usageByRestaurant = new Map(
    currentUsage.map((u) => [u.restaurant_id, u])
  );

  // --- Calculs globaux ---
  const activeRestos = allRestos.filter(
    (r) => r.subscription_status === "active"
  );
  const cancelledRestos = allRestos.filter(
    (r) => r.subscription_status === "cancelled"
  );
  const totalWithStatus = activeRestos.length + cancelledRestos.length;

  const mrr = activeRestos.reduce(
    (sum, r) => sum + (Number(r.subscription_amount) || 0),
    0
  );

  const churnRate =
    totalWithStatus > 0
      ? (cancelledRestos.length / totalWithStatus) * 100
      : 0;

  const monthlyUsageCost = currentUsage.reduce(
    (sum, u) => sum + Number(u.total_cost || 0),
    0
  );

  const profitMargin = mrr - monthlyUsageCost;
  const profitMarginPercent = mrr > 0 ? (profitMargin / mrr) * 100 : 0;

  // --- Per-restaurant billing ---
  const restaurantBilling: RestaurantBilling[] = allRestos.map((r) => {
    const usage = usageByRestaurant.get(r.id);
    const currentMonthMinutes = Number(usage?.total_minutes || 0);
    const currentMonthCost = Number(usage?.total_cost || 0);
    const currentMonthCalls = Number(usage?.call_count || 0);
    const subAmount = Number(r.subscription_amount) || 0;
    const profitability =
      r.subscription_status === "active"
        ? subAmount - currentMonthCost
        : -currentMonthCost;

    return {
      id: r.id,
      name: r.name,
      owner_name: r.owner_name,
      subscription_status: r.subscription_status || "trialing",
      subscription_amount: subAmount,
      subscription_started_at: r.subscription_started_at,
      trial_ends_at: r.trial_ends_at,
      currentMonthMinutes,
      currentMonthCost,
      currentMonthCalls,
      profitability,
    };
  });

  // Trier par profitabilité (la plus haute en premier)
  restaurantBilling.sort((a, b) => b.profitability - a.profitability);

  // --- Monthly trends (6 mois) ---
  // Lookup usage par mois
  const usageByMonth = new Map<
    string,
    { totalCost: number; totalMinutes: number; totalCalls: number }
  >();
  for (const u of historicalUsage) {
    const existing = usageByMonth.get(u.month) || {
      totalCost: 0,
      totalMinutes: 0,
      totalCalls: 0,
    };
    existing.totalCost += Number(u.total_cost || 0);
    existing.totalMinutes += Number(u.total_minutes || 0);
    existing.totalCalls += Number(u.call_count || 0);
    usageByMonth.set(u.month, existing);
  }

  const monthlyTrends: MonthlyTrend[] = last6.map((month) => {
    // Revenus = nombre de restos actifs à cette période * montant moyen
    // Approximation : on prend les restos dont subscription_started_at <= fin du mois
    const monthEnd = new Date(`${month}-28T23:59:59Z`);
    const activeInMonth = allRestos.filter((r) => {
      if (!r.subscription_started_at) return false;
      if (new Date(r.subscription_started_at) > monthEnd) return false;
      if (
        r.subscription_status === "cancelled" &&
        r.cancelled_at &&
        new Date(r.cancelled_at) < new Date(`${month}-01`)
      )
        return false;
      return (
        r.subscription_status === "active" ||
        r.subscription_status === "cancelled"
      );
    });

    const revenue = activeInMonth.reduce(
      (sum, r) => sum + (Number(r.subscription_amount) || 0),
      0
    );
    const usage = usageByMonth.get(month);
    const cost = usage?.totalCost || 0;

    return {
      month,
      label: formatMonthLabel(month),
      revenue,
      cost,
      profit: revenue - cost,
      restaurantCount: activeInMonth.length,
    };
  });

  // --- Alertes billing ---
  const billingAlerts: BillingAlert[] = [];
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  for (const r of allRestos) {
    // Trial se terminant dans < 3 jours
    if (r.subscription_status === "trialing" && r.trial_ends_at) {
      const trialEnd = new Date(r.trial_ends_at);
      if (trialEnd <= threeDaysFromNow && trialEnd >= now) {
        const daysLeft = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / 86400000
        );
        billingAlerts.push({
          type: "warning",
          title: `Trial expire bientôt — ${r.name}`,
          description: `Le trial expire dans ${daysLeft} jour(s). Contacter le restaurateur.`,
          restaurantId: r.id,
        });
      }
    }

    // Impayé (past_due)
    if (r.subscription_status === "past_due") {
      billingAlerts.push({
        type: "error",
        title: `Paiement en retard — ${r.name}`,
        description: "L'abonnement est impayé. Action requise.",
        restaurantId: r.id,
      });
    }

    // Coût élevé : usage > 60% du montant d'abonnement
    const usage = usageByRestaurant.get(r.id);
    if (usage && r.subscription_status === "active") {
      const subAmount = Number(r.subscription_amount) || 0;
      const costRatio = subAmount > 0 ? Number(usage.total_cost) / subAmount : 0;
      if (costRatio > 0.6) {
        billingAlerts.push({
          type: "warning",
          title: `Coût élevé — ${r.name}`,
          description: `L'usage représente ${Math.round(costRatio * 100)}% de l'abonnement (${Number(usage.total_cost).toFixed(2)}€ / ${subAmount.toFixed(2)}€).`,
          restaurantId: r.id,
        });
      }
    }
  }

  // Trier : errors d'abord, puis warnings, puis info
  const alertOrder = { error: 0, warning: 1, info: 2 };
  billingAlerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type]);

  return {
    mrr,
    activeSubscriptions: activeRestos.length,
    totalSubscriptions: allRestos.length,
    churnRate,
    monthlyUsageCost,
    profitMargin,
    profitMarginPercent,
    restaurantBilling,
    monthlyTrends,
    billingAlerts,
  };
}
