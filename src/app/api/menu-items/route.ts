import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Créer un article
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, menu_id, restaurant_id, price, description, is_available } = body;

  if (!name || !menu_id || !restaurant_id) {
    return NextResponse.json(
      { error: "name, menu_id et restaurant_id requis" },
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
  const supabase = createServiceClient();
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
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
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
