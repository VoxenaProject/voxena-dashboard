"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Save,
  RectangleHorizontal,
  Circle,
  Square,
  Trash2,
  Users,
  Smartphone,
  Grid3X3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FloorTableElement } from "@/components/floor-plan/floor-table";
import type { FloorTable } from "@/lib/supabase/types";

// Type local avec _tempId pour les tables pas encore persistées
type LocalTable = FloorTable & { _tempId?: string; _isNew?: boolean };

interface FloorPlanEditorProps {
  initialTables: FloorTable[];
  restaurantId: string;
}

const GRID_SIZE = 10;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Snap à la grille de 10px
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Compteur pour les IDs temporaires
let tempCounter = 0;
function generateTempId(): string {
  tempCounter++;
  return `_temp_${Date.now()}_${tempCounter}`;
}

export function FloorPlanEditor({
  initialTables,
  restaurantId,
}: FloorPlanEditorProps) {
  const [tables, setTables] = useState<LocalTable[]>(
    initialTables.map((t) => ({ ...t }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Table sélectionnée
  const selectedTable = tables.find(
    (t) => t.id === selectedId || t._tempId === selectedId
  );

  // Sensor avec distance minimale pour différencier clic et drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Mettre à jour une table dans le state local
  const updateTable = useCallback(
    (tableId: string, updates: Partial<LocalTable>) => {
      setTables((prev) =>
        prev.map((t) =>
          (t.id === tableId || t._tempId === tableId) ? { ...t, ...updates } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Ajouter une table
  const addTable = useCallback(
    (shape: "rectangle" | "round" | "square") => {
      const count = tables.length;
      const defaultCapacity = shape === "round" ? 4 : 2;
      const defaultWidth = shape === "rectangle" ? 120 : 80;
      const defaultHeight = shape === "rectangle" ? 70 : 80;

      // Positionner au centre du canvas
      const canvasEl = canvasRef.current;
      const scrollLeft = canvasEl?.scrollLeft || 0;
      const scrollTop = canvasEl?.scrollTop || 0;
      const viewWidth = canvasEl?.clientWidth || CANVAS_WIDTH;
      const viewHeight = canvasEl?.clientHeight || CANVAS_HEIGHT;

      const centerX = snapToGrid(
        scrollLeft + viewWidth / 2 - defaultWidth / 2
      );
      const centerY = snapToGrid(
        scrollTop + viewHeight / 2 - defaultHeight / 2
      );

      const tempId = generateTempId();

      const newTable: LocalTable = {
        id: "",
        _tempId: tempId,
        _isNew: true,
        restaurant_id: restaurantId,
        name: `Table ${count + 1}`,
        capacity: defaultCapacity,
        shape,
        x: centerX,
        y: centerY,
        width: defaultWidth,
        height: defaultHeight,
        combinable: true,
        is_active: true,
        sort_order: count,
        created_at: new Date().toISOString(),
      };

      setTables((prev) => [...prev, newTable]);
      setSelectedId(tempId);
      setHasChanges(true);
    },
    [tables.length, restaurantId]
  );

  // Supprimer une table
  const deleteTable = useCallback(
    (tableId: string) => {
      setTables((prev) =>
        prev.filter((t) => t.id !== tableId && t._tempId !== tableId)
      );
      if (selectedId === tableId) setSelectedId(null);
      setDeleteConfirmId(null);
      setHasChanges(true);
    },
    [selectedId]
  );

  // Gestion du drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const tableId = active.id as string;

      setTables((prev) =>
        prev.map((t) => {
          if (t.id === tableId || t._tempId === tableId) {
            return {
              ...t,
              x: snapToGrid(Math.max(0, t.x + delta.x)),
              y: snapToGrid(Math.max(0, t.y + delta.y)),
            };
          }
          return t;
        })
      );
      setHasChanges(true);
    },
    []
  );

  // Sauvegarde bulk
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Préparer les tables pour l'envoi (retirer champs temporaires)
      const payload = tables.map((t, i) => {
        const base: Record<string, unknown> = {
          name: t.name,
          capacity: t.capacity,
          shape: t.shape,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          combinable: t.combinable,
          is_active: t.is_active,
          sort_order: i,
        };
        // Inclure l'id seulement pour les tables existantes
        if (t.id && !t._isNew) {
          base.id = t.id;
        }
        return base;
      });

      const response = await fetch("/api/floor-tables/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, tables: payload }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur de sauvegarde");
      }

      const result = await response.json();

      // Mettre à jour le state avec les tables retournées (qui ont maintenant des IDs)
      if (result.tables && Array.isArray(result.tables)) {
        setTables(
          (result.tables as FloorTable[]).map((t) => ({
            ...t,
            _isNew: false,
            _tempId: undefined,
          }))
        );
      }

      setHasChanges(false);
      toast.success("Plan de salle sauvegardé", {
        description: `${result.inserted} ajoutée(s), ${result.updated} mise(s) à jour, ${result.deleted} supprimée(s)`,
      });
    } catch (err) {
      toast.error("Erreur de sauvegarde", {
        description:
          err instanceof Error ? err.message : "Une erreur est survenue",
      });
    } finally {
      setIsSaving(false);
    }
  }, [tables, restaurantId]);

  // Déselectionner en cliquant sur le canvas vide
  const handleCanvasClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const getTableKey = (t: LocalTable) => t.id || t._tempId || "unknown";

  return (
    <div className="flex flex-col h-full">
      {/* Message mobile */}
      <div className="md:hidden flex flex-col items-center justify-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center mb-5">
          <Smartphone className="w-7 h-7 text-violet" />
        </div>
        <h3 className="font-heading text-lg font-semibold mb-1">
          Éditeur non disponible
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          L&apos;éditeur de plan de salle nécessite un écran plus large. Veuillez utiliser une tablette ou un ordinateur.
        </p>
      </div>

      {/* Éditeur (tablette+) */}
      <div className="hidden md:flex flex-col h-full gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Ajouter une table */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="default">
                    <Plus className="w-4 h-4" data-icon="inline-start" />
                    Ajouter une table
                  </Button>
                }
              />
              <DropdownMenuContent align="start" sideOffset={4}>
                <DropdownMenuItem
                  onClick={() => addTable("rectangle")}
                >
                  <RectangleHorizontal className="w-4 h-4 text-muted-foreground" />
                  Rectangle
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => addTable("round")}
                >
                  <Circle className="w-4 h-4 text-muted-foreground" />
                  Ronde
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => addTable("square")}
                >
                  <Square className="w-4 h-4 text-muted-foreground" />
                  Carrée
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Indicateur de tables */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Grid3X3 className="w-4 h-4" />
              <span>
                {tables.length} table{tables.length !== 1 ? "s" : ""}
              </span>
              {tables.length > 0 && (
                <span className="text-xs">
                  · {tables.reduce((sum, t) => sum + t.capacity, 0)} places
                </span>
              )}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            variant={hasChanges ? "default" : "outline"}
          >
            <Save className="w-4 h-4" data-icon="inline-start" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        {/* Zone principale : canvas + panneau latéral */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Canvas */}
          <Card className="flex-1 overflow-auto relative p-0">
            <div
              ref={canvasRef}
              className="overflow-auto h-full"
              style={{ minHeight: 600 }}
            >
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div
                  onClick={handleCanvasClick}
                  className="relative"
                  style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    backgroundImage: `
                      linear-gradient(to right, rgba(66, 55, 196, 0.04) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(66, 55, 196, 0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: `${GRID_SIZE * 2}px ${GRID_SIZE * 2}px`,
                  }}
                >
                  {/* Tables */}
                  {tables.map((table) => (
                    <FloorTableElement
                      key={getTableKey(table)}
                      table={table}
                      isSelected={
                        selectedId === table.id ||
                        selectedId === table._tempId
                      }
                      onSelect={() =>
                        setSelectedId(table.id || table._tempId || null)
                      }
                    />
                  ))}

                  {/* Indication si aucune table */}
                  {tables.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                      <Grid3X3 className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">Aucune table</p>
                      <p className="text-xs mt-1">
                        Cliquez sur &quot;Ajouter une table&quot; pour commencer
                      </p>
                    </div>
                  )}
                </div>
              </DndContext>
            </div>
          </Card>

          {/* Panneau latéral : propriétés de la table sélectionnée */}
          <AnimatePresence mode="wait">
            {selectedTable ? (
              <motion.div
                key="panel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className="w-[280px] shrink-0"
              >
                <Card className="p-4 h-full">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-heading text-sm font-semibold">
                        Propriétés
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Modifier la table sélectionnée
                      </p>
                    </div>

                    {/* Nom */}
                    <div className="space-y-1.5">
                      <Label htmlFor="table-name" className="text-xs">
                        Nom
                      </Label>
                      <Input
                        id="table-name"
                        value={selectedTable.name}
                        onChange={(e) =>
                          updateTable(
                            selectedTable.id || selectedTable._tempId || "",
                            { name: e.target.value }
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Capacité */}
                    <div className="space-y-1.5">
                      <Label htmlFor="table-capacity" className="text-xs">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Capacité
                        </span>
                      </Label>
                      <Input
                        id="table-capacity"
                        type="number"
                        min={1}
                        max={20}
                        value={selectedTable.capacity}
                        onChange={(e) =>
                          updateTable(
                            selectedTable.id || selectedTable._tempId || "",
                            { capacity: parseInt(e.target.value) || 1 }
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Forme */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forme</Label>
                      <Select
                        value={selectedTable.shape}
                        onValueChange={(val) => {
                          const shape = val as "rectangle" | "round" | "square";
                          const widthMap = { rectangle: 120, round: 80, square: 80 };
                          const heightMap = { rectangle: 70, round: 80, square: 80 };
                          updateTable(
                            selectedTable.id || selectedTable._tempId || "",
                            {
                              shape,
                              width: widthMap[shape],
                              height: heightMap[shape],
                            }
                          );
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">
                            <RectangleHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                            Rectangle
                          </SelectItem>
                          <SelectItem value="round">
                            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                            Ronde
                          </SelectItem>
                          <SelectItem value="square">
                            <Square className="w-3.5 h-3.5 text-muted-foreground" />
                            Carrée
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Combinable */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="table-combinable" className="text-xs">
                        Combinable
                      </Label>
                      <Switch
                        id="table-combinable"
                        checked={selectedTable.combinable}
                        onCheckedChange={(checked) =>
                          updateTable(
                            selectedTable.id || selectedTable._tempId || "",
                            { combinable: !!checked }
                          )
                        }
                        size="sm"
                      />
                    </div>

                    {/* Position (lecture seule, informatif) */}
                    <div className="pt-2 border-t">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                        Position
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-xs text-muted-foreground">
                          X : <span className="font-mono text-foreground">{selectedTable.x}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Y : <span className="font-mono text-foreground">{selectedTable.y}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          L : <span className="font-mono text-foreground">{selectedTable.width}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          H : <span className="font-mono text-foreground">{selectedTable.height}</span>
                        </div>
                      </div>
                    </div>

                    {/* Supprimer */}
                    <div className="pt-2 border-t mt-auto">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setDeleteConfirmId(
                            selectedTable.id || selectedTable._tempId || null
                          )
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" data-icon="inline-start" />
                        Supprimer cette table
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-[280px] shrink-0"
              >
                <Card className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aucune table sélectionnée
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Cliquez sur une table pour modifier ses propriétés
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette table ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La table sera retirée du plan de
              salle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteTable(deleteConfirmId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
