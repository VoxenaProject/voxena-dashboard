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
import { Button } from "@/components/ui/button";
import type { Menu } from "@/lib/supabase/types";

interface MenuCategoryDialogProps {
  open: boolean;
  menu?: Menu;
  onClose: () => void;
  onSave: (data: { name: string; id?: string }) => void;
}

export function MenuCategoryDialog({
  open,
  menu,
  onClose,
  onSave,
}: MenuCategoryDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(menu?.name || "");
  }, [menu, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), id: menu?.id });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {menu ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom de la catégorie</Label>
              <Input
                id="cat-name"
                placeholder="ex: Pizzas, Boissons, Desserts..."
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
              {menu ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
