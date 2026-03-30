import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  getPeakHoursData,
  getAgentMetrics,
  getCustomerStats,
  getRevenueTrends,
  getReservationAnalytics,
  type AnalyticsPeriod,
} from "@/lib/dashboard/analytics-stats";

/**
 * GET /api/analytics
 * Retourne les données analytics agrégées pour un restaurant.
 * Query params: restaurant_id, period (7d|30d|90d)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurant_id");
  const period = (searchParams.get("period") || "30d") as AnalyticsPeriod;

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id requis" }, { status: 400 });
  }

  if (!["7d", "30d", "90d"].includes(period)) {
    return NextResponse.json({ error: "period doit être 7d, 30d ou 90d" }, { status: 400 });
  }

  // Vérifier l'auth
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { profile } = authResult;
  if (profile.role !== "admin" && profile.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Récupérer toutes les données en parallèle
  const [peakHours, agentMetrics, customerStats, revenueTrends, reservationAnalytics] =
    await Promise.all([
      getPeakHoursData(supabase, restaurantId, period),
      getAgentMetrics(supabase, restaurantId, period),
      getCustomerStats(supabase, restaurantId),
      getRevenueTrends(supabase, restaurantId, period),
      getReservationAnalytics(supabase, restaurantId, period),
    ]);

  return NextResponse.json({
    peakHours,
    agentMetrics,
    customerStats,
    revenueTrends,
    reservationAnalytics,
  });
}
