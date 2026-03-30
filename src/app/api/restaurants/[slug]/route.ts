import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/restaurants/{slug}
 * Endpoint PUBLIC — retourne les infos publiques d'un restaurant.
 * Utilisé par la page de réservation /book/{slug} et le widget embeddable.
 * Ne retourne PAS les données sensibles (agent_id, subscription, billing, etc.)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "slug requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, phone, address, logo_url, opening_hours, practical_info, default_reservation_duration, turnover_buffer")
    .eq("slug", slug)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant non trouvé" }, { status: 404 });
  }

  // Récupérer les zones disponibles (tables actives)
  const { data: tables } = await supabase
    .from("floor_tables")
    .select("zone")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const zones = [...new Set((tables || []).map((t) => t.zone).filter(Boolean))];

  const response = NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      phone: restaurant.phone,
      address: restaurant.address,
      logo_url: restaurant.logo_url,
      opening_hours: restaurant.opening_hours,
      practical_info: restaurant.practical_info,
      default_reservation_duration: restaurant.default_reservation_duration,
      turnover_buffer: restaurant.turnover_buffer,
      zones,
    },
  });

  // Cache 5 min
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  return response;
}
