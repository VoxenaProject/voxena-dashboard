import { createServiceClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AdminSettingsContent } from "@/components/admin/admin-settings-content";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createServiceClient();

  // Stats système
  const [{ count: restoCount }, { count: orderCount }, { count: userCount }] =
    await Promise.all([
      supabase.from("restaurants").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  // Health check
  let health: Record<string, { ok: boolean; detail?: string }> = {};
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "http://localhost:3000" : ""}/api/health`,
      { cache: "no-store" }
    );
    const data = await res.json();
    health = data.checks || {};
  } catch {
    health = { fetch: { ok: false, detail: "Impossible de contacter /api/health" } };
  }

  // Admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin");

  return (
    <PageWrapper className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paramètres système et intégrations Voxena
        </p>
      </div>
      <AdminSettingsContent
        stats={{ restaurants: restoCount || 0, orders: orderCount || 0, users: userCount || 0 }}
        health={health}
        admins={(admins || []) as { id: string; email: string; full_name: string; created_at: string }[]}
      />
    </PageWrapper>
  );
}
