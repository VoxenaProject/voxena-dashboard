/**
 * Module SMS via Telnyx Messaging API.
 * Envoie des SMS via le numéro Telnyx du restaurant.
 *
 * Variables d'environnement requises :
 * - TELNYX_API_KEY : clé API v2 de Telnyx
 *
 * Le numéro d'envoi est le telnyx_phone du restaurant (stocké en DB).
 */

const TELNYX_API_URL = "https://api.telnyx.com/v2/messages";

interface SendSmsParams {
  to: string; // numéro du destinataire (+32...)
  from: string; // numéro Telnyx du restaurant
  text: string; // contenu du message
}

interface TelnyxResponse {
  data?: {
    id: string;
    record_type: string;
    direction: string;
    to: { phone_number: string }[];
  };
  errors?: { title: string; detail: string }[];
}

/**
 * Envoie un SMS via Telnyx.
 * Ne throw jamais — log les erreurs et retourne null.
 */
export async function sendSms({ to, from, text }: SendSmsParams): Promise<string | null> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    console.warn("[sms] TELNYX_API_KEY manquant — SMS non envoyé");
    return null;
  }

  if (!to || !from || !text) {
    console.warn("[sms] Paramètres manquants — SMS non envoyé");
    return null;
  }

  try {
    const res = await fetch(TELNYX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        text,
        type: "SMS",
      }),
    });

    const json: TelnyxResponse = await res.json();

    if (!res.ok || json.errors) {
      console.error("[sms] Erreur Telnyx:", json.errors || res.status);
      return null;
    }

    const messageId = json.data?.id || null;
    console.log(`[sms] SMS envoyé à ${to} (id: ${messageId})`);
    return messageId;
  } catch (err) {
    console.error("[sms] Erreur envoi:", err);
    return null;
  }
}
