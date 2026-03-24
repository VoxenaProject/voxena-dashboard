import { createServiceClient } from "@/lib/supabase/server";
import { getAdminStats } from "@/lib/dashboard/admin-stats";
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createServiceClient();
  const stats = await getAdminStats(supabase);

  // Chart 7 jours
  const now = new Date();
  const chartData = stats.dailyRevenue.map((revenue, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return { label: dayNames[d.getDay()], revenue, orders: 0 };
  });

  return <AdminDashboardContent stats={stats} chartData={chartData} />;
}
