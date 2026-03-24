"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
        .select("role")
        .eq("id", user.id)
        .single();

      router.push(profile?.role === "admin" ? "/admin" : "/");
    }
    router.refresh();
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
              Connectez-vous à votre espace restaurant
            </p>
          </div>

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

          <p className="text-center text-[11px] text-white/25 mt-6">
            Propulsé par Voxena — Agent vocal IA
          </p>
        </div>
      </motion.div>
    </div>
  );
}
