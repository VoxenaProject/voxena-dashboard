import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { getReservationStats, getUpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { ReservationDatePicker } from "@/components/reservations/reservation-date-picker";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { SubscriptionPlan } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardHome({ searchParams }: Props) {
  const { date } = await searchParams;
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  // Récupérer les infos du restaurant (plan + telnyx)
  const { data: restaurantData } = await supabase
    .from("restaurants")
    .select("name, telnyx_phone, subscription_plan")
    .eq("id", restaurantId)
    .single();

  const telnyxPhone = restaurantData?.telnyx_phone || null;
  const plan: SubscriptionPlan = restaurantData?.subscription_plan || "orders";
  const restaurantName = restaurantData?.name || "";

  // Date sélectionnée ou aujourd'hui
  const selectedDate = date || new Date().toISOString().split("T")[0];
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Récupérer les stats en parallèle selon le plan
  const showOrders = plan === "orders" || plan === "pro";
  const showReservations = plan === "tables" || plan === "pro";

  const [orderStats, reservationStats, upcomingSummary] = await Promise.all([
    showOrders ? getDashboardStats(supabase, restaurantId, selectedDate) : Promise.resolve(null),
    showReservations ? getReservationStats(supabase, restaurantId, selectedDate) : Promise.resolve(null),
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
    <>
      {/* Sélecteur de date en haut du tableau de bord */}
      {/* Header — masqué sur mobile (le MobileDashboard a son propre header) */}
      <div className="hidden md:flex items-center justify-between px-6 lg:px-8 pt-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isToday
              ? "Vue en temps réel de votre activité"
              : `Activité du ${new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        </div>
        <ReservationDatePicker currentDate={selectedDate} basePath="/" />
      </div>
      <DashboardContent
        stats={orderStats}
        chartData={chartData}
        telnyxPhone={telnyxPhone}
        plan={plan}
        reservationStats={reservationStats}
        upcomingSummary={upcomingSummary}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />
    </>
  );
}
