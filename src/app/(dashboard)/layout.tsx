import { SidebarResto } from "@/components/layout/sidebar-resto";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarResto />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
