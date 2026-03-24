"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentConfigCard } from "./agent-config-card";
import { OpeningHoursEditor } from "@/components/settings/opening-hours-editor";
import type { Restaurant, Order, OrderItem } from "@/lib/supabase/types";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RestaurantTabsProps {
  restaurant: Restaurant;
  orders: Order[];
  menus: { name: string; menu_items: { name: string; price: number; is_available: boolean }[] }[];
  logs: { id: string; event_type: string; error_message: string | null; created_at: string; conversation_id: string | null; payload: Record<string, unknown> | null }[];
}

export function RestaurantTabs({ restaurant, orders, menus, logs }: RestaurantTabsProps) {
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
      </motion.div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({
  orders,
  menus,
  restaurant,
}: {
  orders: Order[];
  menus: RestaurantTabsProps["menus"];
  restaurant: Restaurant;
}) {
  const totalItems = menus.reduce((s, m) => s + m.menu_items.length, 0);
  const todayRevenue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card p-4 text-center">
            <p className="font-heading text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </Card>
          <Card className="shadow-card p-4 text-center">
            <p className="font-heading text-2xl font-bold">{todayRevenue.toFixed(0)}€</p>
            <p className="text-xs text-muted-foreground">Revenus</p>
          </Card>
          <Card className="shadow-card p-4 text-center">
            <p className="font-heading text-2xl font-bold">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Articles au menu</p>
          </Card>
        </div>

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

      <div className="space-y-6">
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

        <AgentConfigCard restaurantId={restaurant.id} agentId={restaurant.agent_id} />
      </div>
    </div>
  );
}

// ── Edit Tab ──

function EditTab({ restaurant }: { restaurant: Restaurant }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: restaurant.name,
    owner_name: restaurant.owner_name || "",
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    whatsapp_phone: restaurant.whatsapp_phone || "",
    telnyx_phone: restaurant.telnyx_phone || "",
    agent_id: restaurant.agent_id || "",
  });
  const [openingHours, setOpeningHours] = useState(restaurant.opening_hours || {});

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

// ── Menu Tab ──

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

// ── Orders Tab ──

function OrdersTab({ orders }: { orders: Order[] }) {
  return (
    <div className="space-y-2">
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune commande récente</p>
      ) : (
        orders.map((order) => (
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

// ── Logs Tab ──

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
