import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseOrderItems, calculateTotal } from "@/lib/elevenlabs/parse-order";
import { sendOrderNotification } from "@/lib/email/send-notification";
import { correctAddress } from "@/lib/utils/belgian-communes";
import { checkRestaurantOpen } from "@/lib/utils/day-mapping";

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
    // Vérifier l'API key ElevenLabs (case-insensitive header)
    const apiKey = request.headers.get("x-api-key") || request.headers.get("X-Api-Key");
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (!apiKey || apiKey !== webhookSecret) {
      console.warn("[orders/create] API key invalide ou manquante");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();

    // Extraire les données de la commande
    const {
      customer_name,
      customer_phone,
      order_type,
      order_items,
      items: itemsField,
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

    // Parser les items (accepte "items" ou "order_items" depuis ElevenLabs)
    const rawItems = order_items || itemsField || "";
    const items = parseOrderItems(typeof rawItems === "string" ? rawItems : JSON.stringify(rawItems));

    const supabase = createServiceClient();

    // Récupérer menu + horaires d'ouverture en parallèle
    const [{ data: menuItems }, { data: restaurantData }] = await Promise.all([
      supabase
        .from("menu_items")
        .select("name, price")
        .eq("restaurant_id", restaurant_id)
        .eq("is_available", true)
        .limit(200),
      supabase
        .from("restaurants")
        .select("opening_hours")
        .eq("id", restaurant_id)
        .single(),
    ]);

    // Vérifier si le restaurant est actuellement ouvert
    const hoursCheck = checkRestaurantOpen(restaurantData?.opening_hours);
    if (!hoursCheck.isOpen) {
      return NextResponse.json(
        {
          error: "Le restaurant est actuellement fermé",
          closed: true,
          reopens: hoursCheck.reopens || "prochainement",
        },
        { status: 400 }
      );
    }

    if (menuItems && menuItems.length > 0) {
      for (const item of items) {
        const match = menuItems.find(
          (mi) => mi.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        if (match) {
          item.price = match.price;
        }
      }
    }

    const total_amount = calculateTotal(items);

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

    // Formater le total avec virgule pour l'affichage français
    const totalFormatted = (total_amount ?? 0).toFixed(2).replace(".", ",");

    // Note si le restaurant ferme bientôt
    const closingSoonNote = hoursCheck.closingSoon
      ? ` (attention : le restaurant ferme dans ${hoursCheck.minutesUntilClose} minutes)`
      : "";

    // Répondre IMMÉDIATEMENT à l'agent — tout le reste est asynchrone
    const response = NextResponse.json({
      success: true,
      order_id: order.id,
      total_amount,
      message: `Commande #${order.id.slice(0, 8)} créée — Total: ${totalFormatted}€${closingSoonNote}`,
    });

    // Logs, upsert client et email en arrière-plan (ne bloquent PAS la réponse)
    Promise.all([
      supabase.from("order_events").insert({
        order_id: order.id,
        event_type: "created",
        details: { source: "server_tool", conversation_id },
      }),
      supabase.from("agent_logs").insert({
        restaurant_id,
        conversation_id,
        event_type: "tool_call",
        payload: { tool: "create_order", order_id: order.id },
      }),
      customer_phone
        ? supabase.rpc("upsert_customer", {
            p_restaurant_id: restaurant_id,
            p_phone: customer_phone,
            p_name: customer_name || null,
            p_total: total_amount || 0,
          })
        : Promise.resolve(),
    ]).catch((err) => console.warn("[orders/create] Erreur logs/upsert:", err));

    // Email notification en totalement fire-and-forget (ne bloque PAS)
    (async () => {
      try {
        const [{ data: rd }, { data: op }] = await Promise.all([
          supabase.from("restaurants").select("name").eq("id", restaurant_id).single(),
          supabase.from("profiles").select("email").eq("restaurant_id", restaurant_id).eq("role", "owner").single(),
        ]);
        if (rd && op) {
          sendOrderNotification({
            order: { customer_name: order.customer_name, items: order.items, total_amount: order.total_amount, order_type: order.order_type, delivery_address: order.delivery_address, special_instructions: order.special_instructions, pickup_time: order.pickup_time, delivery_time_estimate: order.delivery_time_estimate },
            restaurant: { name: rd.name, owner_email: op.email },
          });
        }
      } catch (e) { console.warn("[orders/create] Erreur email:", e); }
    })();

    // Correction d'adresse belge — fire-and-forget (ne bloque PAS la réponse)
    if (delivery_address) {
      (async () => {
        try {
          const result = correctAddress(delivery_address);
          if (result.wasFixed) {
            console.log(
              `[orders/create] Adresse corrigée: "${delivery_address}" → "${result.corrected}" (commune: ${result.commune}, CP: ${result.postalCode})`
            );
            await supabase
              .from("orders")
              .update({ delivery_address: result.corrected })
              .eq("id", order.id);
          }
        } catch (e) {
          console.warn("[orders/create] Erreur correction adresse:", e);
        }
      })();
    }

    return response;
  } catch (err) {
    console.error("[orders/create] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
