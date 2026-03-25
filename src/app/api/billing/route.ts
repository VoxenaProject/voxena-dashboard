import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * PATCH /api/billing
 * Met à jour les champs abonnement d'un restaurant (admin uniquement).
 * Body : { restaurant_id, subscription_status?, subscription_amount?, billing_notes? }
 */
export async function PATCH(request: NextRequest) {
  // Vérifier que l'utilisateur est admin
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const body = await request.json();
    const { restaurant_id, subscription_status, subscription_amount, billing_notes } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "restaurant_id requis" },
        { status: 400 }
      );
    }

    // Construire l'objet de mise à jour
    const updates: Record<string, unknown> = {};

    if (subscription_status !== undefined) {
      const validStatuses = ["trialing", "active", "past_due", "cancelled", "paused"];
      if (!validStatuses.includes(subscription_status)) {
        return NextResponse.json(
          { error: `Statut invalide. Valeurs acceptées : ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.subscription_status = subscription_status;

      // Si on annule, enregistrer la date d'annulation
      if (subscription_status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
      }

      // Si on réactive, effacer la date d'annulation
      if (subscription_status === "active") {
        updates.cancelled_at = null;
      }
    }

    if (subscription_amount !== undefined) {
      const amount = Number(subscription_amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Montant invalide" },
          { status: 400 }
        );
      }
      updates.subscription_amount = amount;
    }

    if (billing_notes !== undefined) {
      updates.billing_notes = billing_notes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Aucune modification fournie" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Mettre à jour le restaurant
    const { data: updated, error: updateError } = await supabase
      .from("restaurants")
      .update(updates)
      .eq("id", restaurant_id)
      .select()
      .single();

    if (updateError) {
      console.error("[billing] Erreur mise à jour restaurant:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // Logger le changement dans agent_logs
    await supabase.from("agent_logs").insert({
      restaurant_id,
      event_type: "subscription_changed",
      payload: {
        changes: updates,
        changed_by: authResult.profile.email,
        previous_status: body.previous_status || null,
      },
    });

    return NextResponse.json({ restaurant: updated });
  } catch (err) {
    console.error("[billing] Erreur inattendue:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
