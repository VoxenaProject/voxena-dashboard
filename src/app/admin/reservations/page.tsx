import { createServiceClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AdminReservationList } from "@/components/admin/admin-reservation-list";
import type { Reservation } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  const supabase = createServiceClient();

  // Récupérer les restaurants pour le filtre
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name");

  // Dernières 200 réservations avec nom du restaurant
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, restaurants(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Réservations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les réservations de tous les restaurants
        </p>
      </div>
      <AdminReservationList
        reservations={
          (reservations || []) as (Reservation & {
            restaurants: { name: string } | null;
          })[]
        }
        restaurants={
          (restaurants || []) as { id: string; name: string }[]
        }
      />
    </PageWrapper>
  );
}
