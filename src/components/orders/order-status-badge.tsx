import type { OrderStatus, OrderType } from "@/lib/supabase/types";

// Couleurs du point de statut
const dotColors: Record<string, string> = {
  nouvelle: "bg-green",
  en_preparation: "bg-amber-500",
  prete: "bg-blue",
  en_livraison: "bg-violet",
  livree: "bg-muted-foreground/30",
  recuperee: "bg-muted-foreground/30",
  annulee: "bg-red-500",
};

// Labels adaptés au type de commande pour "prete"
function getLabel(status: OrderStatus, orderType?: OrderType | null): string {
  switch (status) {
    case "nouvelle":
      return "Nouvelle";
    case "en_preparation":
      return "En cuisine";
    case "prete":
      return orderType === "livraison" ? "Prête à livrer" : "Attente retrait";
    case "en_livraison":
      return "En livraison";
    case "livree":
      return "Livrée";
    case "recuperee":
      return "Récupérée";
    case "annulee":
      return "Annulée";
    default:
      return status;
  }
}

export function OrderStatusBadge({
  status,
  orderType,
}: {
  status: OrderStatus;
  orderType?: OrderType | null;
}) {
  const label = getLabel(status, orderType);
  const dot = dotColors[status] || "bg-muted-foreground/30";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
