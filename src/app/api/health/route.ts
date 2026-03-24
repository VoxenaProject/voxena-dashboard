import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/health — Vérifie la santé du système
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Env vars
  checks.supabase_url = { ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL };
  checks.supabase_anon = { ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  checks.supabase_service = { ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY };
  checks.elevenlabs_key = {
    ok: !!process.env.ELEVENLABS_API_KEY,
    detail: process.env.ELEVENLABS_API_KEY ? "Configuré" : "Non configuré",
  };
  checks.elevenlabs_webhook = {
    ok: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    detail: process.env.ELEVENLABS_WEBHOOK_SECRET ? "Configuré" : "Non configuré",
  };

  // Test DB connection
  try {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true });
    checks.database = { ok: true, detail: `${count} restaurant(s)` };
  } catch (err) {
    checks.database = { ok: false, detail: String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
