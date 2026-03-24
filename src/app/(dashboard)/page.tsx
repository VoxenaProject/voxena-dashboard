import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { NoRestaurant } from "@/components/ui/no-restaurant";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  const stats = await getDashboardStats(supabase, restaurantId);

  // Construire les données chart 7 jours
  const now = new Date();
  const chartData = stats.dailyRevenue.map((revenue, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return {
      label: dayNames[d.getDay()],
      revenue,
      orders: stats.dailyOrders[i],
    };
  });

  return (
    <DashboardContent
      stats={stats}
      chartData={chartData}
    />
  );
}
