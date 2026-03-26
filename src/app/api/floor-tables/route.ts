import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// Vérifier que le user a le droit sur ce restaurant
function checkOwnership(
  profile: { role: string; restaurant_id: string | null },
  restaurantId: string
) {
  if (profile.role === "admin") return true;
  return profile.restaurant_id === restaurantId;
}

// Lister les tables d'un restaurant
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const restaurantId =
    searchParams.get("restaurant_id") || auth.profile.restaurant_id;

  if (!restaurantId) {
    return NextResponse.json(
      { error: "restaurant_id requis" },
      { status: 400 }
    );
  }

  if (!checkOwnership(auth.profile, restaurantId)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("floor_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Créer une nouvelle table
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const body = await request.json();
  const { restaurant_id, name, capacity, shape, x, y, width, height, combinable, is_active, sort_order } = body;

  if (!restaurant_id || !name) {
    return NextResponse.json(
      { error: "restaurant_id et name requis" },
      { status: 400 }
    );
  }

  if (!checkOwnership(auth.profile, restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("floor_tables")
    .insert({
      restaurant_id,
      name,
      capacity: capacity ?? 2,
      shape: shape ?? "rectangle",
      x: x ?? 0,
      y: y ?? 0,
      width: width ?? 120,
      height: height ?? 70,
      combinable: combinable ?? true,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Mettre à jour une table existante
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Vérifier ownership via le restaurant_id de la table
  const { data: table } = await supabase
    .from("floor_tables")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (table && !checkOwnership(auth.profile, table.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("floor_tables")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Supprimer une table
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
  const { data: table } = await supabase
    .from("floor_tables")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (table && !checkOwnership(auth.profile, table.restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { error } = await supabase.from("floor_tables").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
