"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PasswordStrength } from "@/components/ui/password-strength";

// Modes d'affichage de la page login
type LoginMode = "login" | "forgot" | "reset";

// Wrapper avec Suspense pour useSearchParams (requis par Next.js 15+)
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // État pour le formulaire "mot de passe oublié"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // État pour le formulaire de réinitialisation
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Détecter le paramètre ?reset=true pour afficher le formulaire de réinitialisation
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setMode("reset");
    }
  }, [searchParams]);

  // Connexion classique
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        router.push("/admin");
      } else if (profile && !profile.onboarding_completed) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    }
    router.refresh();
  }

  // Envoi du lien de réinitialisation
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: "https://app.getvoxena.com/login?reset=true",
    });

    if (error) {
      setForgotError("Aucun compte trouvé avec cet email");
      setForgotLoading(false);
      return;
    }

    setForgotSuccess(true);
    setForgotLoading(false);
  }

  // Réinitialisation du mot de passe
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    if (newPassword.length < 8) {
      setResetError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Les mots de passe ne correspondent pas");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setResetError("Erreur lors de la réinitialisation : " + error.message);
      setResetLoading(false);
      return;
    }

    setResetSuccess(true);
    setResetLoading(false);
  }

  // Retour au mode connexion
  function backToLogin() {
    setMode("login");
    setForgotEmail("");
    setForgotSuccess(false);
    setForgotError("");
    setResetError("");
    setResetSuccess(false);
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fond animé */}
      <div
        className="absolute inset-0 bg-navy-deep"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(66, 55, 196, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(116, 163, 255, 0.1) 0%, transparent 50%), #080B1F",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card login */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="rounded-2xl p-8 shadow-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex justify-center mb-5"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-violet)" }}>
                <svg
                  width="32"
                  height="32"
                  viewBox="543 -20 486 570"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="white"
                    d="M949.9,0l-161.4,299.5L625.3,0h324.6ZM563.6,125.3l-1.1,1.9v234l223.1,167.1-222-403ZM785.6,528.3l223.1-167.1V127.2s-1.1-1.9-1.1-1.9l-222,403Z"
                  />
                </svg>
              </div>
            </motion.div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
              Voxena
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {mode === "login" && "Connectez-vous à votre espace restaurant"}
              {mode === "forgot" && "Réinitialisation du mot de passe"}
              {mode === "reset" && "Nouveau mot de passe"}
            </p>
          </div>

          {/* Contenu animé selon le mode */}
          <AnimatePresence mode="wait">

            {/* ── MODE CONNEXION ── */}
            {mode === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70 text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@restaurant.be"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/70 text-sm">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                    />
                    {/* Lien mot de passe oublié */}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotEmail(email); // Pré-remplir avec l'email déjà saisi
                      }}
                      className="text-xs text-white/40 hover:text-white/60 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm text-red-400 text-center bg-red-500/10 rounded-lg py-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    style={{ background: "var(--gradient-violet)" }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── MODE MOT DE PASSE OUBLIÉ ── */}
            {mode === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {forgotSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/80">
                      Un email de réinitialisation a été envoyé à{" "}
                      <span className="font-medium text-white">{forgotEmail}</span>
                    </p>
                    <p className="text-xs text-white/40">
                      Vérifiez votre boîte de réception et vos spams
                    </p>
                    <button
                      onClick={backToLogin}
                      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors mx-auto mt-4"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Retour à la connexion
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-white/70 text-sm">
                        Adresse email
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="vous@restaurant.be"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                      />
                    </div>

                    {forgotError && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-red-400 text-center bg-red-500/10 rounded-lg py-2"
                      >
                        {forgotError}
                      </motion.p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-medium"
                      style={{ background: "var(--gradient-violet)" }}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        "Envoyer le lien de réinitialisation"
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={backToLogin}
                      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Retour à la connexion
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── MODE RÉINITIALISATION DU MOT DE PASSE ── */}
            {mode === "reset" && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {resetSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/80">
                      Votre mot de passe a été mis à jour avec succès
                    </p>
                    <Button
                      onClick={backToLogin}
                      className="w-full h-11 font-medium"
                      style={{ background: "var(--gradient-violet)" }}
                    >
                      Se connecter
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password-reset" className="text-white/70 text-sm">
                        Nouveau mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="new-password-reset"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Minimum 8 caractères"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Indicateur de force */}
                      <PasswordStrength password={newPassword} variant="dark" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password-reset" className="text-white/70 text-sm">
                        Confirmer le mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password-reset"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Retapez le mot de passe"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <p className="text-xs text-amber-400">
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                    </div>

                    {resetError && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-red-400 text-center bg-red-500/10 rounded-lg py-2"
                      >
                        {resetError}
                      </motion.p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-medium"
                      style={{ background: "var(--gradient-violet)" }}
                      disabled={resetLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        "Réinitialiser le mot de passe"
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={backToLogin}
                      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Retour à la connexion
                    </button>
                  </form>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          <p className="text-center text-[11px] text-white/25 mt-6">
            Propulsé par Voxena — Agent vocal IA
          </p>
        </div>
      </motion.div>
    </div>
  );
}
