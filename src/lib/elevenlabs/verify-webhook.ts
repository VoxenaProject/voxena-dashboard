import { createHmac, timingSafeEqual } from "crypto";

/**
 * Vérifie la signature HMAC-SHA256 du webhook ElevenLabs
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  // En dev sans secret configuré, accepter tout (avec warning)
  if (!secret) {
    console.warn("[webhook] ELEVENLABS_WEBHOOK_SECRET non configuré — signature non vérifiée");
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
