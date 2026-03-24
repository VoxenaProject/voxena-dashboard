import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paramètres globaux de la plateforme Voxena
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">ElevenLabs</p>
                <p className="text-xs text-muted-foreground">
                  Agent vocal IA — webhooks et server tools
                </p>
              </div>
              <Badge className="bg-green/10 text-green border-green/20">
                Connecté
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Supabase</p>
                <p className="text-xs text-muted-foreground">
                  Base de données, auth et realtime
                </p>
              </div>
              <Badge className="bg-green/10 text-green border-green/20">
                Connecté
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">WhatsApp Business</p>
                <p className="text-xs text-muted-foreground">
                  Confirmations de commande par message
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                Non configuré
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Environnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plateforme</span>
                <span>Vercel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Domaine</span>
                <span>app.getvoxena.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
