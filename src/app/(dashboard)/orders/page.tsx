import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { OrderList } from "@/components/orders/order-list";
import { OrderDatePicker } from "@/components/orders/order-date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const { date } = await searchParams;
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  // Date sélectionnée ou aujourd'hui
  const selectedDate = date || new Date().toISOString().split("T")[0];
  const nextDay = new Date(selectedDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split("T")[0];

  let query = supabase
    .from("orders")
    .select("*")
    .gte("created_at", `${selectedDate}T00:00:00`)
    .lt("created_at", `${nextDayStr}T00:00:00`)
    .order("created_at", { ascending: false });

  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }

  const { data } = await query;
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <PageWrapper>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Commandes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isToday
              ? "Suivi en temps réel des commandes du jour"
              : `Commandes du ${new Date(selectedDate).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        </div>
        <OrderDatePicker currentDate={selectedDate} />
      </div>
      <OrderList
        initialOrders={(data as Order[]) || []}
        restaurantId={restaurantId}
      />
    </PageWrapper>
  );
}
