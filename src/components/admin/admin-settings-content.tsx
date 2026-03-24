"use client";

import { Check, X, Mail, Database, Cpu, Users, ShoppingBag, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminSettingsContentProps {
  stats: { restaurants: number; orders: number; users: number };
  health: Record<string, { ok: boolean; detail?: string }>;
  admins: { id: string; email: string; full_name: string; created_at: string }[];
}

const healthLabels: Record<string, string> = {
  supabase_url: "Supabase URL",
  supabase_anon: "Supabase Anon Key",
  supabase_service: "Supabase Service Key",
  elevenlabs_key: "ElevenLabs API Key",
  elevenlabs_webhook: "ElevenLabs Webhook Secret",
  database: "Base de données",
};

export function AdminSettingsContent({ stats, health, admins }: AdminSettingsContentProps) {
  const allHealthy = Object.values(health).every((c) => c.ok);

  return (
    <div className="space-y-6">
      {/* Stats système */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card p-4 text-center">
          <Store className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="font-heading text-2xl font-bold">{stats.restaurants}</p>
          <p className="text-xs text-muted-foreground">Restaurants</p>
        </Card>
        <Card className="shadow-card p-4 text-center">
          <ShoppingBag className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="font-heading text-2xl font-bold">{stats.orders}</p>
          <p className="text-xs text-muted-foreground">Commandes totales</p>
        </Card>
        <Card className="shadow-card p-4 text-center">
          <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="font-heading text-2xl font-bold">{stats.users}</p>
          <p className="text-xs text-muted-foreground">Utilisateurs</p>
        </Card>
      </div>

      {/* Health check */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base">Santé du système</CardTitle>
            <Badge className={allHealthy ? "bg-green/10 text-green border-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
              {allHealthy ? "Healthy" : "Dégradé"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(health).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {check.ok ? (
                    <Check className="w-4 h-4 text-green" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">{healthLabels[key] || key}</span>
                </div>
                {check.detail && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {check.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intégrations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Intégrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Supabase</span>
            </div>
            <Badge className="bg-green/10 text-green border-green/20">Connecté</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">ElevenLabs</span>
            </div>
            <Badge className={health.elevenlabs_key?.ok ? "bg-green/10 text-green border-green/20" : "bg-muted text-muted-foreground"}>
              {health.elevenlabs_key?.ok ? "Configuré" : "Non configuré"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Telnyx</span>
            </div>
            <Badge variant="outline" className="text-muted-foreground">Bientôt</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Contact support</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="mailto:info@voxena.pro"
            className="flex items-center gap-2 text-sm text-violet hover:underline"
          >
            <Mail className="w-4 h-4" />
            info@voxena.pro
          </a>
        </CardContent>
      </Card>

      {/* Admins */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Administrateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun administrateur</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{admin.full_name}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Admin</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
