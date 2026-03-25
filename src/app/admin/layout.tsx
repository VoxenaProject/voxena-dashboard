import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SidebarAdmin } from "@/components/layout/sidebar-admin";
import { TopBar } from "@/components/layout/top-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification serveur : seuls les admins accèdent à /admin
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarAdmin />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet/[0.02] to-transparent" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
