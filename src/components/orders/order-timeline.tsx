import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { OrderEvent } from "@/lib/supabase/types";

const eventLabels: Record<string, string> = {
  created: "Commande créée",
  status_change: "Statut modifié",
  webhook_received: "Webhook reçu",
  enriched: "Commande enrichie",
  whatsapp_sent: "WhatsApp envoyé",
};

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun événement</p>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Ligne verticale */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      {events.map((event) => {
        const details = event.details as Record<string, string> | null;
        return (
          <div key={event.id} className="relative pl-6">
            <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-background border-2 border-violet" />
            <p className="text-sm font-medium">
              {eventLabels[event.event_type] || event.event_type}
            </p>
            {details?.new_status && (
              <p className="text-xs text-muted-foreground">
                → {details.new_status}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(event.created_at), "HH:mm · d MMM", {
                locale: fr,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
