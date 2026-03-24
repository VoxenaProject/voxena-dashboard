import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/menu?restaurant_id=xxx
 * Retourne le menu complet d'un restaurant
 * Appelé par le Server Tool ElevenLabs pendant l'appel
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id requis" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Récupérer les catégories actives avec leurs items disponibles
    const { data: menus, error: menusError } = await supabase
      .from("menus")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order");

    if (menusError) {
      return NextResponse.json({ error: menusError.message }, { status: 500 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("menu_items")
      .select("id, menu_id, name, description, price, options, supplements, allergens")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order");

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Structurer : catégories avec leurs items
    const menu = (menus || []).map((category) => ({
      category: category.name,
      items: (items || [])
        .filter((item) => item.menu_id === category.id)
        .map((item) => ({
          name: item.name,
          description: item.description,
          price: item.price,
          options: item.options,
          supplements: item.supplements,
          allergens: item.allergens,
        })),
    }));

    return NextResponse.json({ restaurant_id: restaurantId, menu });
  } catch (err) {
    console.error("[menu] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
