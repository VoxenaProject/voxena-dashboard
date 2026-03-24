import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ShoppingBag, Euro, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Stats cross-restaurant
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, agent_status");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", `${today}T00:00:00`);

  const { data: errorAgents } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("agent_status", "error");

  const todayOrders = (orders as Order[]) || [];
  const totalRevenue = todayOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue globale de tous les restaurants Voxena
        </p>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Restaurants
            </CardTitle>
            <Store className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">
              {restaurants?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commandes (total)
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
              Revenus cumulés
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
              Agents en erreur
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`font-heading text-3xl font-bold ${
                (errorAgents?.length || 0) > 0 ? "text-destructive" : ""
              }`}
            >
              {errorAgents?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste rapide restaurants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg">
            Restaurants
          </CardTitle>
          <Link
            href="/admin/restaurants"
            className="text-sm text-violet hover:underline"
          >
            Gérer →
          </Link>
        </CardHeader>
        <CardContent>
          {!restaurants?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun restaurant enregistré.{" "}
              <Link
                href="/admin/restaurants/new"
                className="text-violet hover:underline"
              >
                Ajouter le premier
              </Link>
            </p>
          ) : (
            <div className="divide-y">
              {restaurants.map((resto) => {
                const restoOrders = todayOrders.filter(
                  (o) => o.restaurant_id === resto.id
                );
                return (
                  <Link
                    key={resto.id}
                    href={`/admin/restaurants/${resto.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{resto.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {restoOrders.length} commande
                        {restoOrders.length > 1 ? "s" : ""} aujourd&apos;hui
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          resto.agent_status === "active"
                            ? "bg-green"
                            : resto.agent_status === "error"
                            ? "bg-destructive"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground capitalize">
                        {resto.agent_status}
                      </span>
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
