import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { ReservationList } from "@/components/reservations/reservation-list";
import { ReservationDatePicker } from "@/components/reservations/reservation-date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { Reservation, FloorTable } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function ReservationsPage({ searchParams }: Props) {
  const { date } = await searchParams;
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  // Date sélectionnée ou aujourd'hui
  const selectedDate = date || new Date().toISOString().split("T")[0];
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Récupérer les réservations du jour sélectionné
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, floor_tables(name, capacity)")
    .eq("restaurant_id", restaurantId)
    .eq("date", selectedDate)
    .order("time_slot", { ascending: true });

  // Récupérer toutes les tables du restaurant
  const { data: tables } = await supabase
    .from("floor_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <PageWrapper>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Réservations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isToday
              ? "Gestion en temps réel des réservations du jour"
              : `Réservations du ${new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        </div>
        <ReservationDatePicker currentDate={selectedDate} />
      </div>
      <ReservationList
        initialReservations={(reservations as Reservation[]) || []}
        restaurantId={restaurantId}
        tables={(tables as FloorTable[]) || []}
        selectedDate={selectedDate}
      />
    </PageWrapper>
  );
}
