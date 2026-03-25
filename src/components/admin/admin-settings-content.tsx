"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Cpu,
  Users,
  ShoppingBag,
  Store,
  Mail,
  Shield,
  Activity,
  Link2,
  BookOpen,
  Info,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Types alignés avec le health check API
interface HealthCheckResult {
  status: "ok" | "error" | "missing";
  latency_ms?: number;
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthCheckResult;
    env_supabase_url: HealthCheckResult;
    env_supabase_anon: HealthCheckResult;
    env_service_role: HealthCheckResult;
    env_elevenlabs_key: HealthCheckResult;
    env_elevenlabs_secret: HealthCheckResult;
  };
  timestamp: string;
}

interface AdminSettingsContentProps {
  stats: { restaurants: number; orders: number; users: number };
  health: HealthData;
  admins: { id: string; email: string; full_name: string; created_at: string }[];
}

// Labels lisibles pour chaque check
const checkLabels: Record<string, string> = {
  database: "Base de données",
  env_supabase_url: "Supabase URL",
  env_supabase_anon: "Supabase Anon Key",
  env_service_role: "Service Role Key",
  env_elevenlabs_key: "ElevenLabs API Key",
  env_elevenlabs_secret: "ElevenLabs Webhook Secret",
};

// Couleurs et labels pour le statut global
const statusConfig = {
  healthy: {
    label: "Opérationnel",
    color: "bg-green",
    ringColor: "ring-green/20",
    badgeClass: "bg-green/10 text-green border-green/20",
  },
  degraded: {
    label: "Dégradé",
    color: "bg-amber-500",
    ringColor: "ring-amber-500/20",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  unhealthy: {
    label: "Hors service",
    color: "bg-red-500",
    ringColor: "ring-red-500/20",
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

// Animation variants pour les sections
const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export function AdminSettingsContent({
  stats,
  health: initialHealth,
  admins,
}: AdminSettingsContentProps) {
  const [health, setHealth] = useState<HealthData>(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date(initialHealth.timestamp));

  // Rafraîchir le health check via l'API
  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data: HealthData = await res.json();
      setHealth(data);
      setLastRefresh(new Date(data.timestamp));
    } catch {
      // En cas d'erreur réseau, marquer comme unhealthy
      setHealth((prev) => ({ ...prev, status: "unhealthy" }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Calculer le temps depuis la dernière vérification
  const secondsAgo = Math.max(0, Math.round((Date.now() - lastRefresh.getTime()) / 1000));
  const timeAgoText =
    secondsAgo < 5
      ? "à l'instant"
      : secondsAgo < 60
        ? `il y a ${secondsAgo}s`
        : `il y a ${Math.round(secondsAgo / 60)} min`;

  const currentStatus = statusConfig[health.status];

  // On utilise le check pour savoir si Supabase est configuré
  const supabaseConfigured = health.checks.env_supabase_url.status === "ok";

  return (
    <div className="space-y-6">
      {/* ───── Section 1 : Santé du système ───── */}
      <motion.div
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="font-heading text-base">
                  Santé du système
                </CardTitle>
              </div>
              <Badge className={currentStatus.badgeClass}>
                {currentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Indicateur principal */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative flex items-center justify-center">
                <span
                  className={`block w-5 h-5 rounded-full ${currentStatus.color} ring-4 ${currentStatus.ringColor}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{currentStatus.label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Dernière vérification : {timeAgoText}
                </p>
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshHealth}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Vérifier
                </Button>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Liste des checks */}
            <div className="space-y-2.5">
              {Object.entries(health.checks).map(([key, check]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    {check.status === "ok" ? (
                      <CheckCircle className="w-4 h-4 text-green flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm">
                      {checkLabels[key] ?? key}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.latency_ms !== undefined && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {check.latency_ms} ms
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        check.status === "ok"
                          ? "text-green border-green/20 text-[10px]"
                          : "text-red-500 border-red-500/20 text-[10px]"
                      }
                    >
                      {check.status === "ok"
                        ? "OK"
                        : check.status === "missing"
                          ? "Manquant"
                          : "Erreur"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ───── Section 2 : Intégrations ───── */}
      <motion.div
        custom={1}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="font-heading text-base">
                Intégrations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supabase */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Supabase</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {supabaseConfigured
                      ? "https://••••••••.supabase.co"
                      : "Non configuré"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`block w-2 h-2 rounded-full ${
                    health.checks.database.status === "ok"
                      ? "bg-green"
                      : "bg-red-500"
                  }`}
                />
                <Badge
                  className={
                    health.checks.database.status === "ok"
                      ? "bg-green/10 text-green border-green/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                  }
                >
                  {health.checks.database.status === "ok"
                    ? "Connecté"
                    : "Déconnecté"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* ElevenLabs API */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">ElevenLabs — API Key</p>
                  <p className="text-xs text-muted-foreground">
                    Agent vocal IA
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`block w-2 h-2 rounded-full ${
                    health.checks.env_elevenlabs_key.status === "ok"
                      ? "bg-green"
                      : "bg-red-500"
                  }`}
                />
                <Badge
                  className={
                    health.checks.env_elevenlabs_key.status === "ok"
                      ? "bg-green/10 text-green border-green/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {health.checks.env_elevenlabs_key.status === "ok"
                    ? "Configuré"
                    : "Non configuré"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* ElevenLabs Webhook */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    ElevenLabs — Webhook Secret
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Validation des callbacks post-call
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`block w-2 h-2 rounded-full ${
                    health.checks.env_elevenlabs_secret.status === "ok"
                      ? "bg-green"
                      : "bg-red-500"
                  }`}
                />
                <Badge
                  className={
                    health.checks.env_elevenlabs_secret.status === "ok"
                      ? "bg-green/10 text-green border-green/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {health.checks.env_elevenlabs_secret.status === "ok"
                    ? "Configuré"
                    : "Non configuré"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ───── Section 3 : Statistiques système ───── */}
      <motion.div
        custom={2}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet/10 mb-3">
                <Store className="w-5 h-5 text-violet" />
              </div>
              <p className="font-heading text-3xl font-bold tracking-tight">
                {stats.restaurants}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Restaurants</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue/10 mb-3">
                <ShoppingBag className="w-5 h-5 text-blue" />
              </div>
              <p className="font-heading text-3xl font-bold tracking-tight">
                {stats.orders}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Commandes totales
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green/10 mb-3">
                <Users className="w-5 h-5 text-green" />
              </div>
              <p className="font-heading text-3xl font-bold tracking-tight">
                {stats.users}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Utilisateurs</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ───── Section 4 : Administrateurs ───── */}
      <motion.div
        custom={3}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="font-heading text-base">
                Administrateurs
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {admins.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun administrateur trouvé
              </p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin, idx) => (
                  <div key={admin.id}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet/10 text-violet text-xs font-bold uppercase">
                          {admin.full_name
                            ? admin.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                            : "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {admin.full_name || "Sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-violet/10 text-violet border-violet/20 text-[10px]">
                          Admin
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Depuis le{" "}
                          {format(new Date(admin.created_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                    {idx < admins.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ───── Section 5 : Support ───── */}
      <motion.div
        custom={4}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="font-heading text-base">Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Contact support</p>
                  <a
                    href="mailto:info@voxena.pro"
                    className="text-xs text-violet hover:underline"
                  >
                    info@voxena.pro
                  </a>
                </div>
              </div>
            </div>

            <Separator />

            {/* Documentation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Documentation</p>
                  <p className="text-xs text-muted-foreground">
                    Bientôt disponible
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                Bientôt
              </Badge>
            </div>

            <Separator />

            {/* Version */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Version</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    voxena-dashboard v0.1.0
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                Next.js 16
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
