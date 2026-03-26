import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/auth";

/**
 * Layout KDS — plein écran, pas de sidebar, pas de top bar.
 * Vérifie l'auth et le restaurant_id.
 */
export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Redirect si pas connecté
  if (!profile) {
    redirect("/login");
  }

  // Redirect si pas de restaurant associé
  if (!profile.restaurant_id) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {children}
    </div>
  );
}
