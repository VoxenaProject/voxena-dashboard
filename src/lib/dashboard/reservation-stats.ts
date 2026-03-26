import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReservationStats {
  todayReservations: number;
  todayCovers: number;
  confirmedCount: number;
  pendingCount: number;
  seatedCount: number;
  completedCount: number;
  noShowCount: number;
  occupancyRate: number;
  weeklyTrends: { date: string; count: number }[];
  noShowRate: number;
}

/**
 * Calcule les statistiques de réservation pour un restaurant.
 * Utilisé dans le dashboard et la page réservations.
 */
export async function getReservationStats(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<ReservationStats> {
  const today = new Date().toISOString().split("T")[0];

  // Récupérer les résas du jour
  const { data: todayResas } = await supabase
    .from("reservations")
    .select("id, covers, status")
    .eq("restaurant_id", restaurantId)
    .eq("date", today);

  const resaList = todayResas || [];

  const todayReservations = resaList.length;
  const todayCovers = resaList.reduce((sum, r) => sum + (r.covers || 0), 0);
  const confirmedCount = resaList.filter((r) => r.status === "confirmee").length;
  const pendingCount = resaList.filter((r) => r.status === "en_attente").length;
  const seatedCount = resaList.filter((r) => r.status === "assise").length;
  const completedCount = resaList.filter((r) => r.status === "terminee").length;
  const noShowCount = resaList.filter((r) => r.status === "no_show").length;

  // Taux d'occupation : % de tables avec au moins une résa aujourd'hui
  const { count: totalTables } = await supabase
    .from("floor_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const tablesWithResa = new Set(
    resaList.filter((r) => r.status !== "annulee" && r.status !== "no_show").map((r) => (r as { table_id?: string }).table_id).filter(Boolean)
  );
  const occupancyRate = totalTables && totalTables > 0
    ? Math.round((tablesWithResa.size / totalTables) * 100)
    : 0;

  // Tendances hebdomadaires : réservations par jour sur les 7 derniers jours
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: weekResas } = await supabase
    .from("reservations")
    .select("date")
    .eq("restaurant_id", restaurantId)
    .gte("date", weekAgoStr)
    .lte("date", today);

  // Remplir les 7 jours même si 0 résa
  const weeklyTrends: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = (weekResas || []).filter((r) => r.date === dateStr).length;
    weeklyTrends.push({ date: dateStr, count });
  }

  // Taux de no-show sur les 30 derniers jours
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split("T")[0];

  const { data: monthResas } = await supabase
    .from("reservations")
    .select("status")
    .eq("restaurant_id", restaurantId)
    .gte("date", monthAgoStr)
    .lte("date", today);

  const totalMonth = (monthResas || []).length;
  const noShowMonth = (monthResas || []).filter((r) => r.status === "no_show").length;
  const noShowRate = totalMonth > 0 ? Math.round((noShowMonth / totalMonth) * 100) : 0;

  return {
    todayReservations,
    todayCovers,
    confirmedCount,
    pendingCount,
    seatedCount,
    completedCount,
    noShowCount,
    occupancyRate,
    weeklyTrends,
    noShowRate,
  };
}
