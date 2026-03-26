import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { sendReservationConfirmation } from "@/lib/email/send-notification";

/**
 * GET /api/reservations
 * Liste les réservations par restaurant_id + date.
 * Query params: restaurant_id, date (YYYY-MM-DD), date_from, date_to
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurant_id");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (!restaurantId) {
    return NextResponse.json(
      { error: "restaurant_id requis" },
      { status: 400 }
    );
  }

  // Vérifier l'auth et le droit d'accès
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { profile } = authResult;
  if (profile.role !== "admin" && profile.restaurant_id !== restaurantId) {
    return NextResponse.json(
      { error: "Accès non autorisé à ce restaurant" },
      { status: 403 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("reservations")
    .select("*, floor_tables(name, capacity)")
    .eq("restaurant_id", restaurantId)
    .order("time_slot", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  } else if (dateFrom && dateTo) {
    query = query.gte("date", dateFrom).lte("date", dateTo);
  } else if (dateFrom) {
    query = query.gte("date", dateFrom);
  } else if (dateTo) {
    query = query.lte("date", dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[reservations/GET] Erreur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reservations: data || [] });
}

/**
 * POST /api/reservations
 * Crée une nouvelle réservation.
 * Appelable par l'agent (service role header) ou par l'owner (auth cookie).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      restaurant_id,
      date,
      time_slot,
      covers,
      customer_name,
      customer_phone,
      customer_email,
      table_id,
      notes,
      source = "manual",
      preferences,
      occasion,
      conversation_id,
      duration = 90,
      status: requestedStatus,
    } = body;

    if (!restaurant_id || !date || !time_slot || !covers || !customer_name) {
      return NextResponse.json(
        { error: "Champs requis : restaurant_id, date, time_slot, covers, customer_name" },
        { status: 400 }
      );
    }

    // Vérifier auth — soit service role (agent), soit cookie (owner)
    const apiKey = request.headers.get("x-api-key") || request.headers.get("X-Api-Key");
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    const isAgent = apiKey && apiKey === webhookSecret;

    if (!isAgent) {
      const authResult = await requireAuth();
      if ("error" in authResult) return authResult.error;

      const { profile } = authResult;
      if (profile.role !== "admin" && profile.restaurant_id !== restaurant_id) {
        return NextResponse.json(
          { error: "Accès non autorisé à ce restaurant" },
          { status: 403 }
        );
      }
    }

    const supabase = createServiceClient();

    // Construire les notes enrichies (préférences + occasion)
    let enrichedNotes = notes || "";
    if (occasion && occasion !== "Aucune") {
      enrichedNotes = `[Occasion: ${occasion}] ${enrichedNotes}`.trim();
    }
    if (preferences && Array.isArray(preferences) && preferences.length > 0) {
      enrichedNotes = `[Préférences: ${preferences.join(", ")}] ${enrichedNotes}`.trim();
    }

    // Résoudre la table — soit fournie, soit auto-assignée
    let resolvedTableId = table_id || null;

    if (!resolvedTableId) {
      // Auto-assigner la plus petite table disponible >= covers
      const { data: availableTables } = await supabase
        .from("floor_tables")
        .select("id, name, capacity")
        .eq("restaurant_id", restaurant_id)
        .eq("is_active", true)
        .gte("capacity", covers)
        .order("capacity", { ascending: true });

      if (availableTables && availableTables.length > 0) {
        // Vérifier les conflits de réservation pour chaque table candidate
        for (const table of availableTables) {
          const conflict = await checkTableConflict(
            supabase,
            table.id,
            date,
            time_slot,
            duration
          );
          if (!conflict) {
            resolvedTableId = table.id;
            break;
          }
        }
      }
    } else {
      // Vérifier qu'il n'y a pas de conflit sur la table choisie
      const conflict = await checkTableConflict(
        supabase,
        resolvedTableId,
        date,
        time_slot,
        duration
      );
      if (conflict) {
        return NextResponse.json(
          { error: "Cette table est déjà réservée à ce créneau" },
          { status: 409 }
        );
      }
    }

    // ── Gestion liste d'attente ──
    const isWaitlist = requestedStatus === "liste_attente";
    let waitlistPosition: number | null = null;
    let estimatedWaitMinutes: number | null = null;

    if (isWaitlist) {
      // Calculer la position dans la file d'attente
      const { data: maxPosData } = await supabase
        .from("reservations")
        .select("waitlist_position")
        .eq("restaurant_id", restaurant_id)
        .eq("date", date)
        .eq("status", "liste_attente")
        .order("waitlist_position", { ascending: false })
        .limit(1);

      const currentMax = maxPosData?.[0]?.waitlist_position ?? 0;
      waitlistPosition = currentMax + 1;

      // Estimer le temps d'attente
      // Chercher les réservations "assise" sur des tables >= covers
      const { data: seatedResas } = await supabase
        .from("reservations")
        .select("created_at, duration, time_slot, floor_tables!inner(capacity)")
        .eq("restaurant_id", restaurant_id)
        .eq("date", date)
        .eq("status", "assise")
        .gte("floor_tables.capacity", covers);

      if (seatedResas && seatedResas.length > 0) {
        const now = new Date();
        let minRemainingMinutes = Infinity;

        for (const resa of seatedResas) {
          // Estimer le temps restant : (time_slot + duration) - maintenant
          const [slotH, slotM] = resa.time_slot.split(":").map(Number);
          const slotDate = new Date(date);
          slotDate.setHours(slotH, slotM, 0, 0);
          const endTime = new Date(slotDate.getTime() + (resa.duration || 90) * 60000);
          const remainingMs = endTime.getTime() - now.getTime();
          const remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));

          if (remainingMin < minRemainingMinutes) {
            minRemainingMinutes = remainingMin;
          }
        }

        estimatedWaitMinutes = minRemainingMinutes === Infinity ? 30 : minRemainingMinutes;
      } else {
        // Pas de réservation assise → estimation par défaut 30 min
        estimatedWaitMinutes = 30;
      }
    }

    // Créer la réservation
    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id,
        table_id: isWaitlist ? null : resolvedTableId,
        date,
        time_slot,
        duration,
        covers,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        status: isWaitlist ? "liste_attente" : "en_attente",
        notes: enrichedNotes || null,
        source: isAgent ? "phone" : source,
        conversation_id: conversation_id || null,
        waitlist_position: waitlistPosition,
        estimated_wait_minutes: estimatedWaitMinutes,
      })
      .select("*, floor_tables(name, capacity)")
      .single();

    if (error) {
      console.error("[reservations/POST] Erreur insertion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Envoyer email de confirmation au client (fire and forget)
    if (customer_email) {
      // Récupérer les infos du restaurant pour l'email
      const { data: resto } = await supabase
        .from("restaurants")
        .select("name, address, phone")
        .eq("id", restaurant_id)
        .single();

      if (resto) {
        sendReservationConfirmation({
          reservation: {
            customer_name,
            customer_email,
            date,
            time_slot,
            covers,
            notes: enrichedNotes || null,
          },
          restaurant: {
            name: resto.name,
            address: resto.address,
            phone: resto.phone,
          },
        }).catch((err) => console.error("[reservations/POST] Erreur envoi email:", err));
      }
    }

    // Upsert client si téléphone fourni
    if (customer_phone) {
      await supabase
        .rpc("upsert_customer", {
          p_restaurant_id: restaurant_id,
          p_phone: customer_phone,
          p_name: customer_name || null,
          p_total: 0,
        })
        .then(({ error: custErr }) => {
          if (custErr)
            console.warn("[reservations/POST] Erreur upsert client:", custErr.message);
        });

      // Mettre à jour l'email du client si fourni
      if (customer_email) {
        await supabase
          .from("customers")
          .update({ email: customer_email })
          .eq("restaurant_id", restaurant_id)
          .eq("phone", customer_phone);
      }
    }

    return NextResponse.json({
      success: true,
      reservation,
      message: `Réservation créée pour ${customer_name} le ${date} à ${time_slot}`,
    });
  } catch (err) {
    console.error("[reservations/POST] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/reservations
 * Met à jour une réservation (statut, table, heure, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    const supabase = createServiceClient();

    // Vérifier que la réservation existe et que l'user y a accès
    const { data: existing } = await supabase
      .from("reservations")
      .select("restaurant_id, status, waitlist_position, date")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Réservation non trouvée" },
        { status: 404 }
      );
    }

    const { profile } = authResult;
    if (
      profile.role !== "admin" &&
      profile.restaurant_id !== existing.restaurant_id
    ) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Si on change la table, vérifier les conflits
    if (updates.table_id && updates.table_id !== null) {
      const resaDate = updates.date;
      const resaTime = updates.time_slot;
      const resaDuration = updates.duration;

      if (resaDate && resaTime) {
        const conflict = await checkTableConflict(
          supabase,
          updates.table_id,
          resaDate,
          resaTime,
          resaDuration || 90,
          id // Exclure la résa en cours
        );
        if (conflict) {
          return NextResponse.json(
            { error: "Cette table est déjà réservée à ce créneau" },
            { status: 409 }
          );
        }
      }
    }

    // Nettoyer les champs non modifiables
    const allowedFields = [
      "status",
      "table_id",
      "date",
      "time_slot",
      "duration",
      "covers",
      "customer_name",
      "customer_phone",
      "customer_email",
      "notes",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }
    safeUpdates.updated_at = new Date().toISOString();

    // ── Transition liste_attente → assise : nettoyer les champs waitlist ──
    const isWaitlistToSeated =
      existing.status === "liste_attente" && updates.status === "assise";

    if (isWaitlistToSeated) {
      safeUpdates.waitlist_position = null;
      safeUpdates.estimated_wait_minutes = null;
    }

    // Transition liste_attente → annulee : nettoyer aussi
    const isWaitlistCancelled =
      existing.status === "liste_attente" && updates.status === "annulee";

    if (isWaitlistCancelled) {
      safeUpdates.waitlist_position = null;
      safeUpdates.estimated_wait_minutes = null;
    }

    const { data: reservation, error } = await supabase
      .from("reservations")
      .update(safeUpdates)
      .eq("id", id)
      .select("*, floor_tables(name, capacity)")
      .single();

    if (error) {
      console.error("[reservations/PATCH] Erreur:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Recalculer les positions waitlist restantes si on retire quelqu'un ──
    if (
      (isWaitlistToSeated || isWaitlistCancelled) &&
      existing.waitlist_position !== null
    ) {
      // Décaler les positions des entrées suivantes
      const { data: remainingWaitlist } = await supabase
        .from("reservations")
        .select("id, waitlist_position")
        .eq("restaurant_id", existing.restaurant_id)
        .eq("date", existing.date)
        .eq("status", "liste_attente")
        .gt("waitlist_position", existing.waitlist_position)
        .order("waitlist_position", { ascending: true });

      if (remainingWaitlist && remainingWaitlist.length > 0) {
        for (const item of remainingWaitlist) {
          await supabase
            .from("reservations")
            .update({
              waitlist_position: (item.waitlist_position ?? 1) - 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        }
      }
    }

    return NextResponse.json({ success: true, reservation });
  } catch (err) {
    console.error("[reservations/PATCH] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/reservations
 * Supprime une réservation.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    const supabase = createServiceClient();

    // Vérifier propriété
    const { data: existing } = await supabase
      .from("reservations")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Réservation non trouvée" },
        { status: 404 }
      );
    }

    const { profile } = authResult;
    if (
      profile.role !== "admin" &&
      profile.restaurant_id !== existing.restaurant_id
    ) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("reservations").delete().eq("id", id);

    if (error) {
      console.error("[reservations/DELETE] Erreur:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reservations/DELETE] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── Utilitaire : vérifier les conflits de table ──

/**
 * Vérifie si une table est déjà réservée pour un créneau donné.
 * Prend en compte la durée de la réservation (chevauchement).
 */
async function checkTableConflict(
  supabase: ReturnType<typeof createServiceClient>,
  tableId: string,
  date: string,
  timeSlot: string,
  duration: number,
  excludeReservationId?: string
): Promise<boolean> {
  // Calculer les bornes du créneau demandé
  const [startH, startM] = timeSlot.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + duration;

  // Chercher les réservations existantes sur cette table ce jour-là
  let query = supabase
    .from("reservations")
    .select("time_slot, duration")
    .eq("table_id", tableId)
    .eq("date", date)
    .not("status", "in", '("annulee","no_show")');

  if (excludeReservationId) {
    query = query.neq("id", excludeReservationId);
  }

  const { data: existingResas } = await query;

  if (!existingResas || existingResas.length === 0) return false;

  for (const resa of existingResas) {
    const [eH, eM] = resa.time_slot.split(":").map(Number);
    const existingStart = eH * 60 + eM;
    const existingEnd = existingStart + (resa.duration || 90);

    // Chevauchement : le nouveau créneau commence avant la fin de l'existant
    // ET finit après le début de l'existant
    if (startMinutes < existingEnd && endMinutes > existingStart) {
      return true;
    }
  }

  return false;
}
