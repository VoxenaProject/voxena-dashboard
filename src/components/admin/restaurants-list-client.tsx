"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Store, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubscriptionBadge } from "./subscription-badge";
import { OnboardingProgressBar } from "./onboarding-checklist";
import type { Restaurant } from "@/lib/supabase/types";

// Restaurant enrichi avec les données calculées côté serveur
interface EnrichedRestaurant extends Restaurant {
  todayOrders: number;
  hasPhone: boolean;
  hasMenu: boolean;
  hasAgentId: boolean;
  hasWhatsApp: boolean;
}

type FilterKey = "all" | "active" | "paused" | "error" | "setup";

const filterConfig: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Agents actifs" },
  { key: "paused", label: "En pause" },
  { key: "error", label: "En erreur" },
  { key: "setup", label: "Setup incomplet" },
];

export function RestaurantsListClient({
  restaurants,
}: {
  restaurants: EnrichedRestaurant[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  // Stats
  const stats = useMemo(() => {
    const active = restaurants.filter((r) => r.agent_status === "active").length;
    const paused = restaurants.filter((r) => r.agent_status === "paused").length;
    const error = restaurants.filter((r) => r.agent_status === "error").length;
    return { active, paused, error };
  }, [restaurants]);

  // Filtrage
  const filtered = useMemo(() => {
    let result = restaurants;

    // Filtre par recherche texte
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.owner_name && r.owner_name.toLowerCase().includes(q)) ||
          (r.address && r.address.toLowerCase().includes(q)) ||
          (r.phone && r.phone.includes(q))
      );
    }

    // Filtre par statut
    switch (filter) {
      case "active":
        result = result.filter((r) => r.agent_status === "active");
        break;
      case "paused":
        result = result.filter((r) => r.agent_status === "paused");
        break;
      case "error":
        result = result.filter((r) => r.agent_status === "error");
        break;
      case "setup":
        result = result.filter(
          (r) => !r.hasPhone || !r.hasMenu || !r.hasAgentId || !r.hasWhatsApp
        );
        break;
    }

    return result;
  }, [restaurants, search, filter]);

  return (
    <div className="p-6 lg:p-8" style={{ animation: "fade-in 0.35s ease-out" }}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Stats chips */}
      <div className="flex items-center gap-3 mb-4">
        <Badge variant="outline" className="bg-green/8 text-green border-green/20 text-xs px-3 py-1">
          {stats.active} actif{stats.active > 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="bg-amber-500/8 text-amber-600 border-amber-500/20 text-xs px-3 py-1">
          {stats.paused} en pause
        </Badge>
        <Badge variant="outline" className="bg-red-500/8 text-red-500 border-red-500/20 text-xs px-3 py-1">
          {stats.error} en erreur
        </Badge>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, propriétaire, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterConfig.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des restaurants */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Aucun restaurant trouvé</p>
            <p className="text-xs mt-1">
              Essayez de modifier vos filtres ou votre recherche.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resto) => (
            <Link key={resto.id} href={`/admin/restaurants/${resto.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  {/* Nom + badges statut */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading font-bold text-base leading-tight pr-2">
                      {resto.name}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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

                  {/* Infos du restaurant */}
                  <div className="space-y-1 text-sm text-muted-foreground mb-3">
                    {resto.owner_name && <p>{resto.owner_name}</p>}
                    {resto.phone && <p>{resto.phone}</p>}
                    {resto.address && (
                      <p className="truncate">{resto.address}</p>
                    )}
                  </div>

                  {/* Badges abonnement + commandes du jour */}
                  <div className="flex items-center gap-2 mb-3">
                    <SubscriptionBadge status={resto.subscription_status} />
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{resto.todayOrders} aujourd&apos;hui</span>
                    </div>
                  </div>

                  {/* Barre onboarding */}
                  <OnboardingProgressBar restaurant={resto} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
