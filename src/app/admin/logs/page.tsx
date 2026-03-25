import { createServiceClient } from "@/lib/supabase/server";
import { LogsPageClient } from "./logs-page-client";
import type { AgentLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const supabase = createServiceClient();

  // Récupérer tous les restaurants (pour le filtre dropdown)
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name", { ascending: true });

  // Récupérer les 200 derniers logs avec le nom du restaurant
  const { data: logs } = await supabase
    .from("agent_logs")
    .select("*, restaurants(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const typedLogs =
    (logs as (AgentLog & { restaurants: { name: string } | null })[]) || [];

  return (
    <LogsPageClient
      logs={typedLogs}
      restaurants={restaurants || []}
    />
  );
}
