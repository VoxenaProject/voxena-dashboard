"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, TestTube, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AgentConfigCardProps {
  restaurantId: string;
  agentId: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "https://app.getvoxena.com";

export function AgentConfigCard({ restaurantId, agentId }: AgentConfigCardProps) {
  const [testingMenu, setTestingMenu] = useState(false);
  const [testingOrder, setTestingOrder] = useState(false);
  const [menuOk, setMenuOk] = useState<boolean | null>(null);
  const [orderOk, setOrderOk] = useState<boolean | null>(null);

  const urls = {
    menu: `${BASE_URL}/api/menu?restaurant_id=${restaurantId}`,
    order: `${BASE_URL}/api/orders/create`,
    webhook: `${BASE_URL}/api/webhooks/elevenlabs`,
  };

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast(`${label} copié`);
  }

  async function testMenu() {
    setTestingMenu(true);
    setMenuOk(null);
    try {
      const res = await fetch(`/api/menu?restaurant_id=${restaurantId}`);
      const data = await res.json();
      const hasItems = data.menu?.some((c: { items: unknown[] }) => c.items?.length > 0);
      setMenuOk(res.ok && hasItems);
      if (res.ok && hasItems) {
        toast.success(`Menu OK — ${data.menu.length} catégories`);
      } else {
        toast.error("Menu vide ou erreur");
      }
    } catch {
      setMenuOk(false);
      toast.error("Erreur de connexion");
    }
    setTestingMenu(false);
  }

  async function testOrder() {
    setTestingOrder(true);
    setOrderOk(null);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          customer_name: "Test Voxena",
          customer_phone: "+32 000 00 00 00",
          order_items: "1x Test Pizza",
          order_type: "emporter",
          pickup_time: "99:99",
          special_instructions: "⚠ Commande test — à supprimer",
        }),
      });
      setOrderOk(res.ok);
      if (res.ok) {
        toast.success("Commande test créée — vérifiez le dashboard restaurant");
      } else {
        toast.error("Erreur lors de la création");
      }
    } catch {
      setOrderOk(false);
      toast.error("Erreur de connexion");
    }
    setTestingOrder(false);
  }

  if (!agentId) {
    return (
      <Card className="shadow-card border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm font-medium mb-1">Aucun agent configuré</p>
          <p className="text-xs">
            Renseignez l&apos;Agent ID ElevenLabs dans le formulaire ci-dessus pour voir les instructions de configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-heading text-base flex items-center gap-2">
          Configuration ElevenLabs
          <Badge variant="outline" className="text-[10px] font-mono">
            {agentId}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configurez ces URLs dans les Server Tools de votre agent ElevenLabs :
        </p>

        {/* Server Tool 1 : Menu */}
        <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Server Tool 1 — Lire le menu</p>
            <span className="text-[10px] font-mono text-muted-foreground">GET</span>
          </div>
          <CopyableUrl url={urls.menu} onCopy={() => copyToClipboard(urls.menu, "URL menu")} />
        </div>

        {/* Server Tool 2 : Commande */}
        <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Server Tool 2 — Créer une commande</p>
            <span className="text-[10px] font-mono text-muted-foreground">POST</span>
          </div>
          <CopyableUrl url={urls.order} onCopy={() => copyToClipboard(urls.order, "URL commande")} />
          <details className="mt-2">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
              Voir le body JSON
            </summary>
            <pre className="mt-1 p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto">
{JSON.stringify({
  restaurant_id: restaurantId,
  customer_name: "{{customer_name}}",
  customer_phone: "{{customer_phone}}",
  order_items: "{{items}}",
  order_type: "{{emporter_ou_livraison}}",
  pickup_time: "{{heure_retrait}}",
  delivery_address: "{{adresse_livraison}}",
  special_instructions: "{{instructions}}",
}, null, 2)}
            </pre>
          </details>
        </div>

        {/* Webhook */}
        <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Webhook post-call</p>
            <span className="text-[10px] font-mono text-muted-foreground">POST</span>
          </div>
          <CopyableUrl url={urls.webhook} onCopy={() => copyToClipboard(urls.webhook, "URL webhook")} />
        </div>

        {/* Boutons test */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={testMenu}
            disabled={testingMenu}
          >
            {menuOk === true ? (
              <Check className="w-3.5 h-3.5 text-green" />
            ) : (
              <TestTube className="w-3.5 h-3.5" />
            )}
            {testingMenu ? "Test..." : "Tester le menu"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={testOrder}
            disabled={testingOrder}
          >
            {orderOk === true ? (
              <Check className="w-3.5 h-3.5 text-green" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
            {testingOrder ? "Test..." : "Simuler une commande"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CopyableUrl({ url, onCopy }: { url: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate">
        {url}
      </code>
      <button
        onClick={onCopy}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
