import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { getReservationStats } from "@/lib/dashboard/reservation-stats";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { UpcomingReservation } from "@/components/dashboard/dashboard-content";
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

  const [orderStats, reservationStats, upcomingResaRes] = await Promise.all([
    showOrders ? getDashboardStats(supabase, restaurantId) : Promise.resolve(null),
    showReservations ? getReservationStats(supabase, restaurantId) : Promise.resolve(null),
    // Récupérer les prochaines réservations du jour (5 max)
    showReservations
      ? supabase
          .from("reservations")
          .select("id, customer_name, customer_phone, time_slot, covers, status, table_id, notes, floor_tables(name)")
          .eq("restaurant_id", restaurantId)
          .eq("date", new Date().toISOString().split("T")[0])
          .in("status", ["en_attente", "confirmee"])
          .order("time_slot", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: null }),
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
      upcomingReservations={(upcomingResaRes?.data || []) as UpcomingReservation[]}
    />
  );
}
