import { SidebarResto } from "@/components/layout/sidebar-resto";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { GuidedTour } from "@/components/onboarding/guided-tour";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";
import type { SubscriptionPlan } from "@/lib/supabase/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const restaurantId = await getCurrentRestaurantId();

  // Récupérer le statut de l'agent et le plan d'abonnement
  let agentStatus = "active";
  let subscriptionPlan: SubscriptionPlan = "orders";
  let pendingOrders = 0;
  let pendingResas = 0;
  if (restaurantId) {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split("T")[0];
    const [{ data }, { count: oc }, { count: rc }] = await Promise.all([
      supabase.from("restaurants").select("agent_status, subscription_plan").eq("id", restaurantId).single(),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).eq("status", "nouvelle").gte("created_at", `${today}T00:00:00`),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).eq("status", "en_attente").eq("date", today),
    ]);
    if (data) {
      agentStatus = data.agent_status;
      subscriptionPlan = (data.subscription_plan as SubscriptionPlan) || "orders";
    }
    pendingOrders = oc || 0;
    pendingResas = rc || 0;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarResto plan={subscriptionPlan} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden md:block">
          <TopBar restaurantId={restaurantId} initialAgentStatus={agentStatus} />
        </div>
        <main className="flex-1 overflow-y-auto bg-background main-content-area">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav plan={subscriptionPlan} pendingOrders={pendingOrders} pendingResas={pendingResas} />
      <GuidedTour />
    </div>
  );
}
