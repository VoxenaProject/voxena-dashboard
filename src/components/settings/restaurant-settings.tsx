"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Eye, EyeOff, Lock, Phone, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OpeningHoursEditor } from "./opening-hours-editor";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/supabase/types";

export function RestaurantSettings({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const supabase = createClient();

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

  // State pour le changement de mot de passe
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State pour copier le numéro Telnyx
  const [telnyxCopied, setTelnyxCopied] = useState(false);

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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    // Validations
    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe mis à jour avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setPasswordLoading(false);
  }

  return (
    <div className="space-y-6">
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
          <CardContent className="space-y-4">
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

            {/* Numéro Telnyx en lecture seule */}
            {restaurant.telnyx_phone && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    Ligne de commande Voxena
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={restaurant.telnyx_phone}
                      readOnly
                      className="font-mono bg-muted/50 cursor-default"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(restaurant.telnyx_phone!);
                        setTelnyxCopied(true);
                        setTimeout(() => setTelnyxCopied(false), 2000);
                      }}
                      className="shrink-0"
                    >
                      {telnyxCopied ? (
                        <Check className="w-4 h-4 text-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le numéro que vos clients appellent pour commander
                  </p>
                </div>
              </>
            )}
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

      {/* Section Sécurité — hors du formulaire principal */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              Changer le mot de passe
            </p>

            {/* Mot de passe actuel */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="new-password-settings">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password-settings"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-amber-500">
                  Encore {8 - newPassword.length} caractère{8 - newPassword.length > 1 ? "s" : ""} requis
                </p>
              )}
            </div>

            {/* Confirmer le mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password-settings">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm-password-settings"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le nouveau mot de passe"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-amber-500">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={passwordLoading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full"
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Mettre à jour le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
