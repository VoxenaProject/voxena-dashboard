import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// Helper : vérifier que le user a le droit sur ce restaurant
function checkOwnership(profile: { role: string; restaurant_id: string | null }, restaurantId: string) {
  if (profile.role === "admin") return true;
  return profile.restaurant_id === restaurantId;
}

// Créer une catégorie
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, restaurant_id, sort_order } = body;

  if (!name || !restaurant_id) {
    return NextResponse.json(
      { error: "name et restaurant_id requis" },
      { status: 400 }
    );
  }

  if (!checkOwnership(auth.profile, restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("menus")
    .insert({ name, restaurant_id, sort_order: sort_order || 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Mettre à jour une catégorie
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Vérifier ownership via le restaurant_id du menu
  const { data: menu } = await supabase.from("menus").select("restaurant_id").eq("id", id).single();
  if (menu && !checkOwnership(auth.profile, menu.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("menus")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Supprimer une catégorie
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
  const { data: menu } = await supabase.from("menus").select("restaurant_id").eq("id", id).single();
  if (menu && !checkOwnership(auth.profile, menu.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { error } = await supabase.from("menus").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
