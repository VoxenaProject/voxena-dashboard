import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/elevenlabs/verify-webhook";
import { parseOrderItems, calculateTotal } from "@/lib/elevenlabs/parse-order";

/**
 * POST /api/webhooks/elevenlabs
 * Reçoit les événements post-call de ElevenLabs
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Vérifier la signature
    const signature = request.headers.get("elevenlabs-signature");
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Identifier le restaurant via le query param ou le payload
    const url = new URL(request.url);
    const restaurantIdParam = url.searchParams.get("restaurant");

    const supabase = createServiceClient();

    // Logger l'événement brut (pour debug admin)
    await supabase.from("agent_logs").insert({
      restaurant_id: restaurantIdParam || null,
      conversation_id: payload.data?.conversation_id || null,
      event_type: payload.type || "unknown",
      payload: payload.data || payload,
    });

    // Ne traiter que les transcriptions post-call
    if (payload.type !== "post_call_transcription") {
      return NextResponse.json({ received: true });
    }

    const data = payload.data;
    const conversationId = data.conversation_id;

    // Extraire les données collectées par l'agent
    const collected = data.data_collection || data.analysis?.data_collection || {};

    // Chercher si la commande existe déjà (créée par le server tool)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("conversation_id", conversationId)
      .single();

    if (existingOrder) {
      // Enrichir la commande existante avec le transcript et l'audio
      await supabase
        .from("orders")
        .update({
          transcript: data.transcript || null,
          audio_url: data.recording_url || null,
          metadata: {
            duration: data.metadata?.duration,
            cost: data.metadata?.cost,
            agent_id: data.agent_id,
          },
          // Mettre à jour si les données extraites sont plus complètes
          ...(collected.customer_name && { customer_name: collected.customer_name }),
          ...(collected.customer_phone && { customer_phone: collected.customer_phone }),
          ...(collected.order_type && { order_type: collected.order_type }),
          ...(collected.special_instructions && { special_instructions: collected.special_instructions }),
          ...(collected.pickup_time && { pickup_time: collected.pickup_time }),
          ...(collected.delivery_address && { delivery_address: collected.delivery_address }),
        })
        .eq("conversation_id", conversationId);

      await supabase.from("order_events").insert({
        order_id: existingOrder.id,
        event_type: "enriched_by_webhook",
        details: {
          has_transcript: !!data.transcript,
          has_audio: !!data.recording_url,
        },
      });
    } else {
      // Fallback : créer la commande depuis le webhook
      const restaurantId = restaurantIdParam || await getRestaurantByAgentId(supabase, data.agent_id);

      if (!restaurantId) {
        console.error("[webhook] Impossible de trouver le restaurant pour agent_id:", data.agent_id);
        return NextResponse.json({ error: "Restaurant non trouvé" }, { status: 400 });
      }

      const items = parseOrderItems(collected.order_items || "");
      const total_amount = calculateTotal(items);

      const { data: newOrder } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          conversation_id: conversationId,
          customer_name: collected.customer_name || null,
          customer_phone: collected.customer_phone || null,
          order_type: collected.order_type || null,
          items,
          special_instructions: collected.special_instructions || null,
          pickup_time: collected.pickup_time || null,
          delivery_address: collected.delivery_address || null,
          delivery_time_estimate: collected.delivery_time_estimate || null,
          total_amount,
          transcript: data.transcript || null,
          audio_url: data.recording_url || null,
          metadata: {
            duration: data.metadata?.duration,
            cost: data.metadata?.cost,
            agent_id: data.agent_id,
          },
          status: "nouvelle",
        })
        .select()
        .single();

      if (newOrder) {
        await supabase.from("order_events").insert({
          order_id: newOrder.id,
          event_type: "created",
          details: { source: "webhook_fallback", conversation_id: conversationId },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Trouver le restaurant par agent_id ElevenLabs
async function getRestaurantByAgentId(
  supabase: ReturnType<typeof createServiceClient>,
  agentId: string | undefined
): Promise<string | null> {
  if (!agentId) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("agent_id", agentId)
    .single();
  return data?.id || null;
}
