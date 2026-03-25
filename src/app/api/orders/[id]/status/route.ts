import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

/**
 * PATCH /api/orders/[id]/status
 * Met à jour le statut d'une commande (authentifié + ownership)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier authentification
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { status } = await request.json();

    const validStatuses = [
      "nouvelle",
      "en_preparation",
      "prete",
      "en_livraison",
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

    // Vérifier que la commande appartient au restaurant du user
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (existingOrder && auth.profile.role !== "admin" && auth.profile.restaurant_id !== existingOrder.restaurant_id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

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
