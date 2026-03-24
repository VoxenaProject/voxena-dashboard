import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * PATCH /api/orders/[id]/status
 * Met à jour le statut d'une commande
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    const validStatuses = [
      "nouvelle",
      "en_preparation",
      "prete",
      "livree",
      "recuperee",
      "annulee",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: order, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Logger le changement de statut
    await supabase.from("order_events").insert({
      order_id: id,
      event_type: "status_changed",
      details: { new_status: status },
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("[orders/status] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
