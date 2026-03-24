import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage() {
  const supabase = createServiceClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  const typedRestaurants = (restaurants as Restaurant[]) || [];

  return (
    <div className="p-6 lg:p-8" style={{ animation: "fade-in 0.35s ease-out" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Restaurants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez tous les restaurants connectés à Voxena
          </p>
        </div>
        <Link href="/admin/restaurants/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau restaurant
          </Button>
        </Link>
      </div>

      {typedRestaurants.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">Aucun restaurant</p>
            <p className="text-sm mb-4">
              Ajoutez votre premier restaurant pour commencer.
            </p>
            <Link href="/admin/restaurants/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un restaurant
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedRestaurants.map((resto) => (
            <Link key={resto.id} href={`/admin/restaurants/${resto.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading font-bold text-base">
                      {resto.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          resto.agent_status === "active"
                            ? "bg-green"
                            : resto.agent_status === "error"
                            ? "bg-destructive"
                            : "bg-amber-500"
                        }`}
                      />
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          resto.agent_status === "error"
                            ? "border-destructive/30 text-destructive"
                            : ""
                        }`}
                      >
                        {resto.agent_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {resto.owner_name && <p>{resto.owner_name}</p>}
                    {resto.phone && <p>{resto.phone}</p>}
                    {resto.address && (
                      <p className="truncate">{resto.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
