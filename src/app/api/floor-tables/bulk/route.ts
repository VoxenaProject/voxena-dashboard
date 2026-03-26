import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// Vérifier que le user a le droit sur ce restaurant
function checkOwnership(
  profile: { role: string; restaurant_id: string | null },
  restaurantId: string
) {
  if (profile.role === "admin") return true;
  return profile.restaurant_id === restaurantId;
}

// Sauvegarde bulk : upsert toutes les tables, supprimer celles absentes
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const body = await request.json();
  const { restaurant_id, tables } = body;

  if (!restaurant_id || !Array.isArray(tables)) {
    return NextResponse.json(
      { error: "restaurant_id et tables[] requis" },
      { status: 400 }
    );
  }

  if (!checkOwnership(auth.profile, restaurant_id)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Récupérer les tables existantes pour détecter les suppressions
  const { data: existing } = await supabase
    .from("floor_tables")
    .select("id")
    .eq("restaurant_id", restaurant_id);

  const existingIds = (existing || []).map((t) => t.id);
  const incomingIds = tables.filter((t: { id?: string }) => t.id).map((t: { id: string }) => t.id);
  const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

  // Supprimer les tables retirées
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("floor_tables")
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: `Erreur suppression : ${deleteError.message}` },
        { status: 500 }
      );
    }
  }

  // Séparer nouvelles tables et mises à jour
  const toInsert = tables
    .filter((t: { id?: string }) => !t.id)
    .map((t: Record<string, unknown>, i: number) => ({
      restaurant_id,
      name: t.name || `Table ${i + 1}`,
      capacity: t.capacity ?? 2,
      shape: t.shape ?? "rectangle",
      x: t.x ?? 0,
      y: t.y ?? 0,
      width: t.width ?? 120,
      height: t.height ?? 70,
      combinable: t.combinable ?? true,
      is_active: t.is_active ?? true,
      sort_order: t.sort_order ?? i,
    }));

  const toUpdate = tables.filter((t: { id?: string }) => t.id);

  // Insérer les nouvelles
  let inserted: unknown[] = [];
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("floor_tables")
      .insert(toInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: `Erreur insertion : ${error.message}` },
        { status: 500 }
      );
    }
    inserted = data || [];
  }

  // Mettre à jour les existantes une par une
  const updated: unknown[] = [];
  for (const table of toUpdate) {
    const { id, created_at: _created, restaurant_id: _rid, ...fields } = table as Record<string, unknown>;
    const { data, error } = await supabase
      .from("floor_tables")
      .update(fields)
      .eq("id", id as string)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erreur mise à jour table ${id} : ${error.message}` },
        { status: 500 }
      );
    }
    if (data) updated.push(data);
  }

  return NextResponse.json({
    inserted: inserted.length,
    updated: updated.length,
    deleted: toDelete.length,
    tables: [...inserted, ...updated],
  });
}
