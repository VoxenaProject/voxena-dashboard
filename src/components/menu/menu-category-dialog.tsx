"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Soup,
  UtensilsCrossed,
  Salad,
  Beef,
  Fish,
  Pizza,
  Sandwich,
  IceCream,
  Coffee,
  Wine,
  GlassWater,
  Sparkles,
  Flame,
  Star,
  Tag,
  Baby,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Menu } from "@/lib/supabase/types";

// Catégories prédéfinies pour un restaurant pro
const presetCategories: {
  group: string;
  items: { name: string; icon: LucideIcon; color: string }[];
}[] = [
  {
    group: "Plats",
    items: [
      { name: "Entrées", icon: Salad, color: "text-green" },
      { name: "Plats principaux", icon: UtensilsCrossed, color: "text-violet" },
      { name: "Soupes", icon: Soup, color: "text-amber-600" },
      { name: "Viandes", icon: Beef, color: "text-red-500" },
      { name: "Poissons & Fruits de mer", icon: Fish, color: "text-blue" },
      { name: "Pizzas", icon: Pizza, color: "text-amber-500" },
      { name: "Burgers & Sandwiches", icon: Sandwich, color: "text-amber-700" },
      { name: "Végétarien", icon: Leaf, color: "text-green-soft" },
    ],
  },
  {
    group: "Desserts & Boissons",
    items: [
      { name: "Desserts", icon: IceCream, color: "text-pink-500" },
      { name: "Boissons chaudes", icon: Coffee, color: "text-amber-800" },
      { name: "Boissons fraîches", icon: GlassWater, color: "text-blue" },
      { name: "Vins & Alcools", icon: Wine, color: "text-violet-dark" },
    ],
  },
  {
    group: "Spécial",
    items: [
      { name: "Offre du moment", icon: Flame, color: "text-orange-500" },
      { name: "Menu enfant", icon: Baby, color: "text-blue" },
      { name: "Suggestions du chef", icon: Star, color: "text-amber-500" },
      { name: "Nouveautés", icon: Sparkles, color: "text-violet" },
      { name: "Promotions", icon: Tag, color: "text-green" },
    ],
  },
];

interface MenuCategoryDialogProps {
  open: boolean;
  menu?: Menu;
  existingNames: string[];
  onClose: () => void;
  onSave: (data: { name: string; id?: string }) => void;
}

export function MenuCategoryDialog({
  open,
  menu,
  existingNames,
  onClose,
  onSave,
}: MenuCategoryDialogProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"presets" | "custom">("presets");

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setMode("custom");
    } else {
      setName("");
      setMode("presets");
    }
  }, [menu, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), id: menu?.id });
  }

  function handlePresetClick(presetName: string) {
    onSave({ name: presetName });
  }

  // Mode édition : juste un input
  if (menu) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Modifier la catégorie
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nom</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Mode création : presets + custom
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Ajouter une catégorie
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez un template ou créez une catégorie personnalisée
          </p>
        </DialogHeader>

        {/* Tabs presets / custom */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("presets")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "presets"
                ? "bg-violet/10 text-violet"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "custom"
                ? "bg-violet/10 text-violet"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Personnalisé
          </button>
        </div>

        {mode === "presets" ? (
          <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
            {presetCategories.map((group) => (
              <div key={group.group}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((preset) => {
                    const alreadyExists = existingNames.some(
                      (n) => n.toLowerCase() === preset.name.toLowerCase()
                    );
                    return (
                      <motion.button
                        key={preset.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={alreadyExists}
                        onClick={() => handlePresetClick(preset.name)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all border ${
                          alreadyExists
                            ? "opacity-40 cursor-not-allowed border-transparent bg-muted/50"
                            : "border-border/60 hover:border-violet/30 hover:bg-violet/[0.03] hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center flex-shrink-0`}
                        >
                          <preset.icon
                            className={`w-4 h-4 ${preset.color}`}
                          />
                        </div>
                        <span className="truncate">{preset.name}</span>
                        {alreadyExists && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Ajouté
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 py-2">
              <Label htmlFor="custom-cat">Nom de la catégorie</Label>
              <Input
                id="custom-cat"
                placeholder="ex: Spécialités maison, Brunch..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Créer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
