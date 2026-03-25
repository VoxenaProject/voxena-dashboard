import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// Helper : vérifier ownership
function checkOwnership(profile: { role: string; restaurant_id: string | null }, restaurantId: string) {
  if (profile.role === "admin") return true;
  return profile.restaurant_id === restaurantId;
}

// Créer un article
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, menu_id, restaurant_id, price, description, is_available, allergens } = body;

  if (!name?.trim() || !menu_id || !restaurant_id) {
    return NextResponse.json(
      { error: "name, menu_id et restaurant_id requis" },
      { status: 400 }
    );
  }

  if (!checkOwnership(auth.profile, restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (price != null && (typeof price !== "number" || price < 0)) {
    return NextResponse.json(
      { error: "Le prix doit être un nombre positif" },
      { status: 400 }
    );
  }

  if (name.trim().length > 200) {
    return NextResponse.json(
      { error: "Le nom ne peut pas dépasser 200 caractères" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name,
      menu_id,
      restaurant_id,
      price: price || 0,
      description: description || null,
      allergens: allergens || [],
      is_available: is_available ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Mettre à jour un article
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Vérifier ownership via le restaurant_id de l'article
  const { data: item } = await supabase.from("menu_items").select("restaurant_id").eq("id", id).single();
  if (item && !checkOwnership(auth.profile, item.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Supprimer un article
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Vérifier ownership
  const { data: item } = await supabase.from("menu_items").select("restaurant_id").eq("id", id).single();
  if (item && !checkOwnership(auth.profile, item.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
