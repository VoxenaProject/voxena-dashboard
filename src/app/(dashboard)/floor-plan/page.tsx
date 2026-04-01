import nextDynamic from "next/dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoRestaurant } from "@/components/ui/no-restaurant";
import type { FloorTable } from "@/lib/supabase/types";

const FloorPlanEditor = nextDynamic(
  () => import("@/components/floor-plan/floor-plan-editor").then((m) => m.FloorPlanEditor),
  { loading: () => <div className="h-96 bg-muted/30 rounded-xl animate-pulse" /> }
);

export const dynamic = "force-dynamic";

export default async function FloorPlanPage() {
  const supabase = createServiceClient();
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) return <NoRestaurant />;

  const { data: tables } = await supabase
    .from("floor_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  return (
    <PageWrapper className="h-[calc(100vh-64px)]">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Plan de salle
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Disposez vos tables et configurez la capacité de votre restaurant
        </p>
      </div>
      <FloorPlanEditor
        initialTables={(tables as FloorTable[]) || []}
        restaurantId={restaurantId}
      />
    </PageWrapper>
  );
}
