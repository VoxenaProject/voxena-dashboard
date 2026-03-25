import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireAdmin } from "@/lib/supabase/api-auth";

// Créer un restaurant (admin uniquement)
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, phone, address, whatsapp_phone, owner_name, agent_id } = body;

  if (!name) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name,
      phone: phone || null,
      address: address || null,
      whatsapp_phone: whatsapp_phone || null,
      owner_name: owner_name || null,
      agent_id: agent_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Mettre à jour un restaurant (admin ou owner de ce restaurant)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { profile } = auth;
  const supabase = createServiceClient();
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Vérifier ownership : admin peut tout modifier, owner uniquement son restaurant
  if (profile.role !== "admin" && profile.restaurant_id !== id) {
    return NextResponse.json(
      { error: "Accès refusé — ce restaurant ne vous appartient pas" },
      { status: 403 }
    );
  }

  // Les owners ne peuvent pas modifier agent_id, agent_status, subscription_*
  if (profile.role !== "admin") {
    delete updates.agent_id;
    delete updates.agent_status;
    delete updates.subscription_status;
    delete updates.subscription_amount;
    delete updates.subscription_plan;
    delete updates.subscription_started_at;
    delete updates.trial_ends_at;
    delete updates.cancelled_at;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Supprimer un restaurant (admin)
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const { error } = await supabase.from("restaurants").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
