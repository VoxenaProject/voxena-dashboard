import { createServiceClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AdminOrderList } from "@/components/admin/admin-order-list";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = createServiceClient();

  // Récupérer les restaurants pour le filtre
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name");

  // Dernières 200 commandes avec nom du restaurant
  const { data: orders } = await supabase
    .from("orders")
    .select("*, restaurants(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Commandes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les commandes de tous les restaurants
        </p>
      </div>
      <AdminOrderList
        orders={
          (orders || []) as (Order & {
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
