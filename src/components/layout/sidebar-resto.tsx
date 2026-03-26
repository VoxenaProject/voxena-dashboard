"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
  orders: "Orders",
  tables: "Tables",
  pro: "Pro",
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

// Items principaux vs paramètres (séparateur entre les deux groupes)
const mainNavItems = navItems.filter((item) => item.href !== "/settings");
const settingsNavItems = navItems.filter((item) => item.href === "/settings");

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
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium tracking-wide transition-all duration-200 w-full opacity-30 cursor-not-allowed ${
          collapsed ? "justify-center" : ""
        } text-white/40`}
      >
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && (
          <span className="flex items-center gap-2">
            {item.label}
            <span className="gradient-gold">
              <Crown className="w-3.5 h-3.5" />
            </span>
          </span>
        )}
        {collapsed && (
          <span className="gradient-gold absolute -top-0.5 -right-0.5">
            <Crown className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Tooltip au survol (desktop) */}
      {showTooltip && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none"
        >
          {/* Flèche */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1a1a2e] rotate-45" />
          {/* Contenu */}
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

  // Rendu d'un groupe de nav items
  function renderNavItems(items: typeof navItems) {
    return items.map((item) => {
      const isAvailable = item.plans.includes(plan);
      const isActive =
        isAvailable &&
        (pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href)));

      // Item verrouillé — pas de navigation, affichage grisé + tooltip
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

      // Item disponible — navigation normale
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium tracking-wide transition-all duration-200 ${
            collapsed ? "justify-center" : ""
          } ${
            isActive
              ? "text-white bg-white/[0.08]"
              : "text-white/50 hover:text-white/80 hover:bg-white/[0.06] hover:backdrop-blur-sm"
          }`}
        >
          {/* Barre d'accent active à gauche */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active-bar"
              className="sidebar-active-bar"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          {/* Fond actif animé */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-xl bg-white/[0.08]"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          <item.icon
            className={`w-[18px] h-[18px] flex-shrink-0 relative z-10 transition-all duration-200 ${
              isActive ? "text-violet drop-shadow-[0_0_8px_rgba(66,55,196,0.6)]" : ""
            }`}
          />
          {!collapsed && (
            <span className="relative z-10">{item.label}</span>
          )}
        </Link>
      );
    });
  }

  return (
    <>
      <aside
        className={`noise-bg bg-gradient-to-b from-navy-deep to-navy text-white/50 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* Logo — plus d'espace vertical */}
        <div className="relative z-10 py-6 px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg
              width="32"
              height="32"
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
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-heading text-base font-bold text-white tracking-tight logo-glow"
              >
                VOXENA
              </motion.span>
            )}
          </Link>
          {onToggle && !collapsed && (
            <button
              onClick={onToggle}
              className="text-white/30 hover:text-white/60 transition-all duration-200 hidden lg:block"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="relative z-10 px-6 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
              Navigation
            </span>
          </div>
        )}

        {/* Navigation principale */}
        <nav className="relative z-10 flex-1 px-3 mt-1" data-tour="sidebar-nav">
          <div className="space-y-1">
            {renderNavItems(mainNavItems)}
          </div>

          {/* Séparateur entre les groupes */}
          <div className="my-4 mx-2 border-t border-white/[0.06]" />

          {/* Paramètres */}
          <div className="space-y-1">
            {renderNavItems(settingsNavItems)}
          </div>
        </nav>

        {/* Collapse toggle (desktop, collapsed state) */}
        {onToggle && collapsed && (
          <div className="relative z-10 px-3 mb-2">
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}

        {/* Plan badge + Déconnexion */}
        <div className="relative z-10 p-3 border-t border-white/[0.06]">
          {/* Badge du plan actuel */}
          {!collapsed && (
            <div className="px-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-violet/20 text-violet border border-violet/20">
                <span className="w-1.5 h-1.5 rounded-full bg-violet" />
                {planLabels[plan]}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium tracking-wide text-white/40 hover:text-white/80 hover:bg-white/[0.06] w-full transition-all duration-200 opacity-60 hover:opacity-100 ${
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
        <SheetTrigger className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-navy-deep text-white/80 shadow-lg lg:hidden">
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-navy-deep border-none">
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
