import { createServiceClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Info, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const eventIcons: Record<string, typeof Info> = {
  error: AlertTriangle,
  webhook_received: CheckCircle,
  server_tool_call: Info,
  order_created: CheckCircle,
};

const eventColors: Record<string, string> = {
  error: "text-destructive",
  webhook_received: "text-green",
  server_tool_call: "text-blue",
  order_created: "text-green",
};

export default async function AdminLogsPage() {
  const supabase = createServiceClient();

  // Récupérer les logs avec le nom du restaurant
  const { data: logs } = await supabase
    .from("agent_logs")
    .select("*, restaurants(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const typedLogs =
    (logs as (AgentLog & { restaurants: { name: string } | null })[]) || [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Logs agents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historique des événements des agents vocaux
        </p>
      </div>

      {typedLogs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Aucun log</p>
            <p className="text-sm">
              Les événements des agents apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Derniers événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {typedLogs.map((log) => {
                const Icon = eventIcons[log.event_type] || Info;
                const color = eventColors[log.event_type] || "text-muted-foreground";

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-3 border-b border-border last:border-0"
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.event_type}
                        </Badge>
                        {log.restaurants?.name && (
                          <span className="text-xs text-muted-foreground">
                            {log.restaurants.name}
                          </span>
                        )}
                      </div>

                      {log.error_message && (
                        <p className="text-sm text-destructive mb-1">
                          {log.error_message}
                        </p>
                      )}

                      {log.conversation_id && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          conv: {log.conversation_id}
                        </p>
                      )}

                      {log.payload && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Voir le payload
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-[11px] font-mono overflow-x-auto max-h-40">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "d MMM HH:mm", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
