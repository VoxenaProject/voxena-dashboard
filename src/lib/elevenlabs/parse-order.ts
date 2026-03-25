import type { OrderItem } from "@/lib/supabase/types";

/**
 * Parse la string d'items envoyée par l'agent ElevenLabs
 * Gère les formats : "2x Pizza Margherita (sans oignons), 1x Tiramisu"
 * ou JSON si l'agent envoie du structuré
 */
export function parseOrderItems(raw: string): OrderItem[] {
  if (!raw || raw.trim() === "") return [];

  // Si c'est du JSON, le parser directement
  if (raw.trim().startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      // Continuer avec le parsing texte
    }
  }

  return raw.split(",").map((item) => {
    const trimmed = item.trim();
    // Format : "2x Pizza Margherita (sans oignons)"
    const match = trimmed.match(
      /^(\d+)\s*x?\s*(.+?)(?:\s*\((.+)\))?$/
    );
    if (match) {
      const name = match[2].trim();
      // Valider que le nom est non vide et raisonnable
      if (name.length === 0 || name.length > 200) {
        return { name: "Article inconnu", quantity: parseInt(match[1]) };
      }
      return {
        name,
        quantity: Math.max(1, Math.min(99, parseInt(match[1]))),
        modifications: match[3]
          ? match[3].split(",").map((m) => m.trim()).filter(Boolean)
          : undefined,
      };
    }
    const safeName = trimmed.length > 0 && trimmed.length <= 200 ? trimmed : "Article inconnu";
    return { name: safeName, quantity: 1 };
  }).filter((item) => item.name.length > 0);
}

/**
 * Calcule le total d'une commande.
 * Somme les articles qui ont un prix, retourne null si aucun article n'a de prix.
 */
export function calculateTotal(items: OrderItem[]): number | null {
  if (items.length === 0) return null;
  const pricedItems = items.filter((item) => item.price != null);
  if (pricedItems.length === 0) return null;
  return pricedItems.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );
}
