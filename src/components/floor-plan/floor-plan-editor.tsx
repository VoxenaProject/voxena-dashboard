"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Minus,
  Save,
  RectangleHorizontal,
  Circle,
  Square,
  Trash2,
  Users,
  Smartphone,
  Grid3X3,
  Undo2,
  Redo2,
  RotateCcw,
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
import { ZONES } from "@/lib/floor-plan/zones";
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
  const [activeZone, setActiveZone] = useState<string>("all");
  // Zoom : 0.5 à 2.0 (50% à 200%)
  const [zoom, setZoom] = useState(1.0);
  // Historique pour undo/redo
  const [history, setHistory] = useState<LocalTable[][]>([]);
  const [undoStack, setUndoStack] = useState<LocalTable[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Pousser l'état actuel dans l'historique avant chaque action
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-49), tables.map((t) => ({ ...t }))]);
    setUndoStack([]); // Effacer le redo sur nouvelle action
  }, [tables]);

  // Annuler la dernière action
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setUndoStack((stack) => [...stack, tables.map((t) => ({ ...t }))]);
    setHistory((h) => h.slice(0, -1));
    setTables(prev);
    setHasChanges(true);
  }, [history, tables]);

  // Rétablir la dernière action annulée
  const redo = useCallback(() => {
    if (undoStack.length === 0) return;
    const next = undoStack[undoStack.length - 1];
    setHistory((h) => [...h, tables.map((t) => ({ ...t }))]);
    setUndoStack((stack) => stack.slice(0, -1));
    setTables(next);
    setHasChanges(true);
  }, [undoStack, tables]);

  // Contrôles de zoom
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(1.0);
  }, []);

  // Raccourcis clavier : Ctrl+Z (undo), Ctrl+Shift+Z (redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Zoom avec Ctrl+scroll
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) =>
          Math.max(0.5, Math.min(2.0, Math.round((z + delta) * 10) / 10))
        );
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

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

  // Mettre à jour une table dans le state local (avec historique)
  const updateTable = useCallback(
    (tableId: string, updates: Partial<LocalTable>) => {
      pushHistory();
      setTables((prev) =>
        prev.map((t) =>
          (t.id === tableId || t._tempId === tableId) ? { ...t, ...updates } : t
        )
      );
      setHasChanges(true);
    },
    [pushHistory]
  );

  // Ajouter une table (avec historique)
  const addTable = useCallback(
    (shape: "rectangle" | "round" | "square") => {
      pushHistory();
      const count = tables.length;
      const defaultCapacity = shape === "round" ? 4 : 2;
      const defaultWidth = shape === "rectangle" ? 120 : 80;
      const defaultHeight = shape === "rectangle" ? 70 : 80;

      // Positionner au centre de la zone visible (en tenant compte du zoom)
      const canvasEl = canvasRef.current;
      const scrollLeft = canvasEl?.scrollLeft || 0;
      const scrollTop = canvasEl?.scrollTop || 0;
      const viewWidth = canvasEl?.clientWidth || CANVAS_WIDTH;
      const viewHeight = canvasEl?.clientHeight || CANVAS_HEIGHT;

      const centerX = snapToGrid(
        scrollLeft / zoom + viewWidth / (2 * zoom) - defaultWidth / 2
      );
      const centerY = snapToGrid(
        scrollTop / zoom + viewHeight / (2 * zoom) - defaultHeight / 2
      );

      const tempId = generateTempId();

      // Zone par défaut = zone active (ou "salle" si on affiche toutes)
      const defaultZone = activeZone !== "all" ? activeZone : "salle";

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
        zone: defaultZone,
        combinable: true,
        is_active: true,
        sort_order: count,
        created_at: new Date().toISOString(),
      };

      setTables((prev) => [...prev, newTable]);
      setSelectedId(tempId);
      setHasChanges(true);
    },
    [tables.length, restaurantId, activeZone, pushHistory, zoom]
  );

  // Supprimer une table (avec historique)
  const deleteTable = useCallback(
    (tableId: string) => {
      pushHistory();
      setTables((prev) =>
        prev.filter((t) => t.id !== tableId && t._tempId !== tableId)
      );
      if (selectedId === tableId) setSelectedId(null);
      setDeleteConfirmId(null);
      setHasChanges(true);
    },
    [selectedId, pushHistory]
  );

  // Gestion du drag end (avec historique et compensation du zoom)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const tableId = active.id as string;

      pushHistory();
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === tableId || t._tempId === tableId) {
            return {
              ...t,
              x: snapToGrid(Math.max(0, t.x + delta.x / zoom)),
              y: snapToGrid(Math.max(0, t.y + delta.y / zoom)),
            };
          }
          return t;
        })
      );
      setHasChanges(true);
    },
    [zoom, pushHistory]
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
          zone: t.zone || "salle",
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
      <div className="lg:hidden flex flex-col items-center justify-center py-16 px-4">
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
      <div className="hidden lg:flex flex-col h-full gap-4">
        {/* Toolbar — glass effect */}
        <div className="flex items-center justify-between gap-3 flex-wrap toolbar-glass rounded-xl p-3 border border-border/50 shadow-sm">
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

            {/* Séparateur */}
            <div className="w-px h-6 bg-border" />

            {/* Undo / Redo — clearer disabled state */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 transition-all ${history.length === 0 ? "opacity-30" : "hover:bg-accent"}`}
                onClick={undo}
                disabled={history.length === 0}
                title="Annuler (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 transition-all ${undoStack.length === 0 ? "opacity-30" : "hover:bg-accent"}`}
                onClick={redo}
                disabled={undoStack.length === 0}
                title="Rétablir (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Séparateur */}
            <div className="w-px h-6 bg-border" />

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

        {/* Filtres par zone */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveZone("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeZone === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
          >
            Toutes
            <span className="text-[10px] opacity-70">{tables.length}</span>
          </button>
          {ZONES.map((zone) => {
            const count = tables.filter((t) => (t.zone || "salle") === zone.value).length;
            return (
              <button
                key={zone.value}
                onClick={() => setActiveZone(zone.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  activeZone === zone.value
                    ? `${zone.color} border-current/20`
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${zone.dotColor}`} />
                {zone.label}
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Zone principale : canvas + panneau latéral */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Canvas avec zoom — dot grid + inner shadow */}
          <Card className="flex-1 overflow-hidden relative p-0 shadow-inner">
            <div
              ref={canvasRef}
              className="overflow-auto h-full"
              style={{ minHeight: 600 }}
            >
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                {/* Conteneur de zoom — scale le contenu, garde les dimensions logiques */}
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                  }}
                >
                  <div
                    onClick={handleCanvasClick}
                    className="relative floor-canvas-grid"
                    style={{
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                    }}
                  >
                    {/* Vignette overlay pour la profondeur */}
                    <div
                      className="absolute inset-0 pointer-events-none floor-canvas-vignette"
                      style={{ zIndex: 0 }}
                    />
                    {/* Tables (filtrées par zone active) */}
                    {tables
                      .filter((t) =>
                        activeZone === "all" ? true : (t.zone || "salle") === activeZone
                      )
                      .map((table) => (
                        <FloorTableElement
                          key={getTableKey(table)}
                          table={table}
                          zone={table.zone || "salle"}
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
                </div>
              </DndContext>
            </div>

            {/* Contrôles de zoom (en bas à droite du canvas) — glass + bigger targets */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-xl border rounded-xl shadow-md p-1.5 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                title="Dezoomer"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <button
                onClick={zoomReset}
                className="px-2.5 py-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors min-w-[3.5rem] text-center rounded-md hover:bg-accent"
                title="Reinitialiser le zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={zoomIn}
                disabled={zoom >= 2.0}
                title="Zoomer"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={zoomReset}
                disabled={zoom === 1.0}
                title="Reinitialiser a 100%"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Panneau latéral : propriétés de la table sélectionnée */}
          <AnimatePresence mode="wait">
            {selectedTable ? (
              <motion.div
                key="panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="w-[280px] shrink-0"
              >
                <Card className="p-4 h-full">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-heading text-sm font-semibold">
                        Proprietes
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Modifier la table selectionnee
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
                        className="h-8 text-sm rounded-xl"
                      />
                    </div>

                    {/* Capacite */}
                    <div className="space-y-1.5">
                      <Label htmlFor="table-capacity" className="text-xs">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Capacite
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
                        className="h-8 text-sm rounded-xl"
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

                    {/* Zone */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Zone</Label>
                      <Select
                        value={selectedTable.zone || "salle"}
                        onValueChange={(val) =>
                          updateTable(
                            selectedTable.id || selectedTable._tempId || "",
                            { zone: val ?? "salle" }
                          )
                        }
                      >
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONES.map((z) => (
                            <SelectItem key={z.value} value={z.value}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${z.dotColor}`} />
                                {z.label}
                              </span>
                            </SelectItem>
                          ))}
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

                    {/* Supprimer — plus subtil */}
                    <div className="pt-2 border-t mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 transition-all"
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
