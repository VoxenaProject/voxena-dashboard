"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

    // Récupérer le rôle pour rediriger
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
    <div className="min-h-screen flex items-center justify-center bg-navy-deep px-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          {/* Logo Voxena */}
          <div className="flex justify-center mb-2">
            <svg
              width="48"
              height="48"
              viewBox="543 -20 486 570"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="logo-grad"
                  x1="785"
                  y1="0"
                  x2="785"
                  y2="528"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#74a3ff" />
                  <stop offset="0.5" stopColor="#4237c4" />
                  <stop offset="1" stopColor="#3e3183" />
                </linearGradient>
              </defs>
              <path
                fill="url(#logo-grad)"
                d="M949.9,0l-161.4,299.5L625.3,0h324.6ZM563.6,125.3l-1.1,1.9v234l223.1,167.1-222-403ZM785.6,528.3l223.1-167.1V127.2s-1.1-1.9-1.1-1.9l-222,403Z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Voxena Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous à votre espace
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@restaurant.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
