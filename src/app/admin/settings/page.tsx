import { createServiceClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AdminSettingsContent } from "@/components/admin/admin-settings-content";

export const dynamic = "force-dynamic";

// Types pour le health check
export interface HealthCheckResult {
  status: "ok" | "error" | "missing";
  latency_ms?: number;
}

export interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthCheckResult;
    env_supabase_url: HealthCheckResult;
    env_supabase_anon: HealthCheckResult;
    env_service_role: HealthCheckResult;
    env_elevenlabs_key: HealthCheckResult;
    env_elevenlabs_secret: HealthCheckResult;
  };
  timestamp: string;
}

export default async function AdminSettingsPage() {
  const supabase = createServiceClient();

  // Stats système — comptages parallèles
  const [{ count: restoCount }, { count: orderCount }, { count: userCount }] =
    await Promise.all([
      supabase.from("restaurants").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  // Health check — calcul inline (évite un fetch réseau interne)
  let health: HealthData;
  try {
    const envChecks = {
      env_supabase_url: { status: (process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing") as "ok" | "missing" },
      env_supabase_anon: { status: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing") as "ok" | "missing" },
      env_service_role: { status: (process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing") as "ok" | "missing" },
      env_elevenlabs_key: { status: (process.env.ELEVENLABS_API_KEY ? "ok" : "missing") as "ok" | "missing" },
      env_elevenlabs_secret: { status: (process.env.ELEVENLABS_WEBHOOK_SECRET ? "ok" : "missing") as "ok" | "missing" },
    };

    // Test DB avec mesure de latence
    let dbCheck: HealthCheckResult;
    try {
      const start = performance.now();
      const { error } = await supabase.from("restaurants").select("id", { count: "exact", head: true });
      const latency = Math.round(performance.now() - start);
      dbCheck = error ? { status: "error", latency_ms: latency } : { status: "ok", latency_ms: latency };
    } catch {
      dbCheck = { status: "error" };
    }

    const dbOk = dbCheck.status === "ok";
    const allEnvOk = Object.values(envChecks).every((c) => c.status === "ok");

    health = {
      status: !dbOk ? "unhealthy" : !allEnvOk ? "degraded" : "healthy",
      checks: { database: dbCheck, ...envChecks },
      timestamp: new Date().toISOString(),
    };
  } catch {
    health = {
      status: "unhealthy",
      checks: {
        database: { status: "error" },
        env_supabase_url: { status: "missing" },
        env_supabase_anon: { status: "missing" },
        env_service_role: { status: "missing" },
        env_elevenlabs_key: { status: "missing" },
        env_elevenlabs_secret: { status: "missing" },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Liste des admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  return (
    <PageWrapper className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paramètres système, intégrations et surveillance Voxena
        </p>
      </div>
      <AdminSettingsContent
        stats={{
          restaurants: restoCount ?? 0,
          orders: orderCount ?? 0,
          users: userCount ?? 0,
        }}
        health={health}
        admins={
          (admins ?? []) as {
            id: string;
            email: string;
            full_name: string;
            created_at: string;
          }[]
        }
      />
    </PageWrapper>
  );
}
