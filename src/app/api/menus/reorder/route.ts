import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// PATCH /api/menus/reorder — Met à jour l'ordre des catégories
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items[] requis" }, { status: 400 });
  }

  // Batch update sort_order
  for (const item of items) {
    await supabase
      .from("menus")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
  }

  return NextResponse.json({ success: true });
}
