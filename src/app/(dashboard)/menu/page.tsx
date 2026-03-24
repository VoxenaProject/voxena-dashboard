import { createServiceClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/menu/menu-manager";
import type { Menu, MenuItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = createServiceClient();

  // Récupérer les catégories et articles
  const { data: menus } = await supabase
    .from("menus")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="p-8">
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
      />
    </div>
  );
}
