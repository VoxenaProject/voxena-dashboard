import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendReservationConfirmation } from "@/lib/email/send-notification";
import { sendReservationConfirmationSms } from "@/lib/sms/send-sms-notification";
import { isValidPhone } from "@/lib/utils/phone";
import { bookReservationSchema, validateBody } from "@/lib/validations";

// Rate limiting simple en mémoire (par IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max 5 réservations par IP par minute
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/book
 * Endpoint PUBLIC — crée une réservation depuis le widget de réservation.
 * Pas d'auth requis, mais rate-limité par IP.
 * Source automatiquement marquée comme "web".
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes, veuillez réessayer dans une minute" },
        { status: 429 }
      );
    }

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

    const validation = validateBody(bookReservationSchema, body);
    if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 });
    const validated = validation.data!;

    const {
      restaurant_id,
      date,
      time_slot,
      covers,
      customer_name,
      customer_phone,
      customer_email,
      notes,
      preferences,
      occasion,
      zone,
    } = validated;

    const coversNum = typeof covers === "string" ? parseInt(covers, 10) : covers;

    // Validation stricte
    if (!restaurant_id || !date || !time_slot || !coversNum || !customer_name || !customer_phone) {
      return NextResponse.json(
        { error: "Champs requis : restaurant_id, date, time_slot, covers, customer_name, customer_phone" },
        { status: 400 }
      );
    }

    if (!isValidPhone(customer_phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    // Validation de la date (pas dans le passé)
    const reservationDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      return NextResponse.json({ error: "La date doit être dans le futur" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Vérifier que le restaurant existe
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, address, phone, telnyx_phone, default_reservation_duration, turnover_buffer")
      .eq("id", restaurant_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant non trouvé" }, { status: 404 });
    }

    const defaultDuration = restaurant.default_reservation_duration ?? 90;
    const turnoverBuffer = restaurant.turnover_buffer ?? 15;

    // Auto-assigner la table (même logique que /api/reservations POST)
    let resolvedTableId: string | null = null;

    const parsedPrefs = Array.isArray(preferences)
      ? preferences
      : typeof preferences === "string" && preferences.length > 0
        ? preferences.split(",").map((p: string) => p.trim())
        : [];

    // Utiliser la zone si fournie, sinon chercher dans les préférences
    const zonePreference = zone || parsedPrefs.find((p: string) =>
      ["salle", "terrasse", "bar", "salle_privee", "vip"].includes(p)
    );

    let tablesQuery = supabase
      .from("floor_tables")
      .select("id, name, capacity, zone")
      .eq("restaurant_id", restaurant_id)
      .eq("is_active", true)
      .gte("capacity", coversNum)
      .order("capacity", { ascending: true });

    if (zonePreference) {
      tablesQuery = tablesQuery.eq("zone", zonePreference);
    }

    const { data: availableTables } = await tablesQuery;

    let candidates = availableTables || [];
    if (candidates.length === 0 && zonePreference) {
      const { data: allTables } = await supabase
        .from("floor_tables")
        .select("id, name, capacity, zone")
        .eq("restaurant_id", restaurant_id)
        .eq("is_active", true)
        .gte("capacity", coversNum)
        .order("capacity", { ascending: true });
      candidates = allTables || [];
    }

    // Vérifier les conflits pour chaque table
    for (const table of candidates) {
      const conflict = await checkTableConflict(
        supabase,
        table.id,
        date,
        time_slot,
        defaultDuration,
        turnoverBuffer
      );
      if (!conflict) {
        resolvedTableId = table.id;
        break;
      }
    }

    // Créer la réservation
    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id,
        table_id: resolvedTableId,
        date,
        time_slot,
        duration: defaultDuration,
        covers: coversNum,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        status: "en_attente",
        notes: notes || null,
        preferences: parsedPrefs,
        occasion: occasion && occasion !== "Aucune" ? occasion : null,
        source: "web",
      })
      .select("*, floor_tables(name, capacity)")
      .single();

    if (error) {
      console.error("[book/POST] Erreur insertion:", error);
      return NextResponse.json({ error: "Erreur lors de la réservation" }, { status: 500 });
    }

    // Email de confirmation (fire and forget)
    if (customer_email) {
      sendReservationConfirmation({
        reservation: {
          customer_name,
          customer_email,
          date,
          time_slot,
          covers: coversNum,
          notes: notes || null,
        },
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
        },
      }).catch((err) => console.error("[book/POST] Erreur envoi email:", err));
    }

    // SMS confirmation au client — fire-and-forget
    if (customer_phone && restaurant.telnyx_phone) {
      sendReservationConfirmationSms({
        customerPhone: customer_phone,
        customerName: customer_name,
        restaurantName: restaurant.name,
        restaurantPhone: restaurant.telnyx_phone,
        date,
        timeSlot: time_slot,
        covers: coversNum,
      }).catch((e) => console.warn("[book/POST] Erreur SMS:", e));
    }

    // Upsert client
    if (customer_phone) {
      supabase
        .rpc("upsert_customer", {
          p_restaurant_id: restaurant_id,
          p_phone: customer_phone,
          p_name: customer_name || null,
          p_total: 0,
        })
        .then(({ error: custErr }) => {
          if (custErr) console.warn("[book/POST] Erreur upsert client:", custErr.message);
        });

      if (customer_email) {
        supabase
          .from("customers")
          .update({ email: customer_email })
          .eq("restaurant_id", restaurant_id)
          .eq("phone", customer_phone);
      }
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        date: reservation.date,
        time_slot: reservation.time_slot,
        covers: reservation.covers,
        customer_name: reservation.customer_name,
        status: reservation.status,
      },
      message: `Réservation créée pour ${customer_name} le ${date} à ${time_slot}`,
    });
  } catch (err) {
    console.error("[book/POST] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── Utilitaire : vérifier les conflits de table ──
async function checkTableConflict(
  supabase: ReturnType<typeof createServiceClient>,
  tableId: string,
  date: string,
  timeSlot: string,
  duration: number,
  turnoverBuffer: number
): Promise<boolean> {
  const [startH, startM] = timeSlot.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + duration + turnoverBuffer;

  const { data: existingResas } = await supabase
    .from("reservations")
    .select("time_slot, duration")
    .eq("table_id", tableId)
    .eq("date", date)
    .not("status", "in", '("annulee","no_show")');

  if (!existingResas || existingResas.length === 0) return false;

  for (const resa of existingResas) {
    const [eH, eM] = resa.time_slot.split(":").map(Number);
    const existingStart = eH * 60 + eM;
    const existingEnd = existingStart + (resa.duration || 90) + turnoverBuffer;

    if (startMinutes < existingEnd && endMinutes > existingStart) {
      return true;
    }
  }

  return false;
}
