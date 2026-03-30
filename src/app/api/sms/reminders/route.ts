import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendReservationReminderSms,
  sendReservationSameDayReminderSms,
} from "@/lib/sms/send-sms-notification";

/**
 * POST /api/sms/reminders
 * Envoie les rappels SMS pour les réservations à venir.
 * Conçu pour être appelé par un cron job (Vercel Cron, Inngest, etc.)
 *
 * - Rappel J-1 : envoyé la veille de la réservation
 * - Rappel H-2 : envoyé 2h avant la réservation (jour même)
 *
 * Protégé par CRON_SECRET pour éviter les appels non autorisés.
 */
export async function POST(request: NextRequest) {
  // Vérifier le secret cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Date de demain
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Heure actuelle + 2h (pour rappels H-2)
  const in2h = new Date(now);
  in2h.setHours(in2h.getHours() + 2);
  const targetHour = `${in2h.getHours().toString().padStart(2, "0")}:${in2h.getMinutes().toString().padStart(2, "0")}`;

  let sentCount = 0;

  // ── Rappels J-1 : réservations de demain ──
  const { data: tomorrowResas } = await supabase
    .from("reservations")
    .select("id, restaurant_id, customer_name, customer_phone, date, time_slot, covers")
    .eq("date", tomorrowStr)
    .in("status", ["en_attente", "confirmee"])
    .not("customer_phone", "is", null);

  for (const resa of tomorrowResas || []) {
    if (!resa.customer_phone) continue;

    const { data: resto } = await supabase
      .from("restaurants")
      .select("name, telnyx_phone")
      .eq("id", resa.restaurant_id)
      .single();

    if (!resto?.telnyx_phone) continue;

    await sendReservationReminderSms({
      customerPhone: resa.customer_phone,
      customerName: resa.customer_name,
      restaurantName: resto.name,
      restaurantPhone: resto.telnyx_phone,
      date: resa.date,
      timeSlot: resa.time_slot,
      covers: resa.covers,
    });
    sentCount++;
  }

  // ── Rappels H-2 : réservations d'aujourd'hui dans ~2h ──
  // On prend une fenêtre de 30 min autour de targetHour pour ne pas rater de créneaux
  const windowStart = `${in2h.getHours().toString().padStart(2, "0")}:00`;
  const windowEndH = new Date(in2h);
  windowEndH.setMinutes(windowEndH.getMinutes() + 30);
  const windowEnd = `${windowEndH.getHours().toString().padStart(2, "0")}:${windowEndH.getMinutes().toString().padStart(2, "0")}`;

  const { data: todayResas } = await supabase
    .from("reservations")
    .select("id, restaurant_id, customer_name, customer_phone, time_slot")
    .eq("date", todayStr)
    .in("status", ["en_attente", "confirmee"])
    .gte("time_slot", windowStart)
    .lte("time_slot", windowEnd)
    .not("customer_phone", "is", null);

  for (const resa of todayResas || []) {
    if (!resa.customer_phone) continue;

    const { data: resto } = await supabase
      .from("restaurants")
      .select("name, telnyx_phone")
      .eq("id", resa.restaurant_id)
      .single();

    if (!resto?.telnyx_phone) continue;

    await sendReservationSameDayReminderSms({
      customerPhone: resa.customer_phone,
      customerName: resa.customer_name,
      restaurantName: resto.name,
      restaurantPhone: resto.telnyx_phone,
      timeSlot: resa.time_slot,
    });
    sentCount++;
  }

  return NextResponse.json({
    success: true,
    sent: sentCount,
    timestamp: now.toISOString(),
  });
}
