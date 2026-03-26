import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { KitchenDisplay } from "@/components/kitchen/kitchen-display";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Page KDS (Kitchen Display System) — affichage cuisine plein écran.
 * Récupère les commandes actives du jour et les passe au composant client.
 */
export default async function KitchenPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    redirect("/");
  }

  const supabase = createServiceClient();

  // Récupérer les commandes actives du jour (nouvelle, en_preparation, prete)
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("status", ["nouvelle", "en_preparation", "prete"])
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: false });

  return (
    <KitchenDisplay
      initialOrders={(data as Order[]) || []}
      restaurantId={restaurantId}
    />
  );
}
