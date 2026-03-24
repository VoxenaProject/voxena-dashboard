"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  ScrollText,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Vue globale", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/logs", label: "Logs agents", icon: ScrollText },
  { href: "/admin/settings", label: "Configuration", icon: Settings },
];

export function SidebarAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border min-h-screen">
      {/* Logo + badge admin */}
      <div className="p-6 pb-4">
        <Link href="/admin" className="flex items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="543 -20 486 570"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="sb-admin-grad"
                x1="785"
                y1="0"
                x2="785"
                y2="528"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#74a3ff" />
                <stop offset="0.5" stopColor="#4237c4" />
                <stop offset="1" stopColor="#3e3183" />
              </linearGradient>
            </defs>
            <path
              fill="url(#sb-admin-grad)"
              d="M949.9,0l-161.4,299.5L625.3,0h324.6ZM563.6,125.3l-1.1,1.9v234l223.1,167.1-222-403ZM785.6,528.3l223.1-167.1V127.2s-1.1-1.9-1.1-1.9l-222,403Z"
            />
          </svg>
          <div>
            <span className="font-heading text-lg font-bold text-white tracking-tight block">
              VOXENA
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-violet uppercase tracking-widest">
              <Shield className="w-3 h-3" />
              Super Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Déconnexion */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
