import { SidebarAdmin } from "@/components/layout/sidebar-admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarAdmin />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
