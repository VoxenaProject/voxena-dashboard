import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant, Order } from "@/lib/supabase/types";

export interface RestaurantHealth {
  id: string;
  name: string;
  agent_status: string;
  telnyx_phone: string | null;
  owner_name: string | null;
  todayOrders: number;
  todayRevenue: number;
  lastOrderAt: string | null;
  health: "green" | "yellow" | "red";
  // Onboarding
  hasMenu: boolean;
  hasAgentId: boolean;
  hasWhatsApp: boolean;
  hasPhone: boolean;
}

export interface AdminAlert {
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  link: string;
  restaurantId?: string;
}

export async function getAdminStats(supabase: SupabaseClient) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Queries parallèles
  const [
    { data: restaurants },
    { data: todayOrders },
    { data: yesterdayOrders },
    { data: weekOrders },
    { data: errorAgents },
    { data: menus },
    { data: recentErrors },
    { data: supportMessages },
  ] = await Promise.all([
    supabase.from("restaurants").select("*"),
    supabase.from("orders").select("*").gte("created_at", `${today}T00:00:00`),
    supabase.from("orders").select("id, total_amount").gte("created_at", `${yesterdayStr}T00:00:00`).lt("created_at", `${today}T00:00:00`),
    supabase.from("orders").select("id, total_amount, created_at, restaurant_id").gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("restaurants").select("id, name").eq("agent_status", "error"),
    supabase.from("menus").select("id, restaurant_id"),
    supabase.from("agent_logs").select("id, restaurant_id, event_type, error_message, created_at, restaurants(name)").eq("event_type", "error").gte("created_at", new Date(now.getTime() - 3600000).toISOString()).order("created_at", { ascending: false }).limit(10),
    supabase.from("agent_logs").select("id, payload, created_at").eq("event_type", "support_message").order("created_at", { ascending: false }).limit(5),
  ]);

  const allRestos = (restaurants as Restaurant[]) || [];
  const allTodayOrders = (todayOrders as Order[]) || [];
  const allYesterdayOrders = yesterdayOrders || [];

  // KPIs
  const totalRestaurants = allRestos.length;
  const activeRestaurants = allRestos.filter((r) => r.agent_status === "active").length;
  const todayOrderCount = allTodayOrders.length;
  const todayRevenue = allTodayOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const yesterdayOrderCount = allYesterdayOrders.length;
  const yesterdayRevenue = allYesterdayOrders.reduce((s: number, o: { total_amount?: number }) => s + (Number(o.total_amount) || 0), 0);
  const errorCount = errorAgents?.length || 0;

  function calcTrend(t: number, y: number) {
    if (y === 0) return t > 0 ? 100 : 0;
    return Math.round(((t - y) / y) * 100);
  }

  // Revenue 7 jours
  const dailyRevenue: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = (weekOrders || []).filter(
      (o: { created_at: string }) => o.created_at.startsWith(dateStr)
    );
    dailyRevenue.push(
      dayOrders.reduce((s: number, o: { total_amount?: number }) => s + (Number(o.total_amount) || 0), 0)
    );
  }

  // Restaurant health
  const restaurantMenus = new Set((menus || []).map((m: { restaurant_id: string }) => m.restaurant_id));

  const restaurantHealth: RestaurantHealth[] = allRestos.map((r) => {
    const rOrders = allTodayOrders.filter((o) => o.restaurant_id === r.id);
    const lastOrder = allTodayOrders
      .filter((o) => o.restaurant_id === r.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    // Health score
    let health: "green" | "yellow" | "red" = "green";
    if (r.agent_status === "error") {
      health = "red";
    } else if (r.agent_status === "paused") {
      health = "yellow";
    } else if (!lastOrder) {
      // Pas de commande aujourd'hui — checker si c'est normal
      const anyRecentOrder = (weekOrders || []).find(
        (o: { restaurant_id: string }) => o.restaurant_id === r.id
      );
      if (!anyRecentOrder) health = "red"; // Aucune commande en 7 jours
    }

    return {
      id: r.id,
      name: r.name,
      agent_status: r.agent_status,
      telnyx_phone: r.telnyx_phone,
      owner_name: r.owner_name,
      todayOrders: rOrders.length,
      todayRevenue: rOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
      lastOrderAt: lastOrder?.created_at || null,
      health,
      hasMenu: restaurantMenus.has(r.id),
      hasAgentId: !!r.agent_id,
      hasWhatsApp: !!r.whatsapp_phone,
      hasPhone: !!r.phone,
    };
  });

  // Alertes
  const alerts: AdminAlert[] = [];

  // Agents en erreur
  for (const agent of errorAgents || []) {
    alerts.push({
      type: "error",
      title: `Agent en erreur — ${agent.name}`,
      description: "L'agent vocal ne prend plus les appels",
      link: `/admin/restaurants/${agent.id}`,
      restaurantId: agent.id,
    });
  }

  // Errors récentes dans les logs
  if ((recentErrors?.length || 0) > 3) {
    alerts.push({
      type: "warning",
      title: `${recentErrors!.length} erreurs dans la dernière heure`,
      description: "Vérifiez les logs pour identifier le problème",
      link: "/admin/logs",
    });
  }

  // Messages support non lus
  if ((supportMessages?.length || 0) > 0) {
    alerts.push({
      type: "info",
      title: `${supportMessages!.length} message(s) support`,
      description: "Des restaurateurs ont envoyé des messages",
      link: "/admin/logs",
    });
  }

  return {
    totalRestaurants,
    activeRestaurants,
    todayOrderCount,
    todayRevenue,
    orderTrend: calcTrend(todayOrderCount, yesterdayOrderCount),
    revenueTrend: calcTrend(todayRevenue, yesterdayRevenue),
    errorCount,
    dailyRevenue,
    restaurantHealth,
    alerts,
  };
}
