import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  nouvelle: {
    label: "Nouvelle",
    className: "bg-green/10 text-green border-green/20",
  },
  en_preparation: {
    label: "En préparation",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  prete: {
    label: "Prête",
    className: "bg-blue/10 text-blue border-blue/20",
  },
  livree: {
    label: "Livrée",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  recuperee: {
    label: "Récupérée",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  annulee: {
    label: "Annulée",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] || statusConfig.nouvelle;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
