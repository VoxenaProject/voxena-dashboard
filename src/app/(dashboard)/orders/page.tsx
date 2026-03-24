import { createServiceClient } from "@/lib/supabase/server";
import { OrderList } from "@/components/orders/order-list";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = createServiceClient();

  // Récupérer les commandes d'aujourd'hui
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Commandes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suivi en temps réel des commandes du jour
        </p>
      </div>
      <OrderList initialOrders={(data as Order[]) || []} />
    </div>
  );
}
