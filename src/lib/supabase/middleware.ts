import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Routes publiques (webhooks, API agents, seed en dev)
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/orders/create") ||
    pathname.startsWith("/api/menu") ||
    pathname.startsWith("/api/reservations") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/seed")
  ) {
    return supabaseResponse;
  }

  // Pas connecté → redirect login
  if (!user && !pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Connecté + sur /login → redirect vers dashboard (ou onboarding)
  if (user && pathname.startsWith("/login")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile?.role === "admin") {
      url.pathname = "/admin";
    } else if (profile && !profile.onboarding_completed) {
      url.pathname = "/onboarding";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  // Vérifier le rôle pour les routes protégées
  if (user && !pathname.startsWith("/api")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const isAdminRoute = pathname.startsWith("/admin");
    const isOnboardingRoute = pathname.startsWith("/onboarding");
    const isRestaurantRoute = !isAdminRoute && !isOnboardingRoute;

    // Admin sur une route restaurant ou onboarding → redirect /admin
    if (isAdmin && (isRestaurantRoute || isOnboardingRoute)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Owner sur une route admin → redirect /
    if (!isAdmin && isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Owner pas onboardé → redirect /onboarding (sauf s'il y est déjà)
    if (!isAdmin && !isOnboardingRoute && profile && !profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
