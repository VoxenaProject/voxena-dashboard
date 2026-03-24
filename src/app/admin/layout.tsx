import { SidebarAdmin } from "@/components/layout/sidebar-admin";
import { TopBar } from "@/components/layout/top-bar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarAdmin />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet/[0.02] to-transparent" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
