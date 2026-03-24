import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// PATCH /api/menu-items/reorder — Met à jour l'ordre des articles
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items[] requis" }, { status: 400 });
  }

  for (const item of items) {
    await supabase
      .from("menu_items")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
  }

  return NextResponse.json({ success: true });
}
