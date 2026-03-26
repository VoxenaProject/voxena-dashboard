import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/reservations/availability
 * Endpoint PUBLIC — utilisé par l'agent vocal et le futur widget.
 * Retourne les créneaux disponibles avec les tables libres pour une date et un nombre de couverts.
 *
 * Query params: restaurant_id, date (YYYY-MM-DD), covers
 * Retourne: { slots: [{ time: "19:00", tables: [{ id, name, capacity }] }, ...] }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurant_id");
  const date = searchParams.get("date");
  const covers = parseInt(searchParams.get("covers") || "2", 10);

  if (!restaurantId || !date) {
    return NextResponse.json(
      { error: "restaurant_id et date requis" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Récupérer les horaires d'ouverture du restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("opening_hours")
    .eq("id", restaurantId)
    .single();

  // Déterminer les horaires pour ce jour de la semaine
  const dayOfWeek = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const dayHours = restaurant?.opening_hours?.[dayOfWeek];

  // Horaires par défaut si pas configurés : 11:00 - 23:00
  let openingSlots: { open: string; close: string }[] = [
    { open: "11:00", close: "23:00" },
  ];
  if (dayHours && Array.isArray(dayHours) && dayHours.length > 0) {
    openingSlots = dayHours;
  }

  // Récupérer les tables actives avec capacité >= covers
  const { data: tables } = await supabase
    .from("floor_tables")
    .select("id, name, capacity")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .gte("capacity", covers)
    .order("capacity", { ascending: true });

  if (!tables || tables.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Récupérer les réservations existantes pour cette date (non annulées)
  const { data: existingResas } = await supabase
    .from("reservations")
    .select("table_id, time_slot, duration")
    .eq("restaurant_id", restaurantId)
    .eq("date", date)
    .not("status", "in", '("annulee","no_show")');

  const reservations = existingResas || [];

  // Durée par défaut d'une réservation : 90 minutes
  const DEFAULT_DURATION = 90;

  // Générer tous les créneaux de 30 minutes dans les plages d'ouverture
  const slots: { time: string; tables: { id: string; name: string; capacity: number }[] }[] = [];

  for (const period of openingSlots) {
    const [openH, openM] = period.open.split(":").map(Number);
    const [closeH, closeM] = period.close.split(":").map(Number);
    let currentMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Dernier créneau réservable = fermeture - durée résa (pour que le client ait le temps de manger)
    const lastSlotMinutes = closeMinutes - DEFAULT_DURATION;

    while (currentMinutes <= lastSlotMinutes) {
      const slotTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
      const slotEnd = currentMinutes + DEFAULT_DURATION;

      // Trouver les tables disponibles pour ce créneau
      const availableTables = tables.filter((table) => {
        // Vérifier qu'il n'y a pas de chevauchement avec les résas existantes sur cette table
        const hasConflict = reservations.some((resa) => {
          if (resa.table_id !== table.id) return false;
          const [rH, rM] = resa.time_slot.split(":").map(Number);
          const resaStart = rH * 60 + rM;
          const resaEnd = resaStart + (resa.duration || DEFAULT_DURATION);
          // Chevauchement
          return currentMinutes < resaEnd && slotEnd > resaStart;
        });
        return !hasConflict;
      });

      if (availableTables.length > 0) {
        slots.push({
          time: slotTime,
          tables: availableTables.map((t) => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
          })),
        });
      }

      currentMinutes += 30;
    }
  }

  return NextResponse.json({ slots });
}
