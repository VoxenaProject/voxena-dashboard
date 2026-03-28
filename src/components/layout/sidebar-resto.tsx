"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  ChefHat,
  CalendarDays,
  LayoutGrid,
  Settings,
  Crown,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UpsellModal } from "@/components/ui/upsell-modal";
import type { SubscriptionPlan } from "@/lib/supabase/types";

// Labels lisibles pour les plans
const planLabels: Record<SubscriptionPlan, string> = {
  orders: "Plan Orders",
  tables: "Plan Tables",
  pro: "Plan Pro",
};

// Définition des items de navigation avec les plans requis
const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, plans: ["orders", "tables", "pro"] as SubscriptionPlan[] },
  { href: "/orders", label: "Commandes", icon: ShoppingBag, plans: ["orders", "pro"] as SubscriptionPlan[] },
  { href: "/kitchen", label: "Cuisine", icon: ChefHat, plans: ["orders", "pro"] as SubscriptionPlan[] },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, plans: ["orders", "pro"] as SubscriptionPlan[] },
  { href: "/reservations", label: "Réservations", icon: CalendarDays, plans: ["tables", "pro"] as SubscriptionPlan[] },
  { href: "/floor-plan", label: "Plan de salle", icon: LayoutGrid, plans: ["tables", "pro"] as SubscriptionPlan[] },
  { href: "/settings", label: "Paramètres", icon: Settings, plans: ["orders", "tables", "pro"] as SubscriptionPlan[] },
];

// Composant pour les items de navigation verrouillés avec tooltip
function LockedNavItem({
  item,
  collapsed,
  onClick,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  collapsed: boolean;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-colors duration-150 w-full text-white/25 cursor-not-allowed ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && (
          <span className="flex items-center gap-2">
            {item.label}
            <Crown className="w-3 h-3 text-amber-500/50" />
          </span>
        )}
        {collapsed && (
          <span className="absolute -top-0.5 -right-0.5">
            <Crown className="w-3 h-3 text-amber-500/50" />
          </span>
        )}
      </button>

      {/* Tooltip au survol (desktop) */}
      {showTooltip && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1a1a2e] rotate-45" />
          <div className="relative bg-[#1a1a2e] text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg max-w-[200px] whitespace-nowrap">
            Disponible avec Voxena Pro
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  collapsed,
  onToggle,
  plan = "orders",
}: {
  collapsed: boolean;
  onToggle?: () => void;
  plan?: SubscriptionPlan;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // State pour la modale upsell
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleLockedClick(label: string) {
    setUpsellFeature(label);
    setUpsellOpen(true);
  }

  // Rendu des items de navigation
  function renderNavItems(items: typeof navItems) {
    return items.map((item) => {
      const isAvailable = item.plans.includes(plan);
      const isActive =
        isAvailable &&
        (pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href)));

      // Item verrouillé
      if (!isAvailable) {
        return (
          <LockedNavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            onClick={() => handleLockedClick(item.label)}
          />
        );
      }

      // Item disponible
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-colors duration-150 ${
            collapsed ? "justify-center" : ""
          } ${
            isActive
              ? "text-white bg-white/[0.08]"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
          }`}
        >
          <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      );
    });
  }

  return (
    <>
      <aside
        className={`bg-[#0E1333] text-white/50 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="py-8 px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="543 -20 486 570"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <defs>
                <linearGradient
                  id="sb-grad"
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
                fill="url(#sb-grad)"
                d="M949.9,0l-161.4,299.5L625.3,0h324.6ZM563.6,125.3l-1.1,1.9v234l223.1,167.1-222-403ZM785.6,528.3l223.1-167.1V127.2s-1.1-1.9-1.1-1.9l-222,403Z"
              />
            </svg>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-widest text-white/90">
                VOXENA
              </span>
            )}
          </Link>
          {onToggle && !collapsed && (
            <button
              onClick={onToggle}
              className="text-white/30 hover:text-white/60 transition-colors duration-150 hidden lg:block"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 px-3 mt-8" data-tour="sidebar-nav">
          <div className="space-y-0.5">
            {renderNavItems(navItems)}
          </div>
        </nav>

        {/* Collapse toggle (desktop, collapsed state) */}
        {onToggle && collapsed && (
          <div className="px-3 mb-2">
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center py-3 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors duration-150"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}

        {/* Plan badge + Déconnexion */}
        <div className="pb-6 px-5">
          {!collapsed && (
            <div className="mb-3">
              <span className="text-[11px] text-white/25 font-normal">
                {planLabels[plan]}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 py-2.5 text-sm text-white/25 hover:text-white/50 w-full transition-colors duration-150 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* Modale upsell */}
      <UpsellModal
        isOpen={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        feature={upsellFeature}
      />
    </>
  );
}

export function SidebarResto({ plan = "orders" }: { plan?: SubscriptionPlan }) {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#0E1333] text-white/80 shadow-lg lg:hidden">
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-[#0E1333] border-none">
          <SidebarContent collapsed={false} plan={plan} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarContent
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
      plan={plan}
    />
  );
}
