import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { OrderList } from "@/components/orders/order-list";
import { MobileOrderList } from "@/components/orders/mobile-order-list";
import { ReservationDatePicker } from "@/components/reservations/reservation-date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { Order, Customer } from "@/lib/supabase/types";

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

  // Récupérer commandes et clients en parallèle
  const [ordersRes, customersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", `${selectedDate}T00:00:00`)
      .lt("created_at", `${nextDayStr}T00:00:00`)
      .order("created_at", { ascending: false }),

    // Clients du restaurant (pour historique visite)
    supabase
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId),
  ]);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const orders = (ordersRes.data as Order[]) || [];
  const customersList = (customersRes.data as Customer[]) || [];

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <MobileOrderList
          initialOrders={orders}
          restaurantId={restaurantId}
          customers={customersList}
          selectedDate={selectedDate}
        />
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <PageWrapper>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Commandes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isToday
                  ? "Suivi en temps réel des commandes du jour"
                  : `Commandes du ${new Date(selectedDate).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`}
              </p>
            </div>
            <ReservationDatePicker currentDate={selectedDate} basePath="/orders" />
          </div>
          <OrderList
            initialOrders={orders}
            restaurantId={restaurantId}
            customers={customersList}
            selectedDate={selectedDate}
          />
        </PageWrapper>
      </div>
    </>
  );
}
