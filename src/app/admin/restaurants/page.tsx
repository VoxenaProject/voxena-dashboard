import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Restaurant, Order } from "@/lib/supabase/types";
import { RestaurantsListClient } from "@/components/admin/restaurants-list-client";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage() {
  const supabase = createServiceClient();

  // Récupérer restaurants, commandes du jour et menus en parallèle
  const today = new Date().toISOString().split("T")[0];

  const [{ data: restaurants }, { data: todayOrders }, { data: menus }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, restaurant_id")
        .gte("created_at", `${today}T00:00:00`),
      supabase
        .from("menus")
        .select("id, restaurant_id"),
    ]);

  const typedRestaurants = (restaurants as Restaurant[]) || [];
  const typedOrders = (todayOrders as Pick<Order, "id" | "restaurant_id">[]) || [];
  const typedMenus = (menus as { id: string; restaurant_id: string }[]) || [];

  // Compter les commandes du jour par restaurant
  const orderCountByRestaurant: Record<string, number> = {};
  for (const order of typedOrders) {
    orderCountByRestaurant[order.restaurant_id] = (orderCountByRestaurant[order.restaurant_id] || 0) + 1;
  }

  // Déterminer quels restaurants ont un menu
  const restaurantsWithMenu = new Set(typedMenus.map((m) => m.restaurant_id));

  // Enrichir les données pour le client
  const enrichedRestaurants = typedRestaurants.map((r) => ({
    ...r,
    todayOrders: orderCountByRestaurant[r.id] || 0,
    hasPhone: !!r.phone,
    hasMenu: restaurantsWithMenu.has(r.id),
    hasAgentId: !!r.agent_id,
    hasWhatsApp: !!r.whatsapp_phone,
  }));

  if (typedRestaurants.length === 0) {
    return (
      <div className="p-6 lg:p-8" style={{ animation: "fade-in 0.35s ease-out" }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Restaurants
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez tous les restaurants connectés à Voxena
            </p>
          </div>
          <Link href="/admin/restaurants/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau restaurant
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">Aucun restaurant</p>
            <p className="text-sm mb-4">
              Ajoutez votre premier restaurant pour commencer.
            </p>
            <Link href="/admin/restaurants/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un restaurant
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <RestaurantsListClient restaurants={enrichedRestaurants} />;
}
