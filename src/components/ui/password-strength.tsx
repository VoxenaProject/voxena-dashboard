"use client";

import { useMemo } from "react";

// Composant indicateur de force du mot de passe
// Utilisé dans l'onboarding (step 1) et dans les paramètres (section sécurité)

interface PasswordStrengthProps {
  password: string;
  /** Variante visuelle : "dark" pour fond sombre (onboarding), "light" pour fond clair (settings) */
  variant?: "dark" | "light";
}

// Calcul de la force du mot de passe
function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

// Labels en français avec accents
const LABELS: Record<number, string> = {
  0: "",
  1: "Faible",
  2: "Moyen",
  3: "Bon",
  4: "Excellent",
};

// Couleurs par niveau
const BAR_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-amber-500",
  4: "bg-green-500",
};

const LABEL_COLORS_DARK: Record<number, string> = {
  1: "text-red-400",
  2: "text-orange-400",
  3: "text-amber-400",
  4: "text-green-400",
};

const LABEL_COLORS_LIGHT: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-amber-500",
  4: "text-green-600",
};

export function PasswordStrength({ password, variant = "light" }: PasswordStrengthProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  // Ne rien afficher si le champ est vide
  if (!password) return null;

  const labelColors = variant === "dark" ? LABEL_COLORS_DARK : LABEL_COLORS_LIGHT;
  const barBgColor = variant === "dark" ? "bg-white/[0.08]" : "bg-muted";

  return (
    <div className="space-y-1.5">
      {/* Barres de force */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${barBgColor}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                strength >= level ? BAR_COLORS[strength] : "bg-transparent"
              }`}
              style={{ width: strength >= level ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Label */}
      {strength > 0 && (
        <p className={`text-xs font-medium transition-colors duration-300 ${labelColors[strength]}`}>
          {LABELS[strength]}
        </p>
      )}
    </div>
  );
}
