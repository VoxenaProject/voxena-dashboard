import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant, Order } from "@/lib/supabase/types";

// Santé d'un restaurant individuel avec onboarding + billing
export interface RestaurantHealth {
  id: string;
  name: string;
  owner_name: string | null;
  agent_status: string;
  telnyx_phone: string | null;
  todayOrders: number;
  todayRevenue: number;
  lastOrderAt: string | null;
  health: "green" | "yellow" | "red";
  // Checklist onboarding
  hasMenu: boolean;
  hasAgentId: boolean;
  hasWhatsApp: boolean;
  hasPhone: boolean;
  // Billing (phase 8)
  subscription_status: string;
  subscription_amount: number;
}

// Alerte admin avec contexte restaurant
export interface AdminAlert {
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  restaurantId?: string;
  restaurantName?: string;
  link?: string;
}

// Stats globales retournées par getAdminStats
export interface AdminStats {
  totalRestaurants: number;
  activeRestaurants: number;
  todayOrderCount: number;
  todayRevenue: number;
  orderTrend: number; // % vs hier
  revenueTrend: number; // % vs hier
  errorCount: number;
  mrr: number; // Revenu mensuel récurrent
  dailyRevenue: number[]; // 7 derniers jours
  restaurantHealth: RestaurantHealth[];
  alerts: AdminAlert[];
}

/**
 * Récupère toutes les stats admin en parallèle.
 * Utiliser avec le service role client (pas de RLS).
 */
export async function getAdminStats(
  supabase: SupabaseClient
): Promise<AdminStats> {
  const now = new Date();
  // Timezone Brussels pour les dates belges
  const toBrusselsDate = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const today = toBrusselsDate(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toBrusselsDate(yesterday);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneHourAgo = new Date(now.getTime() - 3600000);
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000);

  // Requêtes parallèles pour performance
  const [
    { data: restaurants },
    { data: todayOrders },
    { data: yesterdayOrders },
    { data: weekOrders },
    { data: menus },
    { data: recentErrors },
    { data: supportMessages },
    { data: webhookFailures },
  ] = await Promise.all([
    // 1. Tous les restaurants (avec champs billing)
    supabase.from("restaurants").select("*"),

    // 2. Commandes d'aujourd'hui
    supabase
      .from("orders")
      .select("*")
      .gte("created_at", `${today}T00:00:00`),

    // 3. Commandes d'hier (pour calcul tendance)
    supabase
      .from("orders")
      .select("id, total_amount")
      .gte("created_at", `${yesterdayStr}T00:00:00`)
      .lt("created_at", `${today}T00:00:00`),

    // 4. Commandes des 7 derniers jours (pour graphique + health check)
    supabase
      .from("orders")
      .select("id, total_amount, created_at, restaurant_id")
      .gte("created_at", sevenDaysAgo.toISOString()),

    // 5. Menus existants (pour onboarding checklist)
    supabase.from("menus").select("id, restaurant_id"),

    // 6. Erreurs agent des dernières 24h
    supabase
      .from("agent_logs")
      .select("id, restaurant_id, event_type, error_message, created_at")
      .eq("event_type", "error")
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),

    // 7. Messages support récents non lus
    supabase
      .from("agent_logs")
      .select("id, restaurant_id, payload, created_at")
      .eq("event_type", "support_message")
      .order("created_at", { ascending: false })
      .limit(10),

    // 8. Échecs webhook de la dernière heure
    supabase
      .from("agent_logs")
      .select("id, restaurant_id, created_at")
      .eq("event_type", "webhook_failure")
      .gte("created_at", oneHourAgo.toISOString()),
  ]);

  const allRestos = (restaurants as Restaurant[]) || [];
  const allTodayOrders = (todayOrders as Order[]) || [];
  const allYesterdayOrders = yesterdayOrders || [];
  const allWeekOrders = weekOrders || [];

  // --- KPIs globaux ---
  const totalRestaurants = allRestos.length;
  const activeRestaurants = allRestos.filter(
    (r) => r.agent_status === "active"
  ).length;
  const todayOrderCount = allTodayOrders.length;
  const todayRevenue = allTodayOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );
  const yesterdayOrderCount = allYesterdayOrders.length;
  const yesterdayRevenue = allYesterdayOrders.reduce(
    (sum: number, o: { total_amount?: number }) =>
      sum + (Number(o.total_amount) || 0),
    0
  );
  const errorCount = allRestos.filter(
    (r) => r.agent_status === "error"
  ).length;

  // MRR : somme des subscription_amount des abonnements actifs
  const mrr = allRestos
    .filter((r) => r.subscription_status === "active")
    .reduce((sum, r) => sum + (Number(r.subscription_amount) || 0), 0);

  // Calcul de tendance en pourcentage
  function calcTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // --- Revenue 7 jours (oldest → newest) ---
  const dailyRevenue: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toBrusselsDate(d);
    const dayOrders = allWeekOrders.filter((o: { created_at: string }) =>
      o.created_at.startsWith(dateStr)
    );
    dailyRevenue.push(
      dayOrders.reduce(
        (sum: number, o: { total_amount?: number }) =>
          sum + (Number(o.total_amount) || 0),
        0
      )
    );
  }

  // --- Lookup menus par restaurant ---
  const restaurantMenus = new Set(
    (menus || []).map((m: { restaurant_id: string }) => m.restaurant_id)
  );

  // --- Lookup restaurants par ID (pour noms dans les alertes) ---
  const restoMap = new Map(allRestos.map((r) => [r.id, r]));

  // --- Health par restaurant ---
  const restaurantHealth: RestaurantHealth[] = allRestos.map((r) => {
    const rTodayOrders = allTodayOrders.filter(
      (o) => o.restaurant_id === r.id
    );

    // Dernière commande toutes périodes confondues (sur 7 jours)
    const rWeekOrders = allWeekOrders
      .filter((o: { restaurant_id: string }) => o.restaurant_id === r.id)
      .sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    const lastOrderAt =
      (rWeekOrders[0] as { created_at: string } | undefined)?.created_at ||
      null;

    // Calcul du statut santé
    let health: "green" | "yellow" | "red" = "green";
    const lastOrderTime = lastOrderAt ? new Date(lastOrderAt).getTime() : 0;
    const hasRecentOrder = lastOrderTime > twentyFourHoursAgo.getTime();
    const hasOrderIn72h = lastOrderTime > threeDaysAgo.getTime();

    if (r.agent_status === "error" || (!hasOrderIn72h && lastOrderTime > 0)) {
      // Agent en erreur OU aucune commande en 72h (mais en a eu avant)
      health = "red";
    } else if (!hasOrderIn72h && lastOrderTime === 0) {
      // Jamais eu de commande — potentiellement nouveau resto
      health = "red";
    } else if (r.agent_status === "paused" || !hasRecentOrder) {
      // Agent en pause OU pas de commande en 24h
      health = "yellow";
    }

    return {
      id: r.id,
      name: r.name,
      owner_name: r.owner_name,
      agent_status: r.agent_status,
      telnyx_phone: r.telnyx_phone,
      todayOrders: rTodayOrders.length,
      todayRevenue: rTodayOrders.reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      ),
      lastOrderAt,
      health,
      // Onboarding checklist
      hasMenu: restaurantMenus.has(r.id),
      hasAgentId: !!r.agent_id,
      hasWhatsApp: !!r.whatsapp_phone,
      hasPhone: !!r.phone,
      // Billing
      subscription_status: r.subscription_status || "trialing",
      subscription_amount: Number(r.subscription_amount) || 0,
    };
  });

  // --- Alertes ---
  const alerts: AdminAlert[] = [];

  // Erreur : agents en statut error depuis > 30 minutes
  const errorRestos = allRestos.filter((r) => r.agent_status === "error");
  for (const r of errorRestos) {
    // Vérifier la durée via les logs d'erreur
    const restoErrors = (recentErrors || []).filter(
      (e: { restaurant_id: string }) => e.restaurant_id === r.id
    );
    const oldestError = restoErrors[restoErrors.length - 1] as
      | { created_at: string }
      | undefined;
    const errorDuration = oldestError
      ? now.getTime() - new Date(oldestError.created_at).getTime()
      : 0;

    if (errorDuration > 1800000) {
      // > 30 minutes
      alerts.push({
        type: "error",
        title: `Agent en erreur — ${r.name}`,
        description: `L'agent vocal ne prend plus les appels depuis ${Math.round(errorDuration / 60000)} minutes`,
        restaurantId: r.id,
        restaurantName: r.name,
        link: `/admin/restaurants/${r.id}`,
      });
    } else {
      // Erreur récente, signaler quand même
      alerts.push({
        type: "error",
        title: `Agent en erreur — ${r.name}`,
        description: "L'agent vocal ne prend plus les appels",
        restaurantId: r.id,
        restaurantName: r.name,
        link: `/admin/restaurants/${r.id}`,
      });
    }
  }

  // Warning : restaurant sans commande > 24h
  for (const rh of restaurantHealth) {
    if (rh.agent_status !== "active") continue;

    if (!rh.lastOrderAt) {
      // Aucune commande cette semaine
      alerts.push({
        type: "warning",
        title: `Pas de commande — ${rh.name}`,
        description: "Aucune commande reçue depuis plus de 24 heures",
        restaurantId: rh.id,
        restaurantName: rh.name,
        link: `/admin/restaurants/${rh.id}`,
      });
    } else {
      const hoursSinceOrder =
        (now.getTime() - new Date(rh.lastOrderAt).getTime()) / 3600000;
      if (hoursSinceOrder > 24) {
        alerts.push({
          type: "warning",
          title: `Pas de commande — ${rh.name}`,
          description: `Dernière commande il y a ${Math.round(hoursSinceOrder)} heures`,
          restaurantId: rh.id,
          restaurantName: rh.name,
          link: `/admin/restaurants/${rh.id}`,
        });
      }
    }
  }

  // Warning : échecs webhook > 3 en 1h
  if ((webhookFailures?.length || 0) > 3) {
    const failuresByResto = new Map<string, number>();
    for (const f of webhookFailures || []) {
      const rid = (f as { restaurant_id: string }).restaurant_id;
      failuresByResto.set(rid, (failuresByResto.get(rid) || 0) + 1);
    }
    for (const [rid, count] of failuresByResto) {
      if (count > 3) {
        const resto = restoMap.get(rid);
        alerts.push({
          type: "warning",
          title: `${count} échecs webhook — ${resto?.name || rid}`,
          description:
            "Plusieurs webhooks ont échoué dans la dernière heure",
          restaurantId: rid,
          restaurantName: resto?.name,
          link: "/admin/logs",
        });
      }
    }
  }

  // Info : messages support non lus
  if ((supportMessages?.length || 0) > 0) {
    alerts.push({
      type: "info",
      title: `${supportMessages!.length} message(s) support non lu(s)`,
      description: "Des restaurateurs ont envoyé des messages",
      link: "/admin/logs",
    });
  }

  // Warning : trial se terminant dans 3 jours
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  for (const r of allRestos) {
    if (r.subscription_status === "trialing" && r.trial_ends_at) {
      const trialEnd = new Date(r.trial_ends_at);
      if (trialEnd <= threeDaysFromNow && trialEnd >= now) {
        const daysLeft = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / 86400000
        );
        alerts.push({
          type: "warning",
          title: `Trial expire bientôt — ${r.name}`,
          description: `Le trial expire dans ${daysLeft} jour(s)`,
          restaurantId: r.id,
          restaurantName: r.name,
          link: `/admin/restaurants/${r.id}`,
        });
      }
    }
  }

  // Erreur : abonnement past_due (impayé)
  for (const r of allRestos) {
    if (r.subscription_status === "past_due") {
      alerts.push({
        type: "error",
        title: `Paiement en retard — ${r.name}`,
        description: "L'abonnement est en impayé, action requise",
        restaurantId: r.id,
        restaurantName: r.name,
        link: `/admin/restaurants/${r.id}`,
      });
    }
  }

  // Trier alertes : errors d'abord, puis warnings, puis info
  const alertOrder = { error: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type]);

  return {
    totalRestaurants,
    activeRestaurants,
    todayOrderCount,
    todayRevenue,
    orderTrend: calcTrend(todayOrderCount, yesterdayOrderCount),
    revenueTrend: calcTrend(todayRevenue, yesterdayRevenue),
    errorCount,
    mrr,
    dailyRevenue,
    restaurantHealth,
    alerts,
  };
}
