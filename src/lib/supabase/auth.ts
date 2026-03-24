import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Profile } from "@/lib/supabase/types";

/**
 * Crée un client Supabase SSR avec les cookies de session.
 * À utiliser dans les Server Components et Server Actions.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore — cookies en read-only dans certains contextes SSR
          }
        },
      },
    }
  );
}

/**
 * Récupère le profil complet du user connecté (id, role, restaurant_id).
 * Retourne null si non connecté.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createAuthClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) || null;
}

/**
 * Récupère le restaurant_id du user connecté.
 * Retourne null si non connecté ou pas de restaurant associé.
 */
export async function getCurrentRestaurantId(): Promise<string | null> {
  const profile = await getCurrentProfile();
  return profile?.restaurant_id || null;
}
