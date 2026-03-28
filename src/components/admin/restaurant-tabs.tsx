"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  Search,
  CreditCard,
  Pause,
  Play,
  XCircle,
  Receipt,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AgentConfigCard } from "./agent-config-card";
import { OnboardingChecklist } from "./onboarding-checklist";
import { SubscriptionBadge } from "./subscription-badge";
import { OpeningHoursEditor } from "@/components/settings/opening-hours-editor";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { Restaurant, Order, OrderItem, UsageRecord } from "@/lib/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RestaurantTabsProps {
  restaurant: Restaurant;
  orders: Order[];
  menus: { name: string; menu_items: { name: string; price: number; is_available: boolean }[] }[];
  logs: { id: string; event_type: string; error_message: string | null; created_at: string; conversation_id: string | null; payload: Record<string, unknown> | null }[];
  usageRecords: UsageRecord[];
}

export function RestaurantTabs({ restaurant, orders, menus, logs, usageRecords }: RestaurantTabsProps) {
  const [tab, setTab] = useState("overview");

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="edit">Modifier</TabsTrigger>
          <TabsTrigger value="menu">
            Menu
            <span className="ml-1 text-xs opacity-60">{menus.length}</span>
          </TabsTrigger>
          <TabsTrigger value="orders">
            Commandes
            <span className="ml-1 text-xs opacity-60">{orders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="logs">
            Logs
            <span className="ml-1 text-xs opacity-60">{logs.length}</span>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Facturation
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "overview" && <OverviewTab orders={orders} menus={menus} restaurant={restaurant} />}
        {tab === "edit" && <EditTab restaurant={restaurant} />}
        {tab === "menu" && <MenuTab menus={menus} />}
        {tab === "orders" && <OrdersTab orders={orders} />}
        {tab === "logs" && <LogsTab logs={logs} />}
        {tab === "billing" && <BillingTab restaurant={restaurant} usageRecords={usageRecords} orders={orders} />}
      </motion.div>
    </div>
  );
}

// \u2500\u2500 Overview Tab \u2500\u2500

function OverviewTab({
  orders,
  menus,
  restaurant,
}: {
  orders: Order[];
  menus: RestaurantTabsProps["menus"];
  restaurant: Restaurant;
}) {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
  const totalItems = menus.reduce((s, m) => s + m.menu_items.length, 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  // Données onboarding
  const hasMenu = menus.length > 0 && menus.some((m) => m.menu_items.length > 0);
  const onboardingData = {
    hasPhone: !!restaurant.phone,
    hasMenu,
    hasAgentId: !!restaurant.agent_id,
    hasWhatsApp: !!restaurant.whatsapp_phone,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card p-4 text-center">
            <p className="font-heading text-2xl font-bold">{todayOrders.length}</p>
            <p className="text-xs text-muted-foreground">Commandes aujourd&apos;hui</p>
          </Card>
          <Card className="shadow-card p-4 text-center">
            <p className="font-heading text-2xl font-bold">{todayRevenue.toFixed(0)}€</p>
            <p className="text-xs text-muted-foreground">Revenus aujourd&apos;hui</p>
          </Card>
          <Card className="shadow-card p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  restaurant.agent_status === "active"
                    ? "bg-green"
                    : restaurant.agent_status === "error"
                    ? "bg-red-500"
                    : "bg-amber-500"
                }`}
              />
              <p className="font-heading text-lg font-bold capitalize">{restaurant.agent_status}</p>
            </div>
            <p className="text-xs text-muted-foreground">Statut agent</p>
          </Card>
        </div>

        {/* Dernières commandes */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dernières commandes</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune commande</p>
            ) : (
              <div className="divide-y divide-border/60">
                {orders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{order.customer_name || "Client"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(order.items as OrderItem[]).length} article{(order.items as OrderItem[]).length > 1 ? "s" : ""} ·{" "}
                        {format(new Date(order.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.total_amount != null && (
                        <span className="font-mono text-sm font-bold">{Number(order.total_amount).toFixed(0)}€</span>
                      )}
                      <OrderStatusBadge status={order.status} orderType={order.order_type} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Informations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Informations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {restaurant.owner_name && <p>{restaurant.owner_name}</p>}
            {restaurant.phone && <p>{restaurant.phone}</p>}
            {restaurant.address && <p className="text-muted-foreground">{restaurant.address}</p>}
            {restaurant.telnyx_phone && (
              <>
                <Separator />
                <p className="font-mono text-xs">Telnyx : {restaurant.telnyx_phone}</p>
              </>
            )}
            {restaurant.whatsapp_phone && (
              <p className="text-xs text-muted-foreground">WhatsApp : {restaurant.whatsapp_phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Checklist onboarding */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingChecklist restaurant={onboardingData} />
          </CardContent>
        </Card>

        {/* Stats menu */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Menu</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{menus.length} catégorie{menus.length > 1 ? "s" : ""} · {totalItems} article{totalItems > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <AgentConfigCard restaurantId={restaurant.id} agentId={restaurant.agent_id} />
      </div>
    </div>
  );
}

// \u2500\u2500 Edit Tab \u2500\u2500

function EditTab({ restaurant }: { restaurant: Restaurant }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: restaurant.name,
    owner_name: restaurant.owner_name || "",
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    whatsapp_phone: restaurant.whatsapp_phone || "",
    whatsapp_phone_id: restaurant.whatsapp_phone_id || "",
    telnyx_phone: restaurant.telnyx_phone || "",
    agent_id: restaurant.agent_id || "",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [openingHours, setOpeningHours] = useState<any>(restaurant.opening_hours || {});

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, ...form, opening_hours: openingHours }),
    });
    if (res.ok) {
      toast.success("Restaurant mis à jour");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm font-medium">Informations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du restaurant</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Propriétaire</Label>
              <Input value={form.owner_name} onChange={(e) => handleChange("owner_name", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm font-medium">Contact & Téléphonie</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input type="tel" value={form.whatsapp_phone} onChange={(e) => handleChange("whatsapp_phone", e.target.value)} placeholder="+32..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Phone ID</Label>
            <Input value={form.whatsapp_phone_id} onChange={(e) => handleChange("whatsapp_phone_id", e.target.value)} placeholder="ID téléphone WhatsApp Business API" className="font-mono" />
            <p className="text-xs text-muted-foreground">Identifiant du téléphone WhatsApp Business API</p>
          </div>
          <div className="space-y-2">
            <Label>Numéro Telnyx (commandes)</Label>
            <Input type="tel" value={form.telnyx_phone} onChange={(e) => handleChange("telnyx_phone", e.target.value)} placeholder="+32..." className="font-mono" />
            <p className="text-xs text-muted-foreground">Numéro dédié pour les commandes vocales de ce restaurant</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm font-medium">Agent vocal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agent ID (ElevenLabs)</Label>
            <Input value={form.agent_id} onChange={(e) => handleChange("agent_id", e.target.value)} className="font-mono" placeholder="ID de l'agent ElevenLabs" />
          </div>
          {form.agent_id && (
            <AgentConfigCard restaurantId={restaurant.id} agentId={form.agent_id} />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-sm font-medium">Horaires d&apos;ouverture</CardTitle></CardHeader>
        <CardContent>
          <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Enregistrer
      </Button>
    </form>
  );
}

// \u2500\u2500 Menu Tab \u2500\u2500

function MenuTab({ menus }: { menus: RestaurantTabsProps["menus"] }) {
  return (
    <div className="space-y-4">
      {menus.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun menu configuré</p>
      ) : (
        menus.map((menu, i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">{menu.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{menu.menu_items.length} articles</Badge>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {menu.menu_items.map((item, j) => (
                <div key={j} className="flex items-center justify-between py-1.5 text-sm">
                  <span className={!item.is_available ? "text-muted-foreground line-through" : ""}>{item.name}</span>
                  <span className="font-mono text-xs">{Number(item.price).toFixed(2)}€</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// \u2500\u2500 Orders Tab \u2500\u2500

function OrdersTab({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter((o) => {
    // Filtre texte
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = o.customer_name?.toLowerCase().includes(q);
      const matchPhone = o.customer_phone?.includes(q);
      const matchItems = (o.items as OrderItem[]).some((i) => i.name.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchItems) return false;
    }
    // Filtre statut
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  const statuses = ["all", "nouvelle", "en_preparation", "prete", "livree", "recuperee", "annulee"];
  const statusLabels: Record<string, string> = {
    all: "Toutes",
    nouvelle: "Nouvelle",
    en_preparation: "En cuisine",
    prete: "Prête",
    livree: "Livrée",
    recuperee: "Récupérée",
    annulee: "Annulée",
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client, téléphone, article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {statusLabels[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filteredOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune commande trouvée</p>
      ) : (
        filteredOrders.map((order) => (
          <Card key={order.id} className="shadow-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{order.customer_name || "Client"}</span>
                  <OrderStatusBadge status={order.status} orderType={order.order_type} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(order.items as OrderItem[]).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(order.created_at), "d MMM à HH:mm", { locale: fr })}
                  {order.customer_phone && ` · ${order.customer_phone}`}
                </p>
              </div>
              {order.total_amount != null && (
                <span className="font-mono text-base font-bold">{Number(order.total_amount).toFixed(0)}€</span>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// \u2500\u2500 Logs Tab \u2500\u2500

function LogsTab({ logs }: { logs: RestaurantTabsProps["logs"] }) {
  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun log</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
            <Badge
              variant="outline"
              className={`text-[9px] font-mono mt-0.5 ${
                log.event_type === "error" ? "text-red-500 border-red-500/20" : ""
              }`}
            >
              {log.event_type}
            </Badge>
            <div className="flex-1 min-w-0">
              {log.error_message && <p className="text-xs text-red-500">{log.error_message}</p>}
              {log.conversation_id && (
                <p className="text-[11px] text-muted-foreground font-mono truncate">conv: {log.conversation_id}</p>
              )}
              {log.payload && (
                <details className="mt-1">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer">Payload</summary>
                  <pre className="mt-1 p-1.5 bg-muted rounded text-[10px] font-mono overflow-x-auto max-h-32">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </details>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {format(new Date(log.created_at), "d MMM HH:mm", { locale: fr })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// \u2500\u2500 Billing Tab \u2500\u2500

function BillingTab({
  restaurant,
  usageRecords,
  orders,
}: {
  restaurant: Restaurant;
  usageRecords: UsageRecord[];
  orders: Order[];
}) {
  const [loading, setLoading] = useState(false);
  const [billingNotes, setBillingNotes] = useState(restaurant.billing_notes || "");

  // Mois courant
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentUsage = usageRecords.find((u) => u.month === currentMonth);

  // Revenus générés ce mois (commandes du restaurant)
  const monthOrders = orders.filter((o) => o.created_at.startsWith(currentMonth));
  const monthRevenue = monthOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  // Rentabilité : revenus abonnement vs co\u00fbt usage
  const subscriptionAmount = restaurant.subscription_amount || 0;
  const usageCost = currentUsage?.total_cost || 0;
  const profit = subscriptionAmount - usageCost;

  // Actions abonnement
  async function handleSubscriptionAction(action: "pause" | "resume" | "cancel") {
    const confirmMessages: Record<string, string> = {
      pause: "Mettre l'abonnement en pause ?",
      resume: "Réactiver l'abonnement ?",
      cancel: "Résilier l'abonnement ? Cette action est irréversible.",
    };
    if (!confirm(confirmMessages[action])) return;

    setLoading(true);
    const statusMap: Record<string, string> = {
      pause: "paused",
      resume: "active",
      cancel: "cancelled",
    };

    const body: Record<string, unknown> = {
      id: restaurant.id,
      subscription_status: statusMap[action],
    };
    if (action === "cancel") {
      body.cancelled_at = new Date().toISOString();
    }

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(
        action === "pause"
          ? "Abonnement mis en pause"
          : action === "resume"
          ? "Abonnement réactivé"
          : "Abonnement résilié"
      );
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setLoading(false);
  }

  // Sauvegarder notes de facturation
  async function handleSaveNotes() {
    setLoading(true);
    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, billing_notes: billingNotes }),
    });
    if (res.ok) {
      toast.success("Notes sauvegardées");
    } else {
      toast.error("Erreur");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Statut abonnement */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Abonnement</CardTitle>
            <SubscriptionBadge status={restaurant.subscription_status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Plan</p>
              <p className="font-medium">{restaurant.subscription_plan || "Non défini"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Montant mensuel</p>
              <p className="font-mono font-bold">{subscriptionAmount.toFixed(0)}€</p>
            </div>
            {restaurant.subscription_started_at && (
              <div>
                <p className="text-muted-foreground text-xs">Début</p>
                <p className="text-sm">{format(new Date(restaurant.subscription_started_at), "d MMMM yyyy", { locale: fr })}</p>
              </div>
            )}
            {restaurant.trial_ends_at && (
              <div>
                <p className="text-muted-foreground text-xs">Fin d&apos;essai</p>
                <p className="text-sm">{format(new Date(restaurant.trial_ends_at), "d MMMM yyyy", { locale: fr })}</p>
              </div>
            )}
            {restaurant.cancelled_at && (
              <div>
                <p className="text-muted-foreground text-xs">Résilié le</p>
                <p className="text-sm text-red-500">{format(new Date(restaurant.cancelled_at), "d MMMM yyyy", { locale: fr })}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Boutons gestion abonnement */}
          <div className="flex gap-2">
            {restaurant.subscription_status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleSubscriptionAction("pause")}
                disabled={loading}
              >
                <Pause className="w-3.5 h-3.5" />
                Mettre en pause
              </Button>
            )}
            {restaurant.subscription_status === "paused" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleSubscriptionAction("resume")}
                disabled={loading}
              >
                <Play className="w-3.5 h-3.5" />
                Réactiver
              </Button>
            )}
            {restaurant.subscription_status &&
              restaurant.subscription_status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleSubscriptionAction("cancel")}
                  disabled={loading}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Résilier
                </Button>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Usage du mois courant */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Usage du mois ({currentMonth})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUsage ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-heading text-xl font-bold">{currentUsage.total_minutes.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{currentUsage.call_count}</p>
                <p className="text-xs text-muted-foreground">Appels</p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold font-mono">{currentUsage.total_cost.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Co\u00fbt</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée d&apos;usage pour ce mois
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rentabilité */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Rentabilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-heading text-xl font-bold font-mono text-green">{subscriptionAmount.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">Abonnement</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold font-mono text-red-500">{usageCost.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">Co\u00fbt usage</p>
            </div>
            <div>
              <p className={`font-heading text-xl font-bold font-mono ${profit >= 0 ? "text-green" : "text-red-500"}`}>
                {profit >= 0 ? "+" : ""}{profit.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground">Marge</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {monthOrders.length} commandes ce mois · {monthRevenue.toFixed(0)}€ de CA généré pour le restaurant
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historique usage */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique d&apos;usage</CardTitle>
        </CardHeader>
        <CardContent>
          {usageRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun historique d&apos;usage disponible
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Mois</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Appels</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Minutes</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Co\u00fbt</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRecords.map((record) => (
                    <tr key={record.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{record.month}</td>
                      <td className="py-2 text-right font-mono">{record.call_count}</td>
                      <td className="py-2 text-right font-mono">{record.total_minutes.toFixed(1)}</td>
                      <td className="py-2 text-right font-mono">{record.total_cost.toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes de facturation */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notes de facturation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={billingNotes}
            onChange={(e) => setBillingNotes(e.target.value)}
            placeholder="Notes internes sur la facturation de ce restaurant..."
            rows={4}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveNotes}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Sauvegarder les notes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
