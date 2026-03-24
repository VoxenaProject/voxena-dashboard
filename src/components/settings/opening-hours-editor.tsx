"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

type Hours = Record<string, { open: string; close: string }>;

interface OpeningHoursEditorProps {
  value: Hours | null;
  onChange: (hours: Hours) => void;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const hours = value || {};

  function toggleDay(day: string) {
    const next = { ...hours };
    if (next[day]) {
      delete next[day];
    } else {
      next[day] = { open: "11:00", close: "22:00" };
    }
    onChange(next);
  }

  function updateTime(day: string, field: "open" | "close", val: string) {
    onChange({
      ...hours,
      [day]: { ...hours[day], [field]: val },
    });
  }

  return (
    <div className="space-y-2">
      {defaultDays.map((day) => {
        const isOpen = !!hours[day];
        return (
          <div key={day} className="flex items-center gap-3 py-1.5">
            <Switch checked={isOpen} onCheckedChange={() => toggleDay(day)} />
            <Label className="w-20 text-sm font-medium">{dayLabels[day]}</Label>
            {isOpen ? (
              <div className="flex items-center gap-2 text-sm">
                <Input
                  type="time"
                  value={hours[day].open}
                  onChange={(e) => updateTime(day, "open", e.target.value)}
                  className="h-8 w-24 text-sm"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="time"
                  value={hours[day].close}
                  onChange={(e) => updateTime(day, "close", e.target.value)}
                  className="h-8 w-24 text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Fermé</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
