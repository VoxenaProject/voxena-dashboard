import { createHmac, timingSafeEqual } from "crypto";

/**
 * Vérifie la signature HMAC-SHA256 du webhook ElevenLabs
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  // Sans secret configuré : accepter en dev uniquement
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[webhook] ELEVENLABS_WEBHOOK_SECRET manquant en production — rejet");
      return false;
    }
    console.warn("[webhook] ELEVENLABS_WEBHOOK_SECRET non configuré — mode dev, signature ignorée");
    return true;
  }

  if (!signature) return false;

  // Le header peut avoir le format "v0=<hex>" ou juste "<hex>"
  const sig = signature.startsWith("v0=") ? signature.slice(3) : signature;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
