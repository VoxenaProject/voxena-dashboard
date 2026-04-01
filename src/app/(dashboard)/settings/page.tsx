import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RestaurantSettings } from "@/components/settings/restaurant-settings";
import type { Restaurant } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  let data = null;
  if (restaurantId) {
    const res = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();
    data = res.data;
  }

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden px-4 pt-2 pb-4">
        <h1 className="text-lg font-heading font-bold text-foreground mb-4">Paramètres</h1>
        {data ? (
          <RestaurantSettings restaurant={data as Restaurant} />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun restaurant associé.</p>
        )}
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <PageWrapper className="max-w-2xl">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-sm text-muted-foreground mt-1">Informations et configuration de votre restaurant</p>
          </div>
          {data ? (
            <RestaurantSettings restaurant={data as Restaurant} />
          ) : (
            <p className="text-muted-foreground">Aucun restaurant associé à votre compte.</p>
          )}
        </PageWrapper>
      </div>
    </>
  );
}
