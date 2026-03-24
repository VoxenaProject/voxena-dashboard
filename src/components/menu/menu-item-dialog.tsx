"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/supabase/types";

// 14 allergènes obligatoires en UE (Règlement 1169/2011)
// + émojis pour le côté friendly
const EU_ALLERGENS = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "crustaces", label: "Crustacés", emoji: "🦐" },
  { id: "oeufs", label: "Œufs", emoji: "🥚" },
  { id: "poisson", label: "Poisson", emoji: "🐟" },
  { id: "arachides", label: "Arachides", emoji: "🥜" },
  { id: "soja", label: "Soja", emoji: "🫘" },
  { id: "lait", label: "Lait", emoji: "🥛" },
  { id: "fruits_a_coque", label: "Fruits à coque", emoji: "🌰" },
  { id: "celeri", label: "Céleri", emoji: "🥬" },
  { id: "moutarde", label: "Moutarde", emoji: "🟡" },
  { id: "sesame", label: "Sésame", emoji: "⚪" },
  { id: "sulfites", label: "Sulfites", emoji: "🍷" },
  { id: "lupin", label: "Lupin", emoji: "🌸" },
  { id: "mollusques", label: "Mollusques", emoji: "🦪" },
];

interface MenuItemDialogProps {
  open: boolean;
  item?: MenuItem;
  menuId: string;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    price: number;
    description: string;
    menu_id: string;
    allergens: string[];
  }) => void;
}

export function MenuItemDialog({
  open,
  item,
  menuId,
  onClose,
  onSave,
}: MenuItemDialogProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [allergens, setAllergens] = useState<Set<string>>(new Set());

  useEffect(() => {
    setName(item?.name || "");
    setPrice(item?.price != null ? String(item.price) : "");
    setDescription(item?.description || "");
    setAllergens(new Set(item?.allergens || []));
  }, [item, open]);

  function toggleAllergen(id: string) {
    setAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: item?.id,
      name: name.trim(),
      price: parseFloat(price) || 0,
      description: description.trim(),
      menu_id: menuId,
      allergens: Array.from(allergens),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {item ? "Modifier l'article" : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nom</Label>
              <Input
                id="item-name"
                placeholder="ex: Margherita, Coca-Cola..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Prix (€)</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">Description (optionnel)</Label>
              <Textarea
                id="item-desc"
                placeholder="Ingrédients, taille, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Allergènes UE */}
            <div className="space-y-2">
              <Label>
                Allergènes
                <span className="text-muted-foreground font-normal ml-1">
                  (réglementation UE)
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EU_ALLERGENS.map((a) => {
                  const selected = allergens.has(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAllergen(a.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        selected
                          ? "bg-amber-500/12 border-amber-500/30 text-amber-700"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{a.emoji}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {allergens.size > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {allergens.size} allergène{allergens.size > 1 ? "s" : ""} sélectionné{allergens.size > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {item ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Liste des 14 allergènes EU avec émojis — exportée pour affichage dans le menu */
export { EU_ALLERGENS };
