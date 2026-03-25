import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseOrderItems, calculateTotal } from "@/lib/elevenlabs/parse-order";

// Rate limiter simple en mémoire : max 30 commandes/min par restaurant
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(restaurantId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(restaurantId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(restaurantId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/orders/create
 * Appelé par l'agent ElevenLabs via Server Tool pendant la conversation
 */
export async function POST(request: Request) {
  try {
    // Vérifier l'API key (TODO: réactiver après test)
    // const apiKey = request.headers.get("x-api-key") || request.headers.get("X-Api-Key");
    // const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    // if (webhookSecret && webhookSecret.length > 0 && apiKey !== webhookSecret) {
    //   console.warn("[orders/create] API key invalide");
    //   return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    // }

    const body = await request.json();

    // Extraire les données de la commande
    const {
      customer_name,
      customer_phone,
      order_type,
      order_items,
      special_instructions,
      pickup_time,
      delivery_address,
      delivery_time_estimate,
      conversation_id,
      restaurant_id,
    } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "restaurant_id requis" },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(restaurant_id)) {
      return NextResponse.json(
        { error: "Trop de commandes, réessayez dans quelques instants" },
        { status: 429 }
      );
    }

    // Parser les items
    const items = parseOrderItems(order_items || "");
    const total_amount = calculateTotal(items);

    const supabase = createServiceClient();

    // Insérer la commande
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        restaurant_id,
        conversation_id: conversation_id || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        order_type: order_type || null,
        items,
        special_instructions: special_instructions || null,
        pickup_time: pickup_time || null,
        delivery_address: delivery_address || null,
        delivery_time_estimate: delivery_time_estimate || null,
        total_amount,
        status: "nouvelle",
      })
      .select()
      .single();

    if (error) {
      console.error("[orders/create] Erreur insertion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log l'événement de création
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "created",
      details: { source: "server_tool", conversation_id },
    });

    // Log agent
    await supabase.from("agent_logs").insert({
      restaurant_id,
      conversation_id,
      event_type: "tool_call",
      payload: { tool: "create_order", order_id: order.id },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      message: `Commande #${order.id.slice(0, 8)} créée avec succès.`,
    });
  } catch (err) {
    console.error("[orders/create] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
