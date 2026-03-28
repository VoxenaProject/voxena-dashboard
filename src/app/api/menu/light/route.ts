import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/menu/light?restaurant_id=xxx
 * Version légère du menu — noms + prix uniquement.
 * Optimisé pour l'agent vocal (réponse rapide, moins de tokens).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurant_id requis" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Requêtes en parallèle — restaurant info + catégories + items
    const [restaurantRes, menusRes, itemsRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("name, address, phone, opening_hours")
        .eq("id", restaurantId)
        .single(),
      supabase
        .from("menus")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("menu_id, name, price")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("sort_order"),
    ]);

    const restaurant = restaurantRes.data;
    const menus = menusRes.data || [];
    const items = itemsRes.data || [];

    // Structurer par catégorie — compact
    const menu = menus.map((cat) => ({
      cat: cat.name,
      items: items
        .filter((i) => i.menu_id === cat.id)
        .map((i) => ({
          name: i.name,
          price: i.price,
        })),
    }));

    const response = NextResponse.json({
      name: restaurant?.name || null,
      address: restaurant?.address || null,
      phone: restaurant?.phone || null,
      hours: restaurant?.opening_hours || null,
      menu,
    });

    // Cache 1h — le menu change rarement pendant le service
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=1800");
    return response;
  } catch (err) {
    console.error("[menu/light] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
