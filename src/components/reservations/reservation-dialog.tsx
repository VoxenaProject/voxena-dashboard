"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarDays } from "lucide-react";
import type { Reservation, FloorTable } from "@/lib/supabase/types";

// Créneaux horaires de 30 min de 11:00 à 23:00
const TIME_SLOTS: string[] = [];
for (let h = 11; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 23) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
  }
}

const PREFERENCES_OPTIONS = [
  "Terrasse",
  "Fenêtre",
  "Coin tranquille",
  "Chaise haute",
];

const OCCASION_OPTIONS = [
  "Aucune",
  "Anniversaire",
  "Dîner d'affaires",
  "Premier rendez-vous",
  "Fête",
];

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  tables: FloorTable[];
  /** Si fourni, mode édition */
  reservation?: Reservation | null;
  /** Date par défaut (YYYY-MM-DD) */
  defaultDate?: string;
  onSaved?: (reservation: Reservation) => void;
}

export function ReservationDialog({
  open,
  onOpenChange,
  restaurantId,
  tables,
  reservation,
  defaultDate,
  onSaved,
}: ReservationDialogProps) {
  const isEdit = !!reservation;

  // État du formulaire
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState("19:00");
  const [covers, setCovers] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [occasion, setOccasion] = useState("Aucune");
  const [notes, setNotes] = useState("");
  const [tableId, setTableId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Tables disponibles pour le créneau sélectionné
  const [availableTables, setAvailableTables] = useState<
    { id: string; name: string; capacity: number }[]
  >([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Remplir le formulaire en mode édition
  useEffect(() => {
    if (reservation) {
      setDate(reservation.date);
      setTimeSlot(reservation.time_slot);
      setCovers(reservation.covers);
      setCustomerName(reservation.customer_name);
      setCustomerPhone(reservation.customer_phone || "");
      setCustomerEmail(reservation.customer_email || "");
      setTableId(reservation.table_id || "");

      // Extraire les préférences et occasion des notes
      const notesStr = reservation.notes || "";
      const prefMatch = notesStr.match(/\[Préférences: ([^\]]+)\]/);
      if (prefMatch) {
        setPreferences(prefMatch[1].split(", "));
      } else {
        setPreferences([]);
      }
      const occMatch = notesStr.match(/\[Occasion: ([^\]]+)\]/);
      if (occMatch) {
        setOccasion(occMatch[1]);
      } else {
        setOccasion("Aucune");
      }
      // Notes nettoyées
      const cleanNotes = notesStr
        .replace(/\[Préférences: [^\]]+\]\s*/g, "")
        .replace(/\[Occasion: [^\]]+\]\s*/g, "")
        .trim();
      setNotes(cleanNotes);
    } else {
      // Reset pour nouvelle réservation
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setTimeSlot("19:00");
      setCovers(2);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setPreferences([]);
      setOccasion("Aucune");
      setNotes("");
      setTableId("");
    }
  }, [reservation, defaultDate, open]);

  // Charger les tables disponibles quand date/heure/couverts changent
  useEffect(() => {
    if (!open || !date || !timeSlot) return;

    async function fetchAvailability() {
      setLoadingTables(true);
      try {
        const res = await fetch(
          `/api/reservations/availability?restaurant_id=${restaurantId}&date=${date}&covers=${covers}`
        );
        if (res.ok) {
          const data = await res.json();
          const matchingSlot = data.slots?.find(
            (s: { time: string }) => s.time === timeSlot
          );
          setAvailableTables(matchingSlot?.tables || []);

          // Auto-sélectionner la meilleure table si aucune sélectionnée
          if (!tableId && matchingSlot?.tables?.length > 0) {
            setTableId(matchingSlot.tables[0].id);
          }
        }
      } catch {
        // Silencieux — on garde les tables du composant parent comme fallback
      } finally {
        setLoadingTables(false);
      }
    }

    fetchAvailability();
  }, [open, date, timeSlot, covers, restaurantId, tableId]);

  // Tables affichées : soit celles de l'API dispo, soit toutes les tables du restaurant
  const displayTables =
    availableTables.length > 0
      ? availableTables
      : tables
          .filter((t) => t.is_active && t.capacity >= covers)
          .map((t) => ({ id: t.id, name: t.name, capacity: t.capacity }));

  function togglePreference(pref: string) {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  }

  async function handleSave() {
    if (!customerName.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...(isEdit ? { id: reservation!.id } : {}),
        restaurant_id: restaurantId,
        date,
        time_slot: timeSlot,
        covers,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        table_id: tableId || null,
        notes: notes.trim() || null,
        preferences,
        occasion,
        source: "manual" as const,
      };

      const res = await fetch("/api/reservations", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la sauvegarde");
      }

      const data = await res.json();
      toast.success(
        isEdit ? "Réservation mise à jour" : "Réservation créée avec succès"
      );
      onSaved?.(data.reservation);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet" />
            {isEdit ? "Modifier la réservation" : "Nouvelle réservation"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les détails de la réservation."
              : "Remplissez les informations pour créer une réservation."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Date et heure */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="resa-date">Date</Label>
              <Input
                id="resa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Heure</Label>
              <Select value={timeSlot} onValueChange={(v) => setTimeSlot(v ?? "19:00")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Couverts */}
          <div className="space-y-1.5">
            <Label htmlFor="resa-covers">Couverts</Label>
            <Input
              id="resa-covers"
              type="number"
              min={1}
              max={20}
              value={covers}
              onChange={(e) => setCovers(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            />
          </div>

          {/* Nom + Téléphone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="resa-name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resa-name"
                placeholder="Jean Dupont"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resa-phone">Téléphone</Label>
              <Input
                id="resa-phone"
                placeholder="+32 470 12 34 56"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="resa-email">Email</Label>
            <Input
              id="resa-email"
              type="email"
              placeholder="jean@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="space-y-1.5">
            <Label>
              Table
              {loadingTables && (
                <Loader2 className="w-3 h-3 ml-1 animate-spin inline" />
              )}
            </Label>
            <Select value={tableId} onValueChange={(v) => setTableId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auto-attribution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-attribution</SelectItem>
                {displayTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.capacity} places)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Préférences */}
          <div className="space-y-2">
            <Label>Préférences</Label>
            <div className="flex flex-wrap gap-3">
              {PREFERENCES_OPTIONS.map((pref) => (
                <label
                  key={pref}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={preferences.includes(pref)}
                    onCheckedChange={() => togglePreference(pref)}
                  />
                  {pref}
                </label>
              ))}
            </div>
          </div>

          {/* Occasion */}
          <div className="space-y-1.5">
            <Label>Occasion</Label>
            <Select value={occasion} onValueChange={(v) => setOccasion(v ?? "Aucune")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OCCASION_OPTIONS.map((occ) => (
                  <SelectItem key={occ} value={occ}>
                    {occ}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="resa-notes">Notes</Label>
            <Textarea
              id="resa-notes"
              placeholder="Informations supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer la réservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
