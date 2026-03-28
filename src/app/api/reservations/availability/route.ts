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
  // Convertir covers en nombre (gère les cas où l'agent envoie du texte)
  const rawCovers = searchParams.get("covers") || "2";
  let covers = parseInt(rawCovers, 10);
  if (isNaN(covers) || covers < 1) covers = 2; // Défaut à 2 si invalide
  const zone = searchParams.get("zone"); // Filtre optionnel par zone

  if (!restaurantId || !date) {
    return NextResponse.json(
      { error: "restaurant_id et date requis" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Requêtes en parallèle pour réduire la latence
  let tablesQuery = supabase
    .from("floor_tables")
    .select("id, name, capacity, zone")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .gte("capacity", covers)
    .order("capacity", { ascending: true });

  if (zone) {
    tablesQuery = tablesQuery.eq("zone", zone);
  }

  const [restaurantResult, tablesResult, resasResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("opening_hours, default_reservation_duration, turnover_buffer")
      .eq("id", restaurantId)
      .single(),
    tablesQuery,
    supabase
      .from("reservations")
      .select("table_id, time_slot, duration")
      .eq("restaurant_id", restaurantId)
      .eq("date", date)
      .not("status", "in", '("annulee","no_show")'),
  ]);

  const restaurant = restaurantResult.data;
  const tables = tablesResult.data;
  const reservations = resasResult.data || [];

  if (!tables || tables.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Mapping jour EN → FR pour les horaires stockés en français
  const dayMapping: Record<string, string> = {
    sunday: "dimanche", monday: "lundi", tuesday: "mardi",
    wednesday: "mercredi", thursday: "jeudi", friday: "vendredi", saturday: "samedi",
  };
  const dayEnglish = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const dayFrench = dayMapping[dayEnglish] || dayEnglish;

  // Chercher d'abord en français, puis en anglais (compatibilité)
  const dayHours = restaurant?.opening_hours?.[dayFrench] || restaurant?.opening_hours?.[dayEnglish];

  // Si le jour est fermé (open=false, pas de services, ou absent)
  if (!dayHours || dayHours.open === false || (dayHours.services && dayHours.services.length === 0)) {
    return NextResponse.json({ slots: [], closed: true, day: dayFrench });
  }

  // Extraire les plages horaires
  let openingSlots: { open: string; close: string }[] = [];
  if (dayHours.services && Array.isArray(dayHours.services)) {
    // Format : { services: [{ from: "11:30", to: "14:30" }, { from: "18:00", to: "22:30" }] }
    openingSlots = dayHours.services.map((s: { from: string; to: string }) => ({ open: s.from, close: s.to }));
  } else if (Array.isArray(dayHours) && dayHours.length > 0) {
    // Format alternatif : [{ open: "11:00", close: "23:00" }]
    openingSlots = dayHours;
  }

  // Si aucun créneau trouvé, défaut 11h-23h
  if (openingSlots.length === 0) {
    openingSlots = [{ open: "11:00", close: "23:00" }];
  }

  // Durée par défaut et buffer de retournement depuis les settings du restaurant
  const DEFAULT_DURATION = restaurant?.default_reservation_duration ?? 90;
  const TURNOVER_BUFFER = restaurant?.turnover_buffer ?? 15;

  // Générer tous les créneaux de 30 minutes dans les plages d'ouverture
  const slots: { time: string; tables: { id: string; name: string; capacity: number; zone: string }[] }[] = [];

  for (const period of openingSlots) {
    const [openH, openM] = period.open.split(":").map(Number);
    const [closeH, closeM] = period.close.split(":").map(Number);
    let currentMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Dernier créneau réservable = fermeture - durée résa (pour que le client ait le temps de manger)
    const lastSlotMinutes = closeMinutes - DEFAULT_DURATION;

    while (currentMinutes <= lastSlotMinutes) {
      const slotTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`;
      // La durée effective inclut le buffer de retournement
      const slotEnd = currentMinutes + DEFAULT_DURATION + TURNOVER_BUFFER;

      // Trouver les tables disponibles pour ce créneau
      const availableTables = tables.filter((table) => {
        // Vérifier qu'il n'y a pas de chevauchement avec les résas existantes sur cette table
        // en tenant compte du buffer de retournement
        const hasConflict = reservations.some((resa) => {
          if (resa.table_id !== table.id) return false;
          const [rH, rM] = resa.time_slot.split(":").map(Number);
          const resaStart = rH * 60 + rM;
          const resaEnd = resaStart + (resa.duration || DEFAULT_DURATION) + TURNOVER_BUFFER;
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
            zone: t.zone || "salle",
          })),
        });
      }

      currentMinutes += 30;
    }
  }

  const response = NextResponse.json({ slots });
  // Cache 2 min — les dispos changent quand une résa est créée
  response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=60");
  return response;
}
