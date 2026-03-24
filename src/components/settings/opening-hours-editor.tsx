"use client";

import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const dayLabels: Record<string, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

const defaultDays = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

// Générer les options d'heures (de 06:00 à 03:00 le lendemain, par tranches de 30min)
const timeOptions: string[] = [];
for (let h = 6; h < 24; h++) {
  timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
  timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
}
for (let h = 0; h <= 3; h++) {
  timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 3) timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
}

// Format : { "lundi": [{ open: "11:30", close: "14:30" }, { open: "18:00", close: "22:30" }] }
type DaySlots = { open: string; close: string }[];
type Hours = Record<string, DaySlots>;

interface OpeningHoursEditorProps {
  value: Hours | null;
  onChange: (hours: Hours) => void;
}

export function OpeningHoursEditor({
  value,
  onChange,
}: OpeningHoursEditorProps) {
  const hours: Hours = value || {};

  function toggleDay(day: string) {
    const next = { ...hours };
    if (next[day] && next[day].length > 0) {
      delete next[day];
    } else {
      // Par défaut : service continu
      next[day] = [{ open: "11:00", close: "22:00" }];
    }
    onChange(next);
  }

  function addSlot(day: string) {
    const slots = [...(hours[day] || [])];
    // Ajouter un service du soir par défaut
    slots.push({ open: "18:00", close: "22:30" });
    onChange({ ...hours, [day]: slots });
  }

  function removeSlot(day: string, slotIndex: number) {
    const slots = (hours[day] || []).filter((_, i) => i !== slotIndex);
    if (slots.length === 0) {
      const next = { ...hours };
      delete next[day];
      onChange(next);
    } else {
      onChange({ ...hours, [day]: slots });
    }
  }

  function updateSlot(
    day: string,
    slotIndex: number,
    field: "open" | "close",
    val: string
  ) {
    const slots = [...(hours[day] || [])];
    slots[slotIndex] = { ...slots[slotIndex], [field]: val };
    onChange({ ...hours, [day]: slots });
  }

  return (
    <div className="space-y-3">
      {defaultDays.map((day) => {
        const slots = hours[day] || [];
        const isOpen = slots.length > 0;

        return (
          <div
            key={day}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              isOpen ? "border-border bg-background" : "border-border/50 bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={isOpen}
                onCheckedChange={() => toggleDay(day)}
              />
              <Label className="w-24 text-sm font-medium">
                {dayLabels[day]}
              </Label>

              {!isOpen && (
                <span className="text-sm text-muted-foreground">Fermé</span>
              )}
            </div>

            {isOpen && (
              <div className="mt-2.5 ml-[52px] space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {slots.length > 1 && (
                      <span className="text-[10px] text-muted-foreground font-mono w-6">
                        {i === 0 ? "midi" : "soir"}
                      </span>
                    )}
                    <TimeSelect
                      value={slot.open}
                      onChange={(v) => updateSlot(day, i, "open", v)}
                    />
                    <span className="text-xs text-muted-foreground">à</span>
                    <TimeSelect
                      value={slot.close}
                      onChange={(v) => updateSlot(day, i, "close", v)}
                    />
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(day, i)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {slots.length < 2 && (
                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-violet transition-colors font-medium mt-1"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter un service (ex: soir)
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Select d'heure ──

function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
    >
      {timeOptions.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
