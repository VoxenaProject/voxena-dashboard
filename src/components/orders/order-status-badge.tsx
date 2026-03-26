import {
  Bell,
  ChefHat,
  PackageCheck,
  Truck,
  CircleCheckBig,
  XCircle,
} from "lucide-react";
import type { OrderStatus, OrderType } from "@/lib/supabase/types";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
}

// Labels adaptés au type de commande pour "prete"
function getStatusConfig(
  status: OrderStatus,
  orderType?: OrderType | null
): StatusConfig {
  switch (status) {
    case "nouvelle":
      return {
        label: "Nouvelle",
        icon: Bell,
        className:
          "bg-green/12 text-green border-green/20 animate-pulse",
      };
    case "en_preparation":
      return {
        label: "En cuisine",
        icon: ChefHat,
        className: "bg-amber-500/12 text-amber-600 border-amber-500/20",
      };
    case "prete":
      return orderType === "livraison"
        ? {
            label: "Prête à livrer",
            icon: Truck,
            className: "bg-blue/12 text-blue border-blue/20",
          }
        : {
            label: "Attente retrait",
            icon: PackageCheck,
            className: "bg-blue/12 text-blue border-blue/20",
          };
    case "en_livraison":
      return {
        label: "En livraison",
        icon: Truck,
        className: "bg-violet/12 text-violet border-violet/20",
      };
    case "livree":
      return {
        label: "Livrée",
        icon: CircleCheckBig,
        className: "bg-muted text-muted-foreground border-border",
      };
    case "recuperee":
      return {
        label: "Récupérée",
        icon: CircleCheckBig,
        className: "bg-muted text-muted-foreground border-border",
      };
    case "annulee":
      return {
        label: "Annulée",
        icon: XCircle,
        className: "bg-red-500/8 text-red-500 border-red-500/20",
      };
    default:
      return {
        label: status,
        icon: Bell,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
}

// Statuts actifs qui méritent un point pulsant
const activeStatuses = new Set<OrderStatus>(["nouvelle", "en_preparation", "en_livraison"]);

export function OrderStatusBadge({
  status,
  orderType,
}: {
  status: OrderStatus;
  orderType?: OrderType | null;
}) {
  const config = getStatusConfig(status, orderType);
  const Icon = config.icon;
  const isActive = activeStatuses.has(status);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.className}`}
    >
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot-live" />
      )}
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
