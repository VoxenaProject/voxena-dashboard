"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  CalendarDays,
  MoreHorizontal,
  UtensilsCrossed,
  LayoutGrid,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { SubscriptionPlan } from "@/lib/supabase/types";

const mainItems = [
  { href: "/", label: "Accueil", icon: LayoutDashboard, plans: ["orders", "tables", "pro"] },
  { href: "/orders", label: "Commandes", icon: ShoppingBag, plans: ["orders", "pro"] },
  { href: "/reservations", label: "Résas", icon: CalendarDays, plans: ["tables", "pro"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, plans: ["orders", "tables", "pro"] },
];

const moreItems = [
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, plans: ["orders", "pro"] },
  { href: "/floor-plan", label: "Plan de salle", icon: LayoutGrid, plans: ["tables", "pro"] },
  { href: "/kitchen", label: "Cuisine", icon: ChefHat, plans: ["orders", "pro"] },
  { href: "/settings", label: "Paramètres", icon: Settings, plans: ["orders", "tables", "pro"] },
];

export function MobileBottomNav({ plan = "orders" }: { plan?: SubscriptionPlan }) {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isMobile) return null;

  // Filtrer les items par plan — prendre les 3 premiers disponibles + "Plus"
  const available = mainItems.filter((item) =>
    item.plans.includes(plan)
  ).slice(0, 3);

  const moreAvailable = moreItems.filter((item) =>
    item.plans.includes(plan)
  );

  // Vérifier si le pathname matche un des "more" items
  const isMoreActive = moreAvailable.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <>
      {/* Bottom Sheet "Plus" */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Plus</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moreAvailable.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-violet/10 text-violet"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]" aria-label="Navigation principale" role="navigation">
        <div className="flex items-center justify-around h-14">
          {available.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => { try { navigator?.vibrate?.(5); } catch {} }}
                className={`relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors active:scale-95 ${
                  isActive
                    ? "text-violet"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors ${
              isMoreActive
                ? "text-violet"
                : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={isMoreActive ? 2.2 : 1.8} />
            <span className={`text-[10px] ${isMoreActive ? "font-semibold" : "font-medium"}`}>
              Plus
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
