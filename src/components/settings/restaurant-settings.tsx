"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Eye, EyeOff, Lock, Phone, Copy, Check, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpeningHoursEditor } from "./opening-hours-editor";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone } from "@/lib/utils/phone";
import type { Restaurant } from "@/lib/supabase/types";

// Types pour les infos pratiques
interface PracticalInfo {
  parking: string;
  parking_details: string;
  terrasse: boolean;
  terrasse_capacity: number;
  pmr: boolean;
  pmr_notes: string;
  animaux: string;
  chaises_hautes: boolean;
  chaises_hautes_count: number;
  paiements: string[];
  wifi: boolean;
  wifi_code: string;
  evenements: boolean;
  evenements_capacity: number;
  evenements_description: string;
  dress_code: string;
}

const defaultPracticalInfo: PracticalInfo = {
  parking: "",
  parking_details: "",
  terrasse: false,
  terrasse_capacity: 0,
  pmr: false,
  pmr_notes: "",
  animaux: "",
  chaises_hautes: false,
  chaises_hautes_count: 0,
  paiements: [],
  wifi: false,
  wifi_code: "",
  evenements: false,
  evenements_capacity: 0,
  evenements_description: "",
  dress_code: "",
};

const paymentMethods = [
  { value: "cb", label: "CB" },
  { value: "especes", label: "Espèces" },
  { value: "bancontact", label: "Bancontact" },
  { value: "payconiq", label: "Payconiq" },
  { value: "tickets_restaurant", label: "Tickets restaurant" },
];

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
  const [phoneError, setPhoneError] = useState(false);
  const [whatsappError, setWhatsappError] = useState(false);
  const [defaultReservationDuration, setDefaultReservationDuration] = useState(
    restaurant.default_reservation_duration ?? 90
  );
  const [turnoverBuffer, setTurnoverBuffer] = useState(
    restaurant.turnover_buffer ?? 15
  );
  const [openingHours, setOpeningHours] = useState(
    restaurant.opening_hours || {}
  );

  // State pour les infos pratiques
  const [practicalInfo, setPracticalInfo] = useState<PracticalInfo>(() => {
    const saved = (restaurant as Restaurant & { practical_info?: PracticalInfo }).practical_info;
    return saved ? { ...defaultPracticalInfo, ...saved } : { ...defaultPracticalInfo };
  });
  const [practicalLoading, setPracticalLoading] = useState(false);

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

  function updatePracticalInfo<K extends keyof PracticalInfo>(
    field: K,
    value: PracticalInfo[K]
  ) {
    setPracticalInfo((prev) => ({ ...prev, [field]: value }));
  }

  function togglePayment(method: string) {
    setPracticalInfo((prev) => ({
      ...prev,
      paiements: prev.paiements.includes(method)
        ? prev.paiements.filter((p) => p !== method)
        : [...prev.paiements, method],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validation des numéros de téléphone
    const phoneValid = isValidPhone(form.phone);
    const whatsappValid = isValidPhone(form.whatsapp_phone);
    setPhoneError(!phoneValid);
    setWhatsappError(!whatsappValid);

    if (!phoneValid || !whatsappValid) {
      toast.error("Veuillez corriger les numéros de téléphone invalides");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: restaurant.id,
        ...form,
        opening_hours: openingHours,
        default_reservation_duration: defaultReservationDuration,
        turnover_buffer: turnoverBuffer,
      }),
    });

    if (res.ok) {
      toast.success("Paramètres enregistrés");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setLoading(false);
  }

  async function handleSavePracticalInfo() {
    setPracticalLoading(true);

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: restaurant.id,
        practical_info: practicalInfo,
      }),
    });

    if (res.ok) {
      toast.success("Infos pratiques enregistrées");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setPracticalLoading(false);
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
                onChange={(e) => {
                  handleChange("phone", e.target.value);
                  if (phoneError) setPhoneError(!isValidPhone(e.target.value));
                }}
                className={phoneError ? "border-destructive" : ""}
              />
              {phoneError && (
                <p className="text-xs text-destructive">Numéro de téléphone invalide</p>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">Numéro WhatsApp</Label>
              <Input
                id="whatsapp_phone"
                type="tel"
                placeholder="+32..."
                value={form.whatsapp_phone}
                onChange={(e) => {
                  handleChange("whatsapp_phone", e.target.value);
                  if (whatsappError) setWhatsappError(!isValidPhone(e.target.value));
                }}
                className={whatsappError ? "border-destructive" : ""}
              />
              {whatsappError && (
                <p className="text-xs text-destructive">Numéro de téléphone invalide</p>
              )}
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
            <CardTitle className="font-heading text-lg">
              Réservations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_reservation_duration">
                Durée de réservation par défaut (minutes)
              </Label>
              <Input
                id="default_reservation_duration"
                type="number"
                min={30}
                max={300}
                value={defaultReservationDuration}
                onChange={(e) =>
                  setDefaultReservationDuration(
                    Math.max(30, Math.min(300, parseInt(e.target.value) || 90))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Durée par défaut attribuée à chaque réservation (en minutes)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="turnover_buffer">
                Temps de retournement (minutes)
              </Label>
              <Input
                id="turnover_buffer"
                type="number"
                min={0}
                max={120}
                value={turnoverBuffer}
                onChange={(e) =>
                  setTurnoverBuffer(
                    Math.max(0, Math.min(120, parseInt(e.target.value) || 15))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Temps entre deux réservations pour le nettoyage et la préparation de la table
              </p>
            </div>
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

      {/* Section Infos pratiques — hors du formulaire principal */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Infos pratiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parking */}
            <div className="space-y-2">
              <Label>Parking</Label>
              <Select
                value={practicalInfo.parking}
                onValueChange={(v) => updatePracticalInfo("parking", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gratuit">Gratuit sur place</SelectItem>
                  <SelectItem value="public">Parking public à proximité</SelectItem>
                  <SelectItem value="aucun">Pas de parking</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Détails supplémentaires (optionnel)"
                value={practicalInfo.parking_details}
                onChange={(e) => updatePracticalInfo("parking_details", e.target.value)}
              />
            </div>

            {/* Terrasse */}
            <div className="space-y-2">
              <Label>Terrasse</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={practicalInfo.terrasse}
                  onCheckedChange={(val) => updatePracticalInfo("terrasse", val)}
                />
                <span className="text-sm text-muted-foreground">
                  {practicalInfo.terrasse ? "Disponible" : "Pas de terrasse"}
                </span>
              </div>
              {practicalInfo.terrasse && (
                <div className="space-y-1">
                  <Label htmlFor="terrasse-capacity" className="text-xs text-muted-foreground">
                    Capacité (places)
                  </Label>
                  <Input
                    id="terrasse-capacity"
                    type="number"
                    min={0}
                    value={practicalInfo.terrasse_capacity || ""}
                    onChange={(e) => updatePracticalInfo("terrasse_capacity", parseInt(e.target.value) || 0)}
                    placeholder="Nombre de places"
                  />
                </div>
              )}
            </div>

            {/* Accessibilité PMR */}
            <div className="space-y-2">
              <Label>Accessibilité PMR</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={practicalInfo.pmr}
                  onCheckedChange={(val) => updatePracticalInfo("pmr", val)}
                />
                <span className="text-sm text-muted-foreground">
                  {practicalInfo.pmr ? "Accessible" : "Non accessible"}
                </span>
              </div>
              {practicalInfo.pmr && (
                <Textarea
                  placeholder="Notes sur l'accessibilité (rampe, ascenseur, toilettes adaptées...)"
                  value={practicalInfo.pmr_notes}
                  onChange={(e) => updatePracticalInfo("pmr_notes", e.target.value)}
                />
              )}
            </div>

            {/* Animaux */}
            <div className="space-y-2">
              <Label>Animaux</Label>
              <Select
                value={practicalInfo.animaux}
                onValueChange={(v) => updatePracticalInfo("animaux", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acceptes">Acceptés</SelectItem>
                  <SelectItem value="terrasse">En terrasse uniquement</SelectItem>
                  <SelectItem value="non">Non acceptés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chaises hautes */}
            <div className="space-y-2">
              <Label>Chaises hautes</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={practicalInfo.chaises_hautes}
                  onCheckedChange={(val) => updatePracticalInfo("chaises_hautes", val)}
                />
                <span className="text-sm text-muted-foreground">
                  {practicalInfo.chaises_hautes ? "Disponibles" : "Non disponibles"}
                </span>
              </div>
              {practicalInfo.chaises_hautes && (
                <div className="space-y-1">
                  <Label htmlFor="chaises-count" className="text-xs text-muted-foreground">
                    Nombre disponible
                  </Label>
                  <Input
                    id="chaises-count"
                    type="number"
                    min={0}
                    value={practicalInfo.chaises_hautes_count || ""}
                    onChange={(e) => updatePracticalInfo("chaises_hautes_count", parseInt(e.target.value) || 0)}
                    placeholder="Nombre de chaises hautes"
                  />
                </div>
              )}
            </div>

            {/* Paiements acceptés */}
            <div className="space-y-2">
              <Label>Paiements acceptés</Label>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={practicalInfo.paiements.includes(method.value)}
                      onCheckedChange={() => togglePayment(method.value)}
                    />
                    <span className="text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* WiFi */}
            <div className="space-y-2">
              <Label>WiFi</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={practicalInfo.wifi}
                  onCheckedChange={(val) => updatePracticalInfo("wifi", val)}
                />
                <span className="text-sm text-muted-foreground">
                  {practicalInfo.wifi ? "Disponible" : "Pas de WiFi"}
                </span>
              </div>
              {practicalInfo.wifi && (
                <div className="space-y-1">
                  <Label htmlFor="wifi-code" className="text-xs text-muted-foreground">
                    Code WiFi
                  </Label>
                  <Input
                    id="wifi-code"
                    value={practicalInfo.wifi_code}
                    onChange={(e) => updatePracticalInfo("wifi_code", e.target.value)}
                    placeholder="Mot de passe WiFi"
                  />
                </div>
              )}
            </div>

            {/* Événements privés */}
            <div className="space-y-2">
              <Label>Événements privés</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={practicalInfo.evenements}
                  onCheckedChange={(val) => updatePracticalInfo("evenements", val)}
                />
                <span className="text-sm text-muted-foreground">
                  {practicalInfo.evenements ? "Possibles" : "Non disponibles"}
                </span>
              </div>
              {practicalInfo.evenements && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="evenements-capacity" className="text-xs text-muted-foreground">
                      Capacité maximale
                    </Label>
                    <Input
                      id="evenements-capacity"
                      type="number"
                      min={0}
                      value={practicalInfo.evenements_capacity || ""}
                      onChange={(e) => updatePracticalInfo("evenements_capacity", parseInt(e.target.value) || 0)}
                      placeholder="Nombre de personnes"
                    />
                  </div>
                  <Textarea
                    placeholder="Description (type d'événements, équipements disponibles...)"
                    value={practicalInfo.evenements_description}
                    onChange={(e) => updatePracticalInfo("evenements_description", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Dress code */}
            <div className="space-y-2">
              <Label htmlFor="dress-code">Dress code</Label>
              <Input
                id="dress-code"
                value={practicalInfo.dress_code}
                onChange={(e) => updatePracticalInfo("dress_code", e.target.value)}
                placeholder="Aucun dress code"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSavePracticalInfo}
            disabled={practicalLoading}
            className="w-full"
          >
            {practicalLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer les infos pratiques
          </Button>
        </CardContent>
      </Card>

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
