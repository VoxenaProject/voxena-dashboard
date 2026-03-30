import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { sendOrderReadySms } from "@/lib/sms/send-sms-notification";

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

    // Commande introuvable → 404
    if (!existingOrder) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Ownership check
    if (auth.profile.role !== "admin" && auth.profile.restaurant_id !== existingOrder.restaurant_id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Validation des transitions de statut
    const validTransitions: Record<string, string[]> = {
      nouvelle: ["en_preparation", "annulee"],
      en_preparation: ["prete", "annulee"],
      prete: ["en_livraison", "recuperee", "annulee"],
      en_livraison: ["livree", "annulee"],
      livree: [],
      recuperee: [],
      annulee: [],
    };

    // Récupérer le statut actuel
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    if (currentOrder) {
      const allowed = validTransitions[currentOrder.status] || [];
      if (allowed.length > 0 && !allowed.includes(status)) {
        return NextResponse.json(
          { error: `Transition ${currentOrder.status} → ${status} non autorisée` },
          { status: 400 }
        );
      }
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

    // SMS "commande prête" au client — fire-and-forget
    if (status === "prete" && order.customer_phone) {
      (async () => {
        try {
          const { data: rd } = await supabase
            .from("restaurants")
            .select("name, telnyx_phone")
            .eq("id", order.restaurant_id)
            .single();
          if (rd?.telnyx_phone) {
            sendOrderReadySms({
              customerPhone: order.customer_phone,
              customerName: order.customer_name || "Client",
              restaurantName: rd.name,
              restaurantPhone: rd.telnyx_phone,
            });
          }
        } catch (e) { console.warn("[orders/status] Erreur SMS:", e); }
      })();
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("[orders/status] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
