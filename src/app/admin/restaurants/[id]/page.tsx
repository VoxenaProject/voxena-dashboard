import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  MapPin,
  User,
  ShoppingBag,
  Euro,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { RestaurantAdminActions } from "@/components/admin/restaurant-admin-actions";
import type { Restaurant, Order, OrderItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminRestaurantDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: restaurant }, { data: orders }, { data: menus }] =
    await Promise.all([
      supabase.from("restaurants").select("*").eq("id", id).single(),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("menus")
        .select("*, menu_items(*)")
        .eq("restaurant_id", id)
        .order("sort_order", { ascending: true }),
    ]);

  if (!restaurant) notFound();

  const resto = restaurant as Restaurant;
  const typedOrders = (orders as Order[]) || [];
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = typedOrders.filter(
    (o) => o.created_at >= `${today}T00:00:00`
  );
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );
  const totalItems =
    (menus as { menu_items: unknown[] }[])?.reduce(
      (sum, m) => sum + (m.menu_items?.length || 0),
      0
    ) || 0;

  return (
    <div className="p-8">
      <Link
        href="/admin/restaurants"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux restaurants
      </Link>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {resto.name}
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  resto.agent_status === "active"
                    ? "bg-green"
                    : resto.agent_status === "error"
                    ? "bg-destructive"
                    : "bg-amber-500"
                }`}
              />
              <Badge variant="outline" className="text-xs capitalize">
                {resto.agent_status}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Créé le{" "}
            {format(new Date(resto.created_at), "d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <RestaurantAdminActions restaurant={resto} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI du jour */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingBag className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="font-heading text-2xl font-bold">
                  {todayOrders.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Commandes aujourd&apos;hui
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Euro className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="font-heading text-2xl font-bold">
                  {todayRevenue.toFixed(0)}€
                </p>
                <p className="text-xs text-muted-foreground">Revenus</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="font-heading text-2xl font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">
                  Articles au menu
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dernières commandes */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Dernières commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typedOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune commande pour ce restaurant
                </p>
              ) : (
                <div className="divide-y">
                  {typedOrders.slice(0, 10).map((order) => {
                    const items = (order.items || []) as OrderItem[];
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {order.customer_name || "Client"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {items.length} article
                            {items.length > 1 ? "s" : ""} ·{" "}
                            {format(
                              new Date(order.created_at),
                              "d MMM à HH:mm",
                              { locale: fr }
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {order.total_amount != null && (
                            <span className="font-mono text-sm font-bold">
                              {Number(order.total_amount).toFixed(0)}€
                            </span>
                          )}
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar infos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resto.owner_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {resto.owner_name}
                </div>
              )}
              {resto.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {resto.phone}
                </div>
              )}
              {resto.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {resto.address}
                </div>
              )}
              {resto.whatsapp_phone && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    WhatsApp : {resto.whatsapp_phone}
                  </div>
                </>
              )}
              {resto.agent_id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Agent ID
                    </p>
                    <p className="font-mono text-xs break-all">
                      {resto.agent_id}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Menu résumé */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Menu</CardTitle>
            </CardHeader>
            <CardContent>
              {!menus?.length ? (
                <p className="text-sm text-muted-foreground">
                  Aucun menu configuré
                </p>
              ) : (
                <div className="space-y-2">
                  {(menus as { name: string; menu_items: unknown[] }[]).map(
                    (menu, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{menu.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {menu.menu_items?.length || 0} articles
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
