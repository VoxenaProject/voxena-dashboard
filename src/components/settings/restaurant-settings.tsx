"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OpeningHoursEditor } from "./opening-hours-editor";
import type { Restaurant } from "@/lib/supabase/types";

export function RestaurantSettings({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: restaurant.name,
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    whatsapp_phone: restaurant.whatsapp_phone || "",
    owner_name: restaurant.owner_name || "",
  });
  const [openingHours, setOpeningHours] = useState(
    restaurant.opening_hours || {}
  );

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: restaurant.id,
        ...form,
        opening_hours: openingHours,
      }),
    });

    if (res.ok) {
      toast.success("Paramètres enregistrés");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du restaurant</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_name">Nom du propriétaire</Label>
            <Input
              id="owner_name"
              value={form.owner_name}
              onChange={(e) => handleChange("owner_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="whatsapp_phone">Numéro WhatsApp</Label>
            <Input
              id="whatsapp_phone"
              type="tel"
              placeholder="+32..."
              value={form.whatsapp_phone}
              onChange={(e) => handleChange("whatsapp_phone", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Utilisé pour envoyer les confirmations de commande au client
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Horaires d&apos;ouverture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OpeningHoursEditor
            value={openingHours}
            onChange={setOpeningHours}
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Agent vocal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Statut de l&apos;agent</p>
              <p className="text-xs text-muted-foreground">
                Géré par l&apos;équipe Voxena
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  restaurant.agent_status === "active"
                    ? "bg-green"
                    : restaurant.agent_status === "error"
                    ? "bg-destructive"
                    : "bg-amber-500"
                }`}
              />
              <span className="text-sm capitalize">
                {restaurant.agent_status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Enregistrer les modifications
      </Button>
    </form>
  );
}
