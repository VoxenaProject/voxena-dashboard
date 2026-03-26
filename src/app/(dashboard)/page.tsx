import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { getReservationStats, getUpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { SubscriptionPlan } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  // Récupérer les infos du restaurant (plan + telnyx)
  const { data: restaurantData } = await supabase
    .from("restaurants")
    .select("telnyx_phone, subscription_plan")
    .eq("id", restaurantId)
    .single();

  const telnyxPhone = restaurantData?.telnyx_phone || null;
  const plan: SubscriptionPlan = restaurantData?.subscription_plan || "orders";

  // Récupérer les stats en parallèle selon le plan
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";

  const [orderStats, reservationStats, upcomingSummary] = await Promise.all([
    showOrders ? getDashboardStats(supabase, restaurantId) : Promise.resolve(null),
    showReservations ? getReservationStats(supabase, restaurantId) : Promise.resolve(null),
    showReservations ? getUpcomingReservationSummary(supabase, restaurantId) : Promise.resolve(null),
  ]);

  // Construire les données chart 7 jours (uniquement si plan orders/pro)
  let chartData: { label: string; revenue: number; orders: number }[] = [];
  if (orderStats) {
    const now = new Date();
    chartData = orderStats.dailyRevenue.map((revenue, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return {
        label: dayNames[d.getDay()],
        revenue,
        orders: orderStats.dailyOrders[i],
      };
    });
  }

  return (
    <DashboardContent
      stats={orderStats}
      chartData={chartData}
      telnyxPhone={telnyxPhone}
      plan={plan}
      reservationStats={reservationStats}
      upcomingSummary={upcomingSummary}
    />
  );
}
