import { createServiceClient } from "@/lib/supabase/server";
import { RestaurantSettings } from "@/components/settings/restaurant-settings";
import type { Restaurant } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createServiceClient();

  // Récupérer le premier restaurant (simplifié — en prod, filtrer par user)
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1)
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informations et configuration de votre restaurant
        </p>
      </div>
      {data ? (
        <RestaurantSettings restaurant={data as Restaurant} />
      ) : (
        <p className="text-muted-foreground">
          Aucun restaurant associé à votre compte.
        </p>
      )}
    </div>
  );
}
