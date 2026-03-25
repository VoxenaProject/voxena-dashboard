import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/lib/supabase/types";

// Configuration des badges par statut d'abonnement
const statusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
  trialing: {
    label: "Essai",
    className: "bg-blue/12 text-blue border-blue/20",
  },
  active: {
    label: "Actif",
    className: "bg-green/12 text-green border-green/20",
  },
  past_due: {
    label: "Impay\u00e9",
    className: "bg-red-500/12 text-red-500 border-red-500/20",
  },
  cancelled: {
    label: "R\u00e9sili\u00e9",
    className: "bg-muted text-muted-foreground border-border",
  },
  paused: {
    label: "Paus\u00e9",
    className: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  },
};

export function SubscriptionBadge({
  status,
}: {
  status: SubscriptionStatus | null;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
        Non configur\u00e9
      </Badge>
    );
  }

  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
      {config.label}
    </Badge>
  );
}
