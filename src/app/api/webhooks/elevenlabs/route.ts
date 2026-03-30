import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/elevenlabs/verify-webhook";
import { parseOrderItems, calculateTotal } from "@/lib/elevenlabs/parse-order";
import { sendOrderConfirmationSms } from "@/lib/sms/send-sms-notification";
import { sendReservationConfirmationSms } from "@/lib/sms/send-sms-notification";

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

    // Idempotency : ignorer si pas de conversation_id
    if (!conversationId) {
      console.warn("[webhook] conversation_id manquant, impossible de traiter");
      return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });
    }

    // Extraire les données collectées par l'agent
    const collected = data.data_collection || data.analysis?.data_collection || {};

    // Chercher si la commande existe déjà (créée par le server tool ou un webhook précédent)
    const { data: existingOrders } = await supabase
      .from("orders")
      .select("id, transcript")
      .eq("conversation_id", conversationId);

    const existingOrder = existingOrders?.[0] || null;

    if (existingOrder) {
      // Vérifier si c'est un doublon complet (webhook déjà traité avec transcript)
      if (existingOrder.transcript) {
        // Doublon détecté — logger et ignorer
        await supabase.from("agent_logs").insert({
          restaurant_id: restaurantIdParam || null,
          conversation_id: conversationId,
          event_type: "duplicate_webhook_ignored",
          payload: {
            existing_order_id: existingOrder.id,
            message: "Webhook post-call déjà traité pour cette conversation",
          },
        });

        console.warn("[webhook] Doublon ignoré pour conversation:", conversationId);
        return NextResponse.json({ received: true, duplicate: true });
      }

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
        .eq("id", existingOrder.id);

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

      // Idempotency : vérifier une dernière fois avant l'insert (race condition)
      const { data: raceCheck } = await supabase
        .from("orders")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (raceCheck) {
        // Créé entre-temps par un autre webhook concurrent
        await supabase.from("agent_logs").insert({
          restaurant_id: restaurantId,
          conversation_id: conversationId,
          event_type: "duplicate_webhook_race_condition",
          payload: {
            existing_order_id: raceCheck.id,
            message: "Commande créée par un webhook concurrent",
          },
        });

        console.warn("[webhook] Race condition détectée pour conversation:", conversationId);
        return NextResponse.json({ received: true, duplicate: true });
      }

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

    // ── Extraire le numéro de l'appelant depuis le payload webhook ──
    // Telnyx/ElevenLabs peut le mettre dans différents champs
    const callerPhone =
      data.caller_number ||
      data.from ||
      data.phone_number ||
      data.metadata?.caller_number ||
      data.metadata?.from ||
      data.metadata?.phone_number ||
      collected.customer_phone ||
      null;

    // Nettoyer le numéro (peut être au format sip:, tel:, etc.)
    const cleanPhone = callerPhone
      ? callerPhone.toString().replace(/^(sip:|tel:)/, "").replace(/@.*$/, "").trim()
      : null;
    const validPhone = cleanPhone && /^\+?[0-9]{8,15}$/.test(cleanPhone.replace(/[\s\-\.\(\)]/g, ""))
      ? cleanPhone
      : null;

    // Logger le numéro trouvé pour debug
    await supabase.from("agent_logs").insert({
      restaurant_id: restaurantIdParam || null,
      conversation_id: conversationId,
      event_type: "caller_phone_extracted",
      payload: { callerPhone, cleanPhone, validPhone, metadata_keys: Object.keys(data.metadata || {}), data_keys: Object.keys(data) },
    });

    // ── Enrichir les réservations liées à cet appel ──
    const { data: existingResas } = await supabase
      .from("reservations")
      .select("id, restaurant_id, customer_name, customer_phone, date, time_slot, covers")
      .eq("conversation_id", conversationId);

    if (existingResas && existingResas.length > 0) {
      for (const resa of existingResas) {
        // Mettre à jour le numéro si absent
        if (!resa.customer_phone && validPhone) {
          await supabase
            .from("reservations")
            .update({ customer_phone: validPhone })
            .eq("id", resa.id);
        }

        // Envoyer le SMS de confirmation (si on a un numéro)
        const phoneToUse = resa.customer_phone || validPhone;
        if (phoneToUse) {
          const { data: resto } = await supabase
            .from("restaurants")
            .select("name, telnyx_phone")
            .eq("id", resa.restaurant_id)
            .single();

          if (resto?.telnyx_phone) {
            sendReservationConfirmationSms({
              customerPhone: phoneToUse,
              customerName: resa.customer_name,
              restaurantName: resto.name,
              restaurantPhone: resto.telnyx_phone,
              date: resa.date,
              timeSlot: resa.time_slot,
              covers: resa.covers,
            }).catch((e) => console.warn("[webhook] Erreur SMS résa:", e));
          }

          // Upsert client
          await supabase.rpc("upsert_customer", {
            p_restaurant_id: resa.restaurant_id,
            p_phone: phoneToUse,
            p_name: resa.customer_name || null,
            p_total: 0,
          });
        }
      }
    }

    // ── SMS pour les commandes si le numéro manquait à la création ──
    if (existingOrder && !existingOrder.transcript && validPhone) {
      // Le numéro n'était peut-être pas là à la création — enrichir + SMS
      const { data: orderFull } = await supabase
        .from("orders")
        .select("id, restaurant_id, customer_name, customer_phone, items, total_amount, order_type, pickup_time")
        .eq("id", existingOrder.id)
        .single();

      if (orderFull && !orderFull.customer_phone) {
        await supabase.from("orders").update({ customer_phone: validPhone }).eq("id", orderFull.id);

        const { data: resto } = await supabase
          .from("restaurants")
          .select("name, telnyx_phone")
          .eq("id", orderFull.restaurant_id)
          .single();

        if (resto?.telnyx_phone) {
          sendOrderConfirmationSms({
            customerPhone: validPhone,
            customerName: orderFull.customer_name || "Client",
            restaurantName: resto.name,
            restaurantPhone: resto.telnyx_phone,
            items: orderFull.items || [],
            totalAmount: orderFull.total_amount,
            orderType: orderFull.order_type,
            pickupTime: orderFull.pickup_time,
          }).catch((e) => console.warn("[webhook] Erreur SMS order:", e));
        }
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
