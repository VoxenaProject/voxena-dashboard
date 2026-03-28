import { SidebarResto } from "@/components/layout/sidebar-resto";
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
  if (restaurantId) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("restaurants")
      .select("agent_status, subscription_plan")
      .eq("id", restaurantId)
      .single();
    if (data) {
      agentStatus = data.agent_status;
      subscriptionPlan = (data.subscription_plan as SubscriptionPlan) || "orders";
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarResto plan={subscriptionPlan} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar restaurantId={restaurantId} initialAgentStatus={agentStatus} />
        <main className="flex-1 overflow-y-auto bg-background">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <GuidedTour />
    </div>
  );
}
