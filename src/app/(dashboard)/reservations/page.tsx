import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { getUpcomingReservationSummary } from "@/lib/dashboard/reservation-stats";
import { ReservationViews } from "@/components/reservations/reservation-views";
import { MobileReservationList } from "@/components/reservations/mobile-reservation-list";
import { ReservationDatePicker } from "@/components/reservations/reservation-date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { Reservation, FloorTable, Customer } from "@/lib/supabase/types";

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

  // Récupérer les données en parallèle
  const [reservationsRes, tablesRes, upcomingSummary, customersRes] = await Promise.all([
    // Réservations du jour sélectionné
    supabase
      .from("reservations")
      .select("*, floor_tables(name, capacity)")
      .eq("restaurant_id", restaurantId)
      .eq("date", selectedDate)
      .order("time_slot", { ascending: true }),

    // Tables du restaurant
    supabase
      .from("floor_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    // Résumé 7 prochains jours
    getUpcomingReservationSummary(supabase, restaurantId),

    // Clients du restaurant (pour historique et no-show)
    supabase
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId),
  ]);

  const resaList = (reservationsRes.data as Reservation[]) || [];
  const tablesList = (tablesRes.data as FloorTable[]) || [];
  const customersList = (customersRes.data as Customer[]) || [];

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <MobileReservationList
          initialReservations={resaList}
          restaurantId={restaurantId}
          tables={tablesList}
          selectedDate={selectedDate}
          customers={customersList}
        />
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <PageWrapper>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Réservations</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isToday
                  ? "Gestion en temps réel des réservations du jour"
                  : `Réservations du ${new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}`}
              </p>
            </div>
            <ReservationDatePicker currentDate={selectedDate} />
          </div>
          <ReservationViews
            initialReservations={resaList}
            restaurantId={restaurantId}
            tables={tablesList}
            selectedDate={selectedDate}
            daySummaries={upcomingSummary.daySummaries}
            customers={customersList}
          />
        </PageWrapper>
      </div>
    </>
  );
}
