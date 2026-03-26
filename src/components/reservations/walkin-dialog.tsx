"use client";

import { useState } from "react";
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
import { Loader2, UserPlus } from "lucide-react";

interface WalkinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
}

/**
 * Dialog simplifié pour les walk-ins.
 * Champs minimaux : nombre de couverts (requis), nom (optionnel), notes (optionnel).
 * Crée directement une réservation avec statut "assise", date=aujourd'hui, heure=maintenant.
 */
export function WalkinDialog({
  open,
  onOpenChange,
  restaurantId,
}: WalkinDialogProps) {
  const [covers, setCovers] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset du formulaire à l'ouverture
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setCovers(2);
      setCustomerName("");
      setNotes("");
    }
    onOpenChange(isOpen);
  }

  async function handleSubmit() {
    if (covers < 1) {
      toast.error("Le nombre de couverts est requis");
      return;
    }

    setSaving(true);

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const timeSlot = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const payload = {
        restaurant_id: restaurantId,
        date: today,
        time_slot: timeSlot,
        covers,
        customer_name: customerName.trim() || "Walk-in",
        source: "manual",
        status: "assise",
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création");
      }

      const data = await res.json();
      // Récupérer le nom de la table assignée
      const tableName = data.reservation?.floor_tables?.name;

      toast.success(
        tableName
          ? `Walk-in installé — ${tableName}`
          : "Walk-in installé avec succès"
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création du walk-in"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green" />
            Walk-in rapide
          </DialogTitle>
          <DialogDescription>
            Installez un client sans réservation en un clic.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Nombre de couverts — champ principal */}
          <div className="space-y-1.5">
            <Label htmlFor="walkin-covers">
              Nombre de personnes <span className="text-destructive">*</span>
            </Label>
            <Input
              id="walkin-covers"
              type="number"
              min={1}
              max={20}
              value={covers}
              onChange={(e) =>
                setCovers(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))
              }
              autoFocus
            />
          </div>

          {/* Nom (optionnel) */}
          <div className="space-y-1.5">
            <Label htmlFor="walkin-name">Nom (optionnel)</Label>
            <Input
              id="walkin-name"
              placeholder="Walk-in"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Notes (optionnel) */}
          <div className="space-y-1.5">
            <Label htmlFor="walkin-notes">Notes (optionnel)</Label>
            <Textarea
              id="walkin-notes"
              placeholder="Informations supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[50px]"
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
            onClick={handleSubmit}
            disabled={saving}
            className="bg-green hover:bg-green/90 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            <UserPlus className="w-4 h-4 mr-1.5" />
            Installer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
