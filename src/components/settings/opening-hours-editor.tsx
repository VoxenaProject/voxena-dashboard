"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Copy, Coffee, UtensilsCrossed, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const dayLabels: Record<string, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

const defaultDays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// Générer les options d'heures (06:00 → 03:00, par tranches de 30 min)
const timeOptions: string[] = [];
for (let h = 6; h < 24; h++) {
  timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
  timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
}
for (let h = 0; h <= 3; h++) {
  timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 3) timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
}

// Noms de services prédéfinis
const servicePresets = [
  { label: "Petit-déjeuner", icon: Coffee, from: "07:00", to: "10:30" },
  { label: "Midi", icon: UtensilsCrossed, from: "11:30", to: "14:30" },
  { label: "Soir", icon: Moon, from: "18:00", to: "22:30" },
];

// Deviner le label du service basé sur l'heure d'ouverture
function guessServiceLabel(open: string): { label: string; icon: typeof Coffee } {
  const h = parseInt(open.split(":")[0]);
  if (h < 11) return { label: "Petit-déjeuner", icon: Coffee };
  if (h < 16) return { label: "Midi", icon: UtensilsCrossed };
  return { label: "Soir", icon: Moon };
}

type DaySlots = { from: string; to: string }[];
type Hours = Record<string, { open: boolean; services: DaySlots }>;

interface OpeningHoursEditorProps {
  value: Hours | null;
  onChange: (hours: Hours) => void;
}

// ── Dropdown de duplication (click-based, pas hover) ──
function DuplicateDropdown({ onWeekdays, onAll }: { onWeekdays: () => void; onAll: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative ml-auto sm:ml-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground/40 hover:text-violet transition-colors p-1"
        title="Dupliquer ces horaires"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[200px]">
          <button
            type="button"
            onClick={() => { onWeekdays(); setOpen(false); }}
            className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors"
          >
            Appliquer à la semaine (Lun-Ven)
          </button>
          <button
            type="button"
            onClick={() => { onAll(); setOpen(false); }}
            className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors"
          >
            Appliquer à tous les jours
          </button>
        </div>
      )}
    </div>
  );
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  // Normaliser l'ancien format vers le nouveau
  const hours = normalizeHours(value);

  function toggleDay(day: string) {
    const next = { ...hours };
    if (next[day]?.open) {
      next[day] = { open: false, services: [] };
    } else {
      // Par défaut : service continu
      next[day] = { open: true, services: [{ from: "11:00", to: "23:00" }] };
    }
    onChange(next);
  }

  function addService(day: string, preset?: typeof servicePresets[0]) {
    const dayData = hours[day] || { open: true, services: [] };
    const services = [...dayData.services];
    if (preset) {
      services.push({ from: preset.from, to: preset.to });
    } else {
      services.push({ from: "18:00", to: "22:30" });
    }
    // Trier par heure d'ouverture
    services.sort((a, b) => a.from.localeCompare(b.from));
    onChange({ ...hours, [day]: { open: true, services } });
  }

  function removeService(day: string, index: number) {
    const services = (hours[day]?.services || []).filter((_, i) => i !== index);
    if (services.length === 0) {
      onChange({ ...hours, [day]: { open: false, services: [] } });
    } else {
      onChange({ ...hours, [day]: { open: true, services } });
    }
  }

  function updateService(day: string, index: number, field: "from" | "to", val: string) {
    const services = [...(hours[day]?.services || [])];
    services[index] = { ...services[index], [field]: val };
    onChange({ ...hours, [day]: { ...hours[day], services } });
  }

  // Dupliquer les horaires d'un jour vers d'autres jours
  function duplicateToAll(sourceDay: string) {
    const source = hours[sourceDay];
    if (!source) return;
    const next = { ...hours };
    for (const day of defaultDays) {
      if (day !== sourceDay) {
        next[day] = { open: source.open, services: [...source.services.map((s) => ({ ...s }))] };
      }
    }
    onChange(next);
  }

  function duplicateToWeekdays(sourceDay: string) {
    const source = hours[sourceDay];
    if (!source) return;
    const weekdays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
    const next = { ...hours };
    for (const day of weekdays) {
      if (day !== sourceDay) {
        next[day] = { open: source.open, services: [...source.services.map((s) => ({ ...s }))] };
      }
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {defaultDays.map((day) => {
        const dayData = hours[day] || { open: false, services: [] };
        const isOpen = dayData.open && dayData.services.length > 0;

        return (
          <div
            key={day}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              isOpen ? "border-border bg-background" : "border-border/40 bg-muted/10"
            }`}
          >
            {/* En-tête du jour */}
            <div className="flex items-center gap-3">
              <Switch checked={isOpen} onCheckedChange={() => toggleDay(day)} />
              <span className="w-24 text-sm font-medium">{dayLabels[day]}</span>

              {!isOpen && (
                <span className="text-xs text-muted-foreground/50">Fermé</span>
              )}

              {/* Résumé compact quand fermé visuellement mais a des services */}
              {isOpen && (
                <span className="text-xs text-muted-foreground/50 ml-auto hidden sm:block">
                  {dayData.services.map((s) => `${s.from}–${s.to}`).join(", ")}
                </span>
              )}

              {/* Bouton dupliquer */}
              {isOpen && (
                <DuplicateDropdown
                  onWeekdays={() => duplicateToWeekdays(day)}
                  onAll={() => duplicateToAll(day)}
                />
              )}
            </div>

            {/* Services du jour */}
            {isOpen && (
              <div className="mt-3 ml-[52px] space-y-2">
                {dayData.services.map((slot, i) => {
                  const serviceInfo = guessServiceLabel(slot.from);
                  const ServiceIcon = serviceInfo.icon;

                  return (
                    <div key={i} className="flex items-center gap-2">
                      {/* Label du service avec icône */}
                      <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                        <ServiceIcon className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {serviceInfo.label}
                        </span>
                      </div>

                      {/* Heures */}
                      <TimeSelect value={slot.from} onChange={(v) => updateService(day, i, "from", v)} />
                      <span className="text-xs text-muted-foreground/40">→</span>
                      <TimeSelect value={slot.to} onChange={(v) => updateService(day, i, "to", v)} />

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => removeService(day, i)}
                        className="text-muted-foreground/30 hover:text-red-500 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Ajouter un service — boutons presets */}
                {dayData.services.length < 3 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-muted-foreground/40 mr-1">Ajouter :</span>
                    {servicePresets
                      .filter((preset) => !dayData.services.some((s) => {
                        const h = parseInt(s.from.split(":")[0]);
                        if (preset.label === "Petit-déjeuner") return h < 11;
                        if (preset.label === "Midi") return h >= 11 && h < 16;
                        return h >= 16;
                      }))
                      .map((preset) => {
                        const PresetIcon = preset.icon;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => addService(day, preset)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-border/50 text-muted-foreground hover:text-violet hover:border-violet/30 transition-colors"
                          >
                            <PresetIcon className="w-3 h-3" />
                            {preset.label}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Normaliser l'ancien format vers le nouveau ──
function normalizeHours(raw: unknown): Hours {
  if (!raw || typeof raw !== "object") return {};
  const result: Hours = {};
  const obj = raw as Record<string, unknown>;

  for (const day of defaultDays) {
    const val = obj[day];
    if (!val) {
      result[day] = { open: false, services: [] };
    } else if (typeof val === "object" && val !== null) {
      const v = val as Record<string, unknown>;
      if ("open" in v && "services" in v) {
        // Nouveau format : { open: true, services: [{ from, to }] }
        result[day] = {
          open: v.open as boolean,
          services: (v.services as { from: string; to: string }[]) || [],
        };
      } else if (Array.isArray(val)) {
        // Ancien format : [{ open: "11:00", close: "22:00" }]
        result[day] = {
          open: val.length > 0,
          services: val.map((s: { open?: string; close?: string; from?: string; to?: string }) => ({
            from: s.from || s.open || "11:00",
            to: s.to || s.close || "22:00",
          })),
        };
      }
    }
  }
  return result;
}

// ── Select d'heure ──
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet/20 cursor-pointer"
    >
      {timeOptions.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
