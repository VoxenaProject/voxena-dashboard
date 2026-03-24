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

// Mettre à jour un restaurant
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const supabase = createServiceClient();
  const body = await request.json();

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
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
