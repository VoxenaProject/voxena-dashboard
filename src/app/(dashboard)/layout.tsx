import { SidebarResto } from "@/components/layout/sidebar-resto";
import { TopBar } from "@/components/layout/top-bar";
import { GuidedTour } from "@/components/onboarding/guided-tour";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/supabase/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const restaurantId = await getCurrentRestaurantId();

  // Récupérer le statut de l'agent pour le toggle
  let agentStatus = "active";
  if (restaurantId) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("restaurants")
      .select("agent_status")
      .eq("id", restaurantId)
      .single();
    if (data) agentStatus = data.agent_status;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarResto />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar restaurantId={restaurantId} initialAgentStatus={agentStatus} />
        <main className="flex-1 overflow-y-auto bg-background relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet/[0.02] to-transparent" />
          <div className="relative">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <GuidedTour />
    </div>
  );
}
