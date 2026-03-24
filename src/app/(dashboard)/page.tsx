import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Euro, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Order, OrderItem } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Récupérer les commandes du jour
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: false });

  const todayOrders = (orders as Order[]) || [];
  const totalRevenue = todayOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );
  const avgValue =
    todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;
  const pendingCount = todayOrders.filter(
    (o) => o.status === "nouvelle"
  ).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de votre activité du jour
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commandes
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">
              {todayOrders.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus
            </CardTitle>
            <Euro className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">
              {totalRevenue.toFixed(0)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Panier moyen
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">
              {avgValue.toFixed(0)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-green">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dernières commandes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">
            Dernières commandes
          </CardTitle>
          <Link
            href="/orders"
            className="text-sm text-violet hover:underline"
          >
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {todayOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune commande aujourd&apos;hui
            </p>
          ) : (
            <div className="divide-y">
              {todayOrders.slice(0, 10).map((order) => {
                const items = (order.items || []) as OrderItem[];
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {order.customer_name || "Client"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} article{items.length > 1 ? "s" : ""}{" "}
                          ·{" "}
                          {formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {order.total_amount != null && (
                        <span className="font-mono text-sm font-bold">
                          {Number(order.total_amount).toFixed(0)}€
                        </span>
                      )}
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
