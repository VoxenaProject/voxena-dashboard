"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileUp,
  Loader2,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ParsedCategory {
  name: string;
  items: { name: string; price: number; description: string }[];
}

interface MenuPdfImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    categories: ParsedCategory[]
  ) => Promise<void>;
}

export function MenuPdfImport({ open, onClose, onImport }: MenuPdfImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing">(
    "upload"
  );
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setCategories([]);
    setSelectedCats(new Set());
    setExpandedCats(new Set());
    setLoading(false);
    setFileName("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/menu-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.categories?.length) {
        toast.error(
          data.error || "Aucune catégorie trouvée dans ce PDF"
        );
        setLoading(false);
        return;
      }

      setCategories(data.categories);
      // Tout sélectionner par défaut
      setSelectedCats(new Set(data.categories.map((_: ParsedCategory, i: number) => i)));
      setStep("preview");
    } catch {
      toast.error("Erreur lors du traitement du PDF");
    }
    setLoading(false);
  }

  function toggleCategory(idx: number) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleExpand(idx: number) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleImport() {
    const selected = categories.filter((_, i) => selectedCats.has(i));
    if (selected.length === 0) return;

    setStep("importing");
    try {
      await onImport(selected);
      toast.success(
        `${selected.length} catégorie${selected.length > 1 ? "s" : ""} importée${selected.length > 1 ? "s" : ""}`
      );
      handleClose();
    } catch {
      toast.error("Erreur lors de l'import");
      setStep("preview");
    }
  }

  const totalItems = categories
    .filter((_, i) => selectedCats.has(i))
    .reduce((sum, c) => sum + c.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileUp className="w-5 h-5 text-violet" />
            Importer un menu PDF
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Étape 1 : Upload */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-violet/40 hover:bg-violet/[0.02] transition-all"
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-violet animate-spin" />
                    <p className="text-sm font-medium">
                      Analyse de {fileName}...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet/8 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-violet" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-0.5">
                        Glissez votre menu PDF ici
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ou cliquez pour parcourir vos fichiers
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Le PDF sera analysé pour en extraire les catégories, articles et
                prix automatiquement.
              </p>
            </motion.div>
          )}

          {/* Étape 2 : Preview */}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-2"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {categories.length} catégorie
                  {categories.length > 1 ? "s" : ""} trouvée
                  {categories.length > 1 ? "s" : ""}
                </p>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedCats.size} sélectionnée
                  {selectedCats.size > 1 ? "s" : ""} · {totalItems} articles
                </Badge>
              </div>

              <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
                {categories.map((cat, i) => {
                  const selected = selectedCats.has(i);
                  const expanded = expandedCats.has(i);

                  return (
                    <div
                      key={i}
                      className={`rounded-lg border transition-colors ${
                        selected
                          ? "border-violet/20 bg-violet/[0.02]"
                          : "border-border/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          onClick={() => toggleCategory(i)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            selected
                              ? "bg-violet border-violet text-white"
                              : "border-border"
                          }`}
                        >
                          {selected && <Check className="w-2.5 h-2.5" />}
                        </button>

                        <button
                          onClick={() => toggleExpand(i)}
                          className="flex items-center gap-1 flex-1 min-w-0 text-left"
                        >
                          {expanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {cat.name}
                          </span>
                        </button>

                        <span className="text-[10px] text-muted-foreground font-mono">
                          {cat.items.length} articles
                        </span>
                      </div>

                      {expanded && (
                        <div className="px-3 pb-2 pl-9 space-y-1">
                          {cat.items.map((item, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">
                                  {item.name}
                                </span>
                                {item.description && (
                                  <span className="text-muted-foreground ml-1">
                                    — {item.description}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-semibold ml-2 flex-shrink-0">
                                {item.price.toFixed(2)}€
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedCats.size === 0}
                >
                  Importer {selectedCats.size} catégorie
                  {selectedCats.size > 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* Étape 3 : Import en cours */}
          {step === "importing" && (
            <motion.div
              key="importing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-10 text-center"
            >
              <Loader2 className="w-8 h-8 text-violet animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Import en cours...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
