"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  FileUp,
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
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { MenuCategoryDialog } from "./menu-category-dialog";
import { MenuItemDialog } from "./menu-item-dialog";
import { MenuPdfImport } from "./menu-pdf-import";
import type { Menu, MenuItem } from "@/lib/supabase/types";

// Mapping nom catégorie → icône
const categoryIcons: Record<string, { icon: LucideIcon; color: string }> = {
  "entrées": { icon: Salad, color: "text-green" },
  "plats principaux": { icon: UtensilsCrossed, color: "text-violet" },
  "soupes": { icon: Soup, color: "text-amber-600" },
  "viandes": { icon: Beef, color: "text-red-500" },
  "poissons & fruits de mer": { icon: Fish, color: "text-blue" },
  "pizzas": { icon: Pizza, color: "text-amber-500" },
  "burgers & sandwiches": { icon: Sandwich, color: "text-amber-700" },
  "végétarien": { icon: Leaf, color: "text-green-soft" },
  "desserts": { icon: IceCream, color: "text-pink-500" },
  "boissons chaudes": { icon: Coffee, color: "text-amber-800" },
  "boissons fraîches": { icon: GlassWater, color: "text-blue" },
  "vins & alcools": { icon: Wine, color: "text-violet-dark" },
  "offre du moment": { icon: Flame, color: "text-orange-500" },
  "menu enfant": { icon: Baby, color: "text-blue" },
  "suggestions du chef": { icon: Star, color: "text-amber-500" },
  "nouveautés": { icon: Sparkles, color: "text-violet" },
  "promotions": { icon: Tag, color: "text-green" },
};

function getCategoryIcon(name: string): { icon: LucideIcon; color: string } {
  return (
    categoryIcons[name.toLowerCase()] || {
      icon: UtensilsCrossed,
      color: "text-muted-foreground",
    }
  );
}

interface MenuManagerProps {
  initialMenus: Menu[];
  initialItems: MenuItem[];
  restaurantId?: string | null;
}

export function MenuManager({ initialMenus, initialItems, restaurantId: propRestaurantId }: MenuManagerProps) {
  const [menus, setMenus] = useState(initialMenus);
  const [items, setItems] = useState(initialItems);

  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    menu?: Menu;
  }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    item?: MenuItem;
    menuId?: string;
  }>({ open: false });
  const [pdfImportOpen, setPdfImportOpen] = useState(false);

  // ── Import PDF ──

  async function handlePdfImport(
    categories: { name: string; items: { name: string; price: number; description: string }[] }[]
  ) {
    const restaurantId =
      propRestaurantId || menus[0]?.restaurant_id || items[0]?.restaurant_id || "";

    for (const cat of categories) {
      // Créer la catégorie
      const catRes = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cat.name,
          restaurant_id: restaurantId,
          sort_order: menus.length,
        }),
      });

      if (!catRes.ok) continue;
      const newMenu = await catRes.json();
      setMenus((prev) => [...prev, newMenu]);

      // Créer les articles
      for (const item of cat.items) {
        const itemRes = await fetch("/api/menu-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            price: item.price,
            description: item.description || null,
            menu_id: newMenu.id,
            restaurant_id: restaurantId,
          }),
        });

        if (itemRes.ok) {
          const newItem = await itemRes.json();
          setItems((prev) => [...prev, newItem]);
        }
      }
    }
  }

  // ── Catégories ──

  async function handleSaveCategory(data: { name: string; id?: string }) {
    if (data.id) {
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
      const restaurantId =
        propRestaurantId || menus[0]?.restaurant_id || items[0]?.restaurant_id || "";
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
        toast.success(`"${data.name}" ajouté au menu`);
      } else {
        toast.error("Erreur lors de la création");
      }
    }
    setCategoryDialog({ open: false });
  }

  async function handleDeleteCategory(menuId: string) {
    const menu = menus.find((m) => m.id === menuId);
    if (!confirm(`Supprimer "${menu?.name}" et tous ses articles ?`)) return;

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
        propRestaurantId || menus[0]?.restaurant_id || items[0]?.restaurant_id || "";
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        toast.success("Article ajouté");
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

  // Stats
  const totalItems = items.length;
  const availableItems = items.filter((i) => i.is_available).length;

  // Drag-and-drop catégories
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = menus.findIndex((m) => m.id === active.id);
    const newIndex = menus.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(menus, oldIndex, newIndex);
    setMenus(reordered);

    // Persister
    await fetch("/api/menus/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((m, i) => ({ id: m.id, sort_order: i })),
      }),
    });
  }

  return (
    <div className="space-y-6" data-tour="menu-categories">
      {/* Header avec stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-xs font-mono">
            {menus.length} catégorie{menus.length > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            {availableItems}/{totalItems} articles disponibles
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPdfImportOpen(true)}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Importer un PDF
          </Button>
          <Button onClick={() => setCategoryDialog({ open: true })}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        </div>
      </div>

      {menus.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucune catégorie"
          description="Structurez votre menu en ajoutant des catégories : entrées, plats, desserts, boissons..."
          actionLabel="Ajouter une catégorie"
          onAction={() => setCategoryDialog({ open: true })}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={menus.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {menus.map((menu, i) => {
            const menuItems = items.filter((it) => it.menu_id === menu.id);
            const catIcon = getCategoryIcon(menu.name);
            const CatIcon = catIcon.icon;

            return (
              <SortableMenuCard key={menu.id} id={menu.id}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
                      <div
                        className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-xs`}
                      >
                        <CatIcon className={`w-4 h-4 ${catIcon.color}`} />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-base">
                          {menu.name}
                        </CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {menuItems.length} article
                        {menuItems.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setCategoryDialog({ open: true, menu })
                        }
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteCategory(menu.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {menuItems.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Aucun article dans cette catégorie
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setItemDialog({ open: true, menuId: menu.id })
                          }
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Ajouter le premier article
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {menuItems.map((item, j) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors ${
                              j < menuItems.length - 1
                                ? "border-b border-border/30"
                                : ""
                            }`}
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
                                  className={`text-sm font-medium transition-colors ${
                                    !item.is_available
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {item.name}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold tabular-nums">
                                {Number(item.price).toFixed(2)}€
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:!opacity-100"
                                onClick={() =>
                                  setItemDialog({
                                    open: true,
                                    item,
                                    menuId: menu.id,
                                  })
                                }
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:!opacity-100"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <div className="px-5 py-2.5 border-t border-border/30 bg-muted/20">
                          <button
                            onClick={() =>
                              setItemDialog({ open: true, menuId: menu.id })
                            }
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet font-medium transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter un article
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              </SortableMenuCard>
            );
          })}
          </SortableContext>
        </DndContext>
      )}

      {/* Dialogs */}
      <MenuCategoryDialog
        open={categoryDialog.open}
        menu={categoryDialog.menu}
        existingNames={menus.map((m) => m.name)}
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
      <MenuPdfImport
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onImport={handlePdfImport}
      />
    </div>
  );
}

// ── Wrapper sortable pour les catégories ──

function SortableMenuCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
