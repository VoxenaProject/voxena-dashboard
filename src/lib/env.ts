/**
 * Valide que les variables d'environnement critiques sont présentes.
 * Appelé au démarrage du serveur.
 */
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const optionalEnvVars = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_WEBHOOK_SECRET",
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(", ")}. Vérifiez votre .env.local`
    );
  }

  // Warnings pour les optionnelles
  for (const key of optionalEnvVars) {
    if (!process.env[key]) {
      console.warn(`[env] ${key} non configuré — certaines fonctionnalités seront désactivées`);
    }
  }
}

// Valider au premier import (build-time + runtime)
validateEnv();
