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
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarDays, Hourglass, AlertTriangle } from "lucide-react";
import { ZONES } from "@/lib/floor-plan/zones";
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
  /** Forcer le mode liste d'attente */
  forceWaitlist?: boolean;
  onSaved?: (reservation: Reservation) => void;
}

export function ReservationDialog({
  open,
  onOpenChange,
  restaurantId,
  tables,
  reservation,
  defaultDate,
  forceWaitlist = false,
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
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // État liste d'attente
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [noTablesAvailable, setNoTablesAvailable] = useState(false);

  // Tables disponibles pour le créneau sélectionné
  const [availableTables, setAvailableTables] = useState<
    { id: string; name: string; capacity: number; zone?: string }[]
  >([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Remplir le formulaire en mode édition ou reset
  useEffect(() => {
    if (reservation) {
      setDate(reservation.date);
      setTimeSlot(reservation.time_slot);
      setCovers(reservation.covers);
      setCustomerName(reservation.customer_name);
      setCustomerPhone(reservation.customer_phone || "");
      setCustomerEmail(reservation.customer_email || "");
      setTableId(reservation.table_id || "");
      setIsWaitlist(reservation.status === "liste_attente");
      setNoTablesAvailable(false);

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
      setZoneFilter("");
      setIsWaitlist(forceWaitlist);
      setNoTablesAvailable(false);
    }
  }, [reservation, defaultDate, open, forceWaitlist]);

  // Charger les tables disponibles quand date/heure/couverts changent
  useEffect(() => {
    if (!open || !date || !timeSlot) return;

    async function fetchAvailability() {
      setLoadingTables(true);
      try {
        let url = `/api/reservations/availability?restaurant_id=${restaurantId}&date=${date}&covers=${covers}`;
        if (zoneFilter) {
          url += `&zone=${zoneFilter}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const matchingSlot = data.slots?.find(
            (s: { time: string }) => s.time === timeSlot
          );
          const slotTables = matchingSlot?.tables || [];
          setAvailableTables(slotTables);

          // Auto-détecter : aucune table disponible → suggérer la liste d'attente
          setNoTablesAvailable(slotTables.length === 0);

          // Auto-sélectionner la meilleure table si aucune sélectionnée
          if (!tableId && slotTables.length > 0) {
            setTableId(slotTables[0].id);
          }
        }
      } catch {
        // Silencieux — on garde les tables du composant parent comme fallback
      } finally {
        setLoadingTables(false);
      }
    }

    fetchAvailability();
  }, [open, date, timeSlot, covers, restaurantId, tableId, zoneFilter]);

  // Tables affichées : soit celles de l'API dispo, soit toutes les tables du restaurant
  // Filtrées par zone si une zone est sélectionnée
  const displayTables =
    availableTables.length > 0
      ? availableTables
      : tables
          .filter((t) => t.is_active && t.capacity >= covers && (!zoneFilter || (t.zone || "salle") === zoneFilter))
          .map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, zone: t.zone || "salle" }));

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
        table_id: isWaitlist ? null : (tableId || null),
        notes: notes.trim() || null,
        preferences,
        occasion,
        source: "manual" as const,
        // Envoyer le statut waitlist si activé (uniquement en création)
        ...(isWaitlist && !isEdit ? { status: "liste_attente" } : {}),
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

      if (isWaitlist && !isEdit) {
        toast.success("Client ajouté à la liste d'attente", {
          description: `${customerName.trim()} — ${covers} couvert${covers > 1 ? "s" : ""}`,
        });
      } else {
        toast.success(
          isEdit ? "Réservation mise à jour" : "Réservation créée avec succès"
        );
      }

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
            {isWaitlist ? (
              <Hourglass className="w-5 h-5 text-amber-500" />
            ) : (
              <CalendarDays className="w-5 h-5 text-violet" />
            )}
            {isWaitlist
              ? "Ajouter à la liste d'attente"
              : isEdit
                ? "Modifier la réservation"
                : "Nouvelle réservation"}
          </DialogTitle>
          <DialogDescription>
            {isWaitlist
              ? "Le client sera ajouté à la file d'attente et notifié quand une table se libère."
              : isEdit
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

          {/* Alerte aucune table disponible */}
          {noTablesAvailable && !isEdit && !isWaitlist && !loadingTables && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Aucune table disponible</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Aucune table ne correspond à ce créneau et nombre de couverts.
                  Vous pouvez ajouter le client à la liste d&apos;attente.
                </p>
              </div>
            </div>
          )}

          {/* Toggle liste d'attente */}
          {!isEdit && (
            <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${isWaitlist ? "border-amber-300 bg-amber-50/50" : ""}`}>
              <div className="flex items-center gap-2">
                <Hourglass className={`w-4 h-4 ${isWaitlist ? "text-amber-500" : "text-muted-foreground"}`} />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">
                    Ajouter à la liste d&apos;attente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Pas de table assignée, le client patiente
                  </p>
                </div>
              </div>
              <Switch
                checked={isWaitlist}
                onCheckedChange={(checked) => {
                  setIsWaitlist(!!checked);
                  if (checked) setTableId("");
                }}
              />
            </div>
          )}

          {/* Zone + Table (masqués si mode waitlist) */}
          {!isWaitlist && (
            <>
              {/* Zone */}
              <div className="space-y-1.5">
                <Label>Zone</Label>
                <Select
                  value={zoneFilter}
                  onValueChange={(v) => {
                    setZoneFilter(v ?? "");
                    setTableId(""); // Reset table quand on change de zone
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Toutes les zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les zones</SelectItem>
                    {ZONES.map((z) => (
                      <SelectItem key={z.value} value={z.value}>
                        {z.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </>
          )}

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
          <Button
            onClick={handleSave}
            disabled={saving}
            className={isWaitlist && !isEdit ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isWaitlist && !isEdit ? (
              <>
                <Hourglass className="w-4 h-4 mr-1.5" />
                Ajouter à la liste d&apos;attente
              </>
            ) : isEdit ? (
              "Enregistrer"
            ) : (
              "Créer la réservation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
