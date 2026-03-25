import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Types pour la réponse health check
interface CheckResult {
  status: "ok" | "error" | "missing";
  latency_ms?: number;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: CheckResult;
    env_supabase_url: CheckResult;
    env_supabase_anon: CheckResult;
    env_service_role: CheckResult;
    env_elevenlabs_key: CheckResult;
    env_elevenlabs_secret: CheckResult;
  };
  timestamp: string;
}

// GET /api/health — Vérifie la santé du système (pas d'auth requise)
export async function GET() {
  const checks: HealthResponse["checks"] = {
    database: { status: "error" },
    env_supabase_url: { status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing" },
    env_supabase_anon: { status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing" },
    env_service_role: { status: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing" },
    env_elevenlabs_key: { status: process.env.ELEVENLABS_API_KEY ? "ok" : "missing" },
    env_elevenlabs_secret: { status: process.env.ELEVENLABS_WEBHOOK_SECRET ? "ok" : "missing" },
  };

  // Test de connectivité DB avec mesure de latence
  try {
    const supabase = createServiceClient();
    const start = performance.now();
    const { error } = await supabase.from("restaurants").select("id", { count: "exact", head: true });
    const latency = Math.round(performance.now() - start);

    if (error) {
      checks.database = { status: "error", latency_ms: latency };
    } else {
      checks.database = { status: "ok", latency_ms: latency };
    }
  } catch {
    checks.database = { status: "error" };
  }

  // Déterminer le statut global
  const dbOk = checks.database.status === "ok";
  const envChecks = [
    checks.env_supabase_url,
    checks.env_supabase_anon,
    checks.env_service_role,
    checks.env_elevenlabs_key,
    checks.env_elevenlabs_secret,
  ];
  const allEnvOk = envChecks.every((c) => c.status === "ok");

  let status: HealthResponse["status"];
  if (!dbOk) {
    status = "unhealthy";
  } else if (!allEnvOk) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  const response: HealthResponse = {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: status === "unhealthy" ? 503 : 200,
  });
}
