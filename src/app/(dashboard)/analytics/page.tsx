import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import { AnalyticsContent } from "@/components/analytics/analytics-content";
import type { SubscriptionPlan } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("subscription_plan")
    .eq("id", restaurantId)
    .single();

  const plan: SubscriptionPlan = restaurant?.subscription_plan || "orders";

  return (
    <>
      <div className="px-6 lg:px-8 pt-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analyse de votre activité et performance
        </p>
      </div>
      <AnalyticsContent restaurantId={restaurantId} plan={plan} />
    </>
  );
}
