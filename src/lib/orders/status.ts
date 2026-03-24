import type { OrderStatus, OrderType } from "@/lib/supabase/types";

/**
 * Logique centralisée du flow de statuts commande.
 * Source unique de vérité utilisée dans OrderCard, OrderActions, etc.
 *
 * Flow emporter :  nouvelle → en_preparation → prete → recuperee
 * Flow livraison : nouvelle → en_preparation → prete → en_livraison → livree
 */

export interface NextAction {
  label: string;
  status: OrderStatus;
  color: string;
}

/**
 * Retourne la prochaine action possible selon le statut ET le type de commande.
 */
export function getNextAction(
  status: OrderStatus,
  orderType?: OrderType | null
): NextAction | null {
  switch (status) {
    case "nouvelle":
      return {
        label: "Accepter & préparer",
        status: "en_preparation",
        color: "bg-green hover:bg-green/90 text-white",
      };
    case "en_preparation":
      return {
        label: "C'est prêt !",
        status: "prete",
        color: "bg-amber-500 hover:bg-amber-500/90 text-white",
      };
    case "prete":
      return orderType === "livraison"
        ? {
            label: "Envoyer en livraison",
            status: "en_livraison",
            color: "bg-blue hover:bg-blue/90 text-white",
          }
        : {
            label: "Client a récupéré",
            status: "recuperee",
            color: "bg-violet hover:bg-violet/90 text-white",
          };
    case "en_livraison":
      return {
        label: "Confirmer livrée",
        status: "livree",
        color: "bg-violet hover:bg-violet/90 text-white",
      };
    default:
      return null;
  }
}

/**
 * Labels humains pour les toasts de confirmation.
 */
export const statusToastLabels: Record<string, string> = {
  en_preparation: "Commande acceptée — en cuisine",
  prete: "Commande prête",
  en_livraison: "Commande envoyée en livraison",
  recuperee: "Client a récupéré sa commande",
  livree: "Commande livrée avec succès",
  annulee: "Commande annulée",
};

/**
 * Vérifie si un statut est terminal (commande finie).
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ["livree", "recuperee", "annulee"].includes(status);
}
