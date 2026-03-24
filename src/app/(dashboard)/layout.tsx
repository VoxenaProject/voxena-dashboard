import { SidebarResto } from "@/components/layout/sidebar-resto";
import { TopBar } from "@/components/layout/top-bar";
import { GuidedTour } from "@/components/onboarding/guided-tour";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarResto />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
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
