import type { SupabaseClient } from "@supabase/supabase-js";

// Helper : date en timezone Brussels
function toBrusselsDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

// ── Types ──

export interface PeakHourData {
  day: number; // 0=Dim, 1=Lun, ..., 6=Sam
  hour: number; // 0-23
  count: number;
}

export interface AgentMetrics {
  totalCalls: number;
  avgDurationSeconds: number;
  successRate: number; // %
  totalCost: number;
  dailyCalls: { date: string; calls: number; errors: number }[];
}

export interface CustomerInsight {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  visit_count: number;
  total_spent: number;
  last_visit_at: string;
  tags: string[];
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomers: number; // visit_count === 1
  returningCustomers: number;
  topCustomers: CustomerInsight[];
  noShowCustomers: CustomerInsight[];
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  orders: number;
  avgBasket: number;
}

export interface ReservationAnalytics {
  byDayOfWeek: { day: number; count: number; covers: number }[];
  bySource: { source: string; count: number }[];
  byZone: { zone: string; count: number }[];
  noShowTrend: { date: string; total: number; noShows: number }[];
  avgCovers: number;
}

export type AnalyticsPeriod = "7d" | "30d" | "90d";

function getPeriodDays(period: AnalyticsPeriod): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
  }
}

// ── Heatmap heures de pointe ──

export async function getPeakHoursData(
  supabase: SupabaseClient,
  restaurantId: string,
  period: AnalyticsPeriod
): Promise<PeakHourData[]> {
  const days = getPeriodDays(period);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = toBrusselsDate(fromDate);

  // Récupérer commandes + réservations en parallèle
  const [ordersRes, resasRes] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", `${fromStr}T00:00:00`),
    supabase
      .from("reservations")
      .select("date, time_slot")
      .eq("restaurant_id", restaurantId)
      .gte("date", fromStr)
      .not("status", "in", '("annulee","no_show")'),
  ]);

  // Agréger par jour de semaine + heure
  const heatmap: Record<string, number> = {};

  for (const order of ordersRes.data || []) {
    const d = new Date(order.created_at);
    const day = d.getDay();
    const hour = d.getHours();
    const key = `${day}-${hour}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  }

  for (const resa of resasRes.data || []) {
    const d = new Date(resa.date + "T12:00:00");
    const day = d.getDay();
    const [h] = resa.time_slot.split(":").map(Number);
    const key = `${day}-${h}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  }

  const result: PeakHourData[] = [];
  for (const [key, count] of Object.entries(heatmap)) {
    const [day, hour] = key.split("-").map(Number);
    result.push({ day, hour, count });
  }

  return result;
}

// ── Métriques agent vocal ──

export async function getAgentMetrics(
  supabase: SupabaseClient,
  restaurantId: string,
  period: AnalyticsPeriod
): Promise<AgentMetrics> {
  const days = getPeriodDays(period);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString();

  // Récupérer les logs agent
  const { data: logs } = await supabase
    .from("agent_logs")
    .select("event_type, created_at, payload")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", fromStr);

  const allLogs = logs || [];
  const totalCalls = allLogs.filter((l) =>
    ["webhook_received", "post_call_transcription", "server_tool_call"].includes(l.event_type)
  ).length;
  const errorCount = allLogs.filter((l) => l.event_type === "error").length;
  const successRate = totalCalls > 0
    ? Math.round(((totalCalls - errorCount) / totalCalls) * 100)
    : 0;

  // Récupérer les commandes avec metadata pour durée et coût
  const { data: orders } = await supabase
    .from("orders")
    .select("metadata, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", fromStr)
    .not("conversation_id", "is", null);

  const ordersWithMeta = orders || [];
  let totalDuration = 0;
  let totalCost = 0;
  let durationCount = 0;

  for (const order of ordersWithMeta) {
    const meta = order.metadata as Record<string, unknown> | null;
    if (meta?.duration) {
      totalDuration += Number(meta.duration) || 0;
      durationCount++;
    }
    if (meta?.cost) {
      totalCost += Number(meta.cost) || 0;
    }
  }

  const avgDurationSeconds = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // Appels par jour
  const dailyMap: Record<string, { calls: number; errors: number }> = {};
  for (const log of allLogs) {
    const date = log.created_at.split("T")[0];
    if (!dailyMap[date]) dailyMap[date] = { calls: 0, errors: 0 };
    if (log.event_type === "error") {
      dailyMap[date].errors++;
    } else {
      dailyMap[date].calls++;
    }
  }

  const dailyCalls = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalCalls, avgDurationSeconds, successRate, totalCost, dailyCalls };
}

// ── Insights clients ──

export async function getCustomerStats(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<CustomerStats> {
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("total_spent", { ascending: false });

  const all = customers || [];
  const totalCustomers = all.length;
  const newCustomers = all.filter((c) => c.visit_count === 1).length;
  const returningCustomers = totalCustomers - newCustomers;

  const topCustomers: CustomerInsight[] = all.slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    visit_count: c.visit_count,
    total_spent: Number(c.total_spent) || 0,
    last_visit_at: c.last_visit_at,
    tags: c.tags || [],
  }));

  const noShowCustomers: CustomerInsight[] = all
    .filter((c) => (c.tags || []).includes("no_show"))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      visit_count: c.visit_count,
      total_spent: Number(c.total_spent) || 0,
      last_visit_at: c.last_visit_at,
      tags: c.tags || [],
    }));

  return { totalCustomers, newCustomers, returningCustomers, topCustomers, noShowCustomers };
}

// ── Tendances revenue ──

export async function getRevenueTrends(
  supabase: SupabaseClient,
  restaurantId: string,
  period: AnalyticsPeriod
): Promise<RevenueTrend[]> {
  const days = getPeriodDays(period);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = toBrusselsDate(fromDate);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", `${fromStr}T00:00:00`)
    .order("created_at", { ascending: true });

  const dailyMap: Record<string, { revenue: number; count: number }> = {};

  // Pré-remplir tous les jours
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toBrusselsDate(d);
    dailyMap[dateStr] = { revenue: 0, count: 0 };
  }

  for (const order of orders || []) {
    const dateStr = order.created_at.split("T")[0];
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].revenue += Number(order.total_amount) || 0;
      dailyMap[dateStr].count += 1;
    }
  }

  return Object.entries(dailyMap).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.count,
    avgBasket: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
  }));
}

// ── Analytics réservations ──

export async function getReservationAnalytics(
  supabase: SupabaseClient,
  restaurantId: string,
  period: AnalyticsPeriod
): Promise<ReservationAnalytics> {
  const days = getPeriodDays(period);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = toBrusselsDate(fromDate);

  const { data: resas } = await supabase
    .from("reservations")
    .select("date, time_slot, covers, status, source, table_id, floor_tables(zone)")
    .eq("restaurant_id", restaurantId)
    .gte("date", fromStr);

  const all = resas || [];

  // Par jour de semaine
  const byDayMap: Record<number, { count: number; covers: number }> = {};
  for (let i = 0; i < 7; i++) byDayMap[i] = { count: 0, covers: 0 };

  for (const r of all) {
    if (r.status === "annulee") continue;
    const d = new Date(r.date + "T12:00:00");
    const day = d.getDay();
    byDayMap[day].count++;
    byDayMap[day].covers += r.covers || 0;
  }

  const byDayOfWeek = Object.entries(byDayMap).map(([day, data]) => ({
    day: Number(day),
    ...data,
  }));

  // Par source
  const sourceMap: Record<string, number> = {};
  for (const r of all) {
    if (r.status === "annulee") continue;
    const src = r.source || "manual";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const bySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

  // Par zone
  const zoneMap: Record<string, number> = {};
  for (const r of all) {
    if (r.status === "annulee") continue;
    const ft = r.floor_tables;
    const zone = Array.isArray(ft) ? ft[0]?.zone : (ft as { zone?: string } | null)?.zone;
    const z = zone || "non assignée";
    zoneMap[z] = (zoneMap[z] || 0) + 1;
  }
  const byZone = Object.entries(zoneMap).map(([zone, count]) => ({ zone, count }));

  // No-show trend par semaine
  const weekMap: Record<string, { total: number; noShows: number }> = {};
  for (const r of all) {
    // Grouper par semaine (lundi de la semaine)
    const d = new Date(r.date + "T12:00:00");
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const weekKey = monday.toISOString().split("T")[0];

    if (!weekMap[weekKey]) weekMap[weekKey] = { total: 0, noShows: 0 };
    weekMap[weekKey].total++;
    if (r.status === "no_show") weekMap[weekKey].noShows++;
  }

  const noShowTrend = Object.entries(weekMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Couverts moyens
  const activeResas = all.filter((r) => r.status !== "annulee" && r.status !== "no_show");
  const avgCovers = activeResas.length > 0
    ? Math.round((activeResas.reduce((sum, r) => sum + (r.covers || 0), 0) / activeResas.length) * 10) / 10
    : 0;

  return { byDayOfWeek, bySource, byZone, noShowTrend, avgCovers };
}
