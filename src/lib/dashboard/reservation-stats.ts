import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types pour le résumé 7 jours et les prochaines réservations ──

export interface DaySummary {
  date: string; // YYYY-MM-DD
  dayName: string; // "Lundi", "Mardi"...
  dayShort: string; // "Lun", "Mar"...
  dayNumber: number; // 26, 27...
  monthShort: string; // "mar", "avr"...
  isToday: boolean;
  totalReservations: number;
  totalCovers: number;
  pendingCount: number; // en_attente count
}

export interface UpcomingReservation {
  id: string;
  date: string;
  time_slot: string;
  customer_name: string;
  covers: number;
  status: string;
  table_name?: string;
  dateLabel: string; // "Aujourd'hui", "Demain", "Sam 28"
}

export interface UpcomingReservationSummary {
  daySummaries: DaySummary[];
  upcomingReservations: UpcomingReservation[];
}

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
  restaurantId: string,
  selectedDate?: string
): Promise<ReservationStats> {
  const today = selectedDate || new Date().toISOString().split("T")[0];

  // Récupérer les résas du jour
  const { data: todayResas } = await supabase
    .from("reservations")
    .select("id, covers, status, table_id")
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

// ── Noms des jours en français ──
const dayNamesFull = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const dayNamesShort = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const monthNamesShort = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

/**
 * Récupère le résumé des 7 prochains jours + les 10 prochaines réservations.
 * Utilisé dans le dashboard (onglet réservations) et la page réservations.
 */
export async function getUpcomingReservationSummary(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<UpcomingReservationSummary> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in6days = new Date(today);
  in6days.setDate(in6days.getDate() + 6);
  const in6daysStr = in6days.toISOString().split("T")[0];

  // Requêtes en parallèle
  const [weekRes, upcomingRes] = await Promise.all([
    // Toutes les résas des 7 prochains jours (y compris en_attente pour le pendingCount)
    supabase
      .from("reservations")
      .select("date, covers, status")
      .eq("restaurant_id", restaurantId)
      .gte("date", todayStr)
      .lte("date", in6daysStr)
      .not("status", "in", '("annulee","no_show")'),

    // Les 10 prochaines réservations (actives)
    supabase
      .from("reservations")
      .select("id, date, customer_name, time_slot, covers, status, table_id, floor_tables(name)")
      .eq("restaurant_id", restaurantId)
      .gte("date", todayStr)
      .in("status", ["en_attente", "confirmee", "assise"])
      .order("date", { ascending: true })
      .order("time_slot", { ascending: true })
      .limit(10),
  ]);

  // ── Construire le résumé 7 jours ──
  const weekResas = weekRes.data || [];
  const byDate = new Map<string, { count: number; covers: number; pending: number }>();
  for (const r of weekResas) {
    const existing = byDate.get(r.date) || { count: 0, covers: 0, pending: 0 };
    existing.count += 1;
    existing.covers += r.covers || 0;
    if (r.status === "en_attente") existing.pending += 1;
    byDate.set(r.date, existing);
  }

  const daySummaries: DaySummary[] = [];
  const todayMonth = today.getMonth();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayData = byDate.get(dateStr) || { count: 0, covers: 0, pending: 0 };

    daySummaries.push({
      date: dateStr,
      dayName: dayNamesFull[d.getDay()],
      dayShort: dayNamesShort[d.getDay()],
      dayNumber: d.getDate(),
      monthShort: d.getMonth() !== todayMonth ? monthNamesShort[d.getMonth()] : "",
      isToday: i === 0,
      totalReservations: dayData.count,
      totalCovers: dayData.covers,
      pendingCount: dayData.pending,
    });
  }

  // ── Construire les prochaines réservations avec labels ──
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const upcomingReservations: UpcomingReservation[] = (upcomingRes.data || []).map((r) => {
    // Calculer le label de date
    let dateLabel: string;
    if (r.date === todayStr) {
      dateLabel = "Aujourd'hui";
    } else if (r.date === tomorrowStr) {
      dateLabel = "Demain";
    } else {
      const rd = new Date(r.date + "T12:00:00");
      dateLabel = `${dayNamesShort[rd.getDay()]} ${rd.getDate()}`;
    }

    // Résoudre le nom de table
    const ft = r.floor_tables;
    const tableName = Array.isArray(ft) ? ft[0]?.name : (ft as { name: string } | null)?.name;

    return {
      id: r.id,
      date: r.date,
      time_slot: r.time_slot,
      customer_name: r.customer_name,
      covers: r.covers,
      status: r.status,
      table_name: tableName || undefined,
      dateLabel,
    };
  });

  return { daySummaries, upcomingReservations };
}
