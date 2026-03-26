"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  CalendarDays,
  Euro,
  ScrollText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/admin", label: "Vue globale", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/reservations", label: "Réservations", icon: CalendarDays },
  { href: "/admin/finances", label: "Finances", icon: Euro },
  { href: "/admin/logs", label: "Logs agents", icon: ScrollText },
  { href: "/admin/settings", label: "Configuration", icon: Settings },
];

function SidebarContent({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={`bg-navy-deep text-white/70 flex flex-col min-h-screen transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Logo + badge admin */}
      <div className="p-5 pb-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <svg
            width="28"
            height="28"
            viewBox="543 -20 486 570"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
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
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="font-heading text-base font-bold text-white tracking-tight block">
                VOXENA
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-blue uppercase tracking-widest">
                <Shield className="w-2.5 h-2.5" />
                Super Admin
              </span>
            </motion.div>
          )}
        </Link>
        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="text-white/40 hover:text-white/70 transition-colors hidden lg:block"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-admin-active"
                  className="absolute inset-0 rounded-lg bg-violet/20 border border-violet/20"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon
                className={`w-[18px] h-[18px] flex-shrink-0 relative z-10 ${
                  isActive ? "text-blue" : ""
                }`}
              />
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {onToggle && collapsed && (
        <div className="px-3 mb-2">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            <PanelLeft className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}

      {/* Déconnexion */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] w-full transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && "Déconnexion"}
        </button>
      </div>
    </aside>
  );
}

export function SidebarAdmin() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-navy-deep text-white/80 shadow-lg lg:hidden">
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-navy-deep border-none">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarContent
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
    />
  );
}
