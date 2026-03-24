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

  useEffect(() => {
    setName(item?.name || "");
    setPrice(item?.price != null ? String(item.price) : "");
    setDescription(item?.description || "");
  }, [item, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: item?.id,
      name: name.trim(),
      price: parseFloat(price) || 0,
      description: description.trim(),
      menu_id: menuId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
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
                rows={3}
              />
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
