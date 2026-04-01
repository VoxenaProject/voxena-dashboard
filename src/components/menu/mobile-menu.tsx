"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, UtensilsCrossed, Salad, Soup, Beef, Fish, Pizza, Sandwich, Leaf, Coffee, Wine, Flame, Baby, Star, Sparkles, Tag, IceCream } from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import type { Menu, MenuItem } from "@/lib/supabase/types";

// Réutiliser les mêmes icônes que menu-manager.tsx
const catIcons: Record<string, { icon: LucideIcon; color: string }> = {
  "entrées": { icon: Salad, color: "text-green" },
  "plats principaux": { icon: UtensilsCrossed, color: "text-violet" },
  "soupes": { icon: Soup, color: "text-amber-600" },
  "viandes": { icon: Beef, color: "text-red-500" },
  "poissons & fruits de mer": { icon: Fish, color: "text-blue" },
  "pizzas": { icon: Pizza, color: "text-amber-500" },
  "burgers & sandwiches": { icon: Sandwich, color: "text-amber-700" },
  "végétarien": { icon: Leaf, color: "text-green" },
  "desserts": { icon: IceCream, color: "text-pink-500" },
  "boissons chaudes": { icon: Coffee, color: "text-amber-800" },
  "boissons fraîches": { icon: UtensilsCrossed, color: "text-blue" },
  "vins & alcools": { icon: Wine, color: "text-violet" },
  "offre du moment": { icon: Flame, color: "text-orange-500" },
  "menu enfant": { icon: Baby, color: "text-blue" },
  "suggestions du chef": { icon: Star, color: "text-amber-500" },
  "nouveautés": { icon: Sparkles, color: "text-violet" },
  "promotions": { icon: Tag, color: "text-green" },
};

function getIcon(name: string) {
  return catIcons[name.toLowerCase()] || { icon: UtensilsCrossed, color: "text-muted-foreground" };
}

interface Props {
  menus: Menu[];
  menuItems: MenuItem[];
  restaurantId: string;
}

export function MobileMenu({ menus, menuItems, restaurantId }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(menus[0]?.id || null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleAvailability(item: MenuItem) {
    setTogglingId(item.id);
    try {
      const res = await fetch("/api/menu-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
      });
      if (res.ok) {
        item.is_available = !item.is_available;
        toast.success(item.is_available ? "Disponible" : "Indisponible");
      }
    } catch { toast.error("Erreur"); }
    finally { setTogglingId(null); }
  }

  return (
    <div className="px-4 pt-2 pb-4">
      <h1 className="text-lg font-heading font-bold text-foreground mb-4">Menu</h1>

      {menus.length === 0 ? (
        <div className="text-center py-16">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground">Aucune catégorie</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Ajoutez des catégories depuis la version desktop</p>
        </div>
      ) : (
        <div className="space-y-2">
          {menus.map((cat) => {
            const { icon: CatIcon, color } = getIcon(cat.name);
            const items = menuItems.filter((i) => i.menu_id === cat.id);
            const isOpen = openCat === cat.id;

            return (
              <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Category header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/20 transition-colors"
                  onClick={() => setOpenCat(isOpen ? null : cat.id)}
                >
                  <CatIcon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                  <span className="text-sm font-semibold text-foreground flex-1 text-left">{cat.name}</span>
                  <span className="text-xs text-muted-foreground mr-1">{items.length}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Items */}
                {isOpen && items.length > 0 && (
                  <div className="border-t border-border divide-y divide-border" style={{ animation: "fade-in 0.15s ease-out" }}>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center px-4 py-2.5 gap-3">
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm text-foreground ${!item.is_available ? "line-through opacity-40" : ""}`}>{item.name}</span>
                          {item.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>}
                        </div>
                        <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{item.price.toFixed(2)}€</span>
                        {/* Toggle disponibilité */}
                        <button
                          onClick={() => toggleAvailability(item)}
                          disabled={togglingId === item.id}
                          className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${item.is_available ? "bg-green" : "bg-muted-foreground/20"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${item.is_available ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && items.length === 0 && (
                  <div className="border-t border-border px-4 py-4 text-center">
                    <p className="text-xs text-muted-foreground">Aucun article dans cette catégorie</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
