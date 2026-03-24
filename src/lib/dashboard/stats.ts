import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderItem } from "@/lib/supabase/types";

// Récupérer les stats du dashboard (today, yesterday, 7 jours)
export async function getDashboardStats(supabase: SupabaseClient, restaurantId?: string | null) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Requêtes en parallèle, filtrées par restaurant
  let todayQuery = supabase
    .from("orders")
    .select("*")
    .gte("created_at", `${today}T00:00:00`);
  let yesterdayQuery = supabase
    .from("orders")
    .select("id, total_amount, status, items")
    .gte("created_at", `${yesterdayStr}T00:00:00`)
    .lt("created_at", `${today}T00:00:00`);
  let weekQuery = supabase
    .from("orders")
    .select("id, total_amount, created_at, items")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (restaurantId) {
    todayQuery = todayQuery.eq("restaurant_id", restaurantId);
    yesterdayQuery = yesterdayQuery.eq("restaurant_id", restaurantId);
    weekQuery = weekQuery.eq("restaurant_id", restaurantId);
  }

  const [todayRes, yesterdayRes, weekRes] = await Promise.all([
    todayQuery.order("created_at", { ascending: false }),
    yesterdayQuery,
    weekQuery.order("created_at", { ascending: true }),
  ]);

  const todayOrders = (todayRes.data as Order[]) || [];
  const yesterdayOrders = yesterdayRes.data || [];
  const weekOrders = weekRes.data || [];

  // Stats aujourd'hui
  const todayCount = todayOrders.length;
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );
  const todayAvg = todayCount > 0 ? todayRevenue / todayCount : 0;
  const pendingCount = todayOrders.filter(
    (o) => o.status === "nouvelle"
  ).length;

  // Stats hier (pour trends)
  const yesterdayCount = yesterdayOrders.length;
  const yesterdayRevenue = yesterdayOrders.reduce(
    (sum: number, o: { total_amount?: number }) =>
      sum + (Number(o.total_amount) || 0),
    0
  );

  // Trends en %
  function calcTrend(today: number, yesterday: number) {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  }

  const countTrend = calcTrend(todayCount, yesterdayCount);
  const revenueTrend = calcTrend(todayRevenue, yesterdayRevenue);

  // Sparklines 7 jours (commandes par jour + revenus par jour)
  const dailyOrders: number[] = [];
  const dailyRevenue: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = weekOrders.filter(
      (o: { created_at: string }) => o.created_at.startsWith(dateStr)
    );
    dailyOrders.push(dayOrders.length);
    dailyRevenue.push(
      dayOrders.reduce(
        (sum: number, o: { total_amount?: number }) =>
          sum + (Number(o.total_amount) || 0),
        0
      )
    );
  }

  // Top 5 articles les plus commandés
  const itemCounts: Record<string, number> = {};
  for (const order of weekOrders) {
    const items = (order.items || []) as OrderItem[];
    for (const item of items) {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    }
  }
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    todayOrders,
    todayCount,
    todayRevenue,
    todayAvg,
    pendingCount,
    countTrend,
    revenueTrend,
    dailyOrders,
    dailyRevenue,
    topItems,
  };
}
