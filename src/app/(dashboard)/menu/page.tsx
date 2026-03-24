import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { MenuManager } from "@/components/menu/menu-manager";
import type { Menu, MenuItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  let menusQuery = supabase
    .from("menus")
    .select("*")
    .order("sort_order", { ascending: true });

  let itemsQuery = supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (restaurantId) {
    menusQuery = menusQuery.eq("restaurant_id", restaurantId);
    itemsQuery = itemsQuery.eq("restaurant_id", restaurantId);
  }

  const [{ data: menus }, { data: items }] = await Promise.all([
    menusQuery,
    itemsQuery,
  ]);

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Menu
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les catégories et articles de votre menu
        </p>
      </div>
      <MenuManager
        initialMenus={(menus as Menu[]) || []}
        initialItems={(items as MenuItem[]) || []}
        restaurantId={restaurantId}
      />
    </PageWrapper>
  );
}
