import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * Vérifie l'authentification dans une API route.
 * Retourne le profil si connecté, ou une NextResponse 401.
 */
export async function requireAuth(): Promise<
  { profile: Profile } | { error: NextResponse }
> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Pas de set dans les API routes
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      error: NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 403 }
      ),
    };
  }

  return { profile: profile as Profile };
}

/**
 * Vérifie que l'utilisateur est admin.
 */
export async function requireAdmin(): Promise<
  { profile: Profile } | { error: NextResponse }
> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (result.profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      ),
    };
  }

  return result;
}
