"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MenuCategoryDialog } from "./menu-category-dialog";
import { MenuItemDialog } from "./menu-item-dialog";
import type { Menu, MenuItem } from "@/lib/supabase/types";

interface MenuManagerProps {
  initialMenus: Menu[];
  initialItems: MenuItem[];
}

export function MenuManager({ initialMenus, initialItems }: MenuManagerProps) {
  const [menus, setMenus] = useState(initialMenus);
  const [items, setItems] = useState(initialItems);

  // Dialogs
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    menu?: Menu;
  }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    item?: MenuItem;
    menuId?: string;
  }>({ open: false });

  // ── Catégories ──

  async function handleSaveCategory(data: { name: string; id?: string }) {
    if (data.id) {
      // Mise à jour
      const res = await fetch("/api/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, name: data.name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMenus((prev) => prev.map((m) => (m.id === data.id ? updated : m)));
        toast.success("Catégorie mise à jour");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } else {
      // Création — on utilise le restaurant_id du premier menu existant ou on le passe depuis le context
      const restaurantId =
        menus[0]?.restaurant_id || items[0]?.restaurant_id || "";
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          restaurant_id: restaurantId,
          sort_order: menus.length,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMenus((prev) => [...prev, created]);
        toast.success("Catégorie créée");
      } else {
        toast.error("Erreur lors de la création");
      }
    }
    setCategoryDialog({ open: false });
  }

  async function handleDeleteCategory(menuId: string) {
    const res = await fetch(`/api/menus?id=${menuId}`, { method: "DELETE" });
    if (res.ok) {
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
      setItems((prev) => prev.filter((i) => i.menu_id !== menuId));
      toast.success("Catégorie supprimée");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  // ── Articles ──

  async function handleSaveItem(data: {
    id?: string;
    name: string;
    price: number;
    description: string;
    menu_id: string;
  }) {
    if (data.id) {
      const res = await fetch("/api/menu-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === data.id ? updated : i)));
        toast.success("Article mis à jour");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } else {
      const restaurantId =
        menus[0]?.restaurant_id || items[0]?.restaurant_id || "";
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        toast.success("Article créé");
      } else {
        toast.error("Erreur lors de la création");
      }
    }
    setItemDialog({ open: false });
  }

  async function handleDeleteItem(itemId: string) {
    const res = await fetch(`/api/menu-items?id=${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Article supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    const res = await fetch("/api/menu-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCategoryDialog({ open: true })}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une catégorie
        </Button>
      </div>

      {menus.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-lg font-medium mb-1">Aucune catégorie</p>
            <p className="text-sm">
              Commencez par créer une catégorie (ex: Pizzas, Boissons, Desserts)
            </p>
          </CardContent>
        </Card>
      ) : (
        menus.map((menu) => {
          const menuItems = items.filter((i) => i.menu_id === menu.id);

          return (
            <Card key={menu.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="font-heading text-lg">
                    {menu.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {menuItems.length} article
                    {menuItems.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCategoryDialog({ open: true, menu })
                    }
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(menu.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() =>
                            handleToggleAvailability(item)
                          }
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              !item.is_available
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold">
                          {Number(item.price).toFixed(2)}€
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setItemDialog({
                              open: true,
                              item,
                              menuId: menu.id,
                            })
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    className="w-full mt-2 border border-dashed"
                    onClick={() =>
                      setItemDialog({ open: true, menuId: menu.id })
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Dialogs */}
      <MenuCategoryDialog
        open={categoryDialog.open}
        menu={categoryDialog.menu}
        onClose={() => setCategoryDialog({ open: false })}
        onSave={handleSaveCategory}
      />
      <MenuItemDialog
        open={itemDialog.open}
        item={itemDialog.item}
        menuId={itemDialog.menuId || ""}
        onClose={() => setItemDialog({ open: false })}
        onSave={handleSaveItem}
      />
    </div>
  );
}
