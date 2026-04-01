import { NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/supabase/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/email/send-notification";
import crypto from "crypto";

/**
 * Génère un mot de passe aléatoire sécurisé (12 caractères alphanumériques)
 */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * POST /api/invite
 * Crée un compte restaurateur et envoie l'email d'invitation.
 * Réservé aux admins Voxena.
 */
export async function POST(request: Request) {
  try {
    // Vérifier que l'utilisateur est admin
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const { email, full_name, restaurant_id } = body;

    // Validation des champs requis
    if (!email || !full_name || !restaurant_id) {
      return NextResponse.json(
        { error: "Les champs email, full_name et restaurant_id sont requis" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Vérifier que le restaurant existe
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant non trouvé" },
        { status: 404 }
      );
    }

    // Générer un mot de passe temporaire
    const tempPassword = generatePassword();
    let userId: string;

    // Essayer de créer l'utilisateur dans Supabase Auth
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (createError) {
      // Si l'utilisateur existe déjà, on le retrouve
      if (
        createError.message.includes("already") ||
        createError.message.includes("exists") ||
        createError.status === 422
      ) {
        const { data: listData, error: listError } =
          await supabase.auth.admin.listUsers();

        if (listError) {
          console.error("[invite] Erreur listUsers:", listError);
          return NextResponse.json(
            { error: "Erreur lors de la recherche de l'utilisateur" },
            { status: 500 }
          );
        }

        const existingUser = listData.users.find(
          (u) => u.email === email
        );

        if (!existingUser) {
          return NextResponse.json(
            { error: "Utilisateur existant introuvable" },
            { status: 500 }
          );
        }

        userId = existingUser.id;

        // Mettre à jour le mot de passe pour l'invitation
        await supabase.auth.admin.updateUserById(userId, {
          password: tempPassword,
        });
      } else {
        console.error("[invite] Erreur création utilisateur:", createError);
        return NextResponse.json(
          { error: `Erreur création utilisateur: ${createError.message}` },
          { status: 500 }
        );
      }
    } else {
      userId = createData.user.id;
    }

    // Créer ou mettre à jour le profil (upsert) — onboarding non complété
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name,
          role: "owner" as const,
          restaurant_id,
          onboarding_completed: false,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("[invite] Erreur upsert profil:", profileError);
      return NextResponse.json(
        { error: `Erreur création profil: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Envoyer l'email d'invitation
    const inviteUrl = "https://app.getvoxena.com/login";
    await sendInvitationEmail({
      email,
      fullName: full_name,
      restaurantName: restaurant.name,
      inviteUrl,
      tempPassword,
    });

    // Invitation envoyée avec succès

    return NextResponse.json({
      success: true,
      user_id: userId,
    });
  } catch (err) {
    console.error("[invite] Erreur inattendue:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invite
 * Met à jour le profil (onboarding_completed) via service role.
 * Accessible par le owner connecté (pour son propre profil uniquement).
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { profile_id, onboarding_completed } = body;

    // Le user ne peut modifier que son propre profil
    if (profile_id !== auth.profile.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed })
      .eq("id", profile_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[invite/patch] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
