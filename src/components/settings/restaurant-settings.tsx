"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  Clock,
  CalendarDays,
  ParkingCircle,
  Sun,
  Accessibility,
  Dog,
  Baby,
  CreditCard,
  Wifi,
  PartyPopper,
  Shirt,
  Timer,
  RotateCcw,
  Bot,
  Smartphone,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PasswordStrength } from "@/components/ui/password-strength";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone } from "@/lib/utils/phone";
import type { Restaurant } from "@/lib/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

// ── Types pour les infos pratiques (structure locale plate) ──
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

// ── Helpers pour les résumés ──

const dayLabels: Record<string, string> = {
  lundi: "Lun",
  mardi: "Mar",
  mercredi: "Mer",
  jeudi: "Jeu",
  vendredi: "Ven",
  samedi: "Sam",
  dimanche: "Dim",
};

const dayOrder = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Résumé compact des horaires : "Lun-Ven midi+soir, Sam soir" */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHoursSummary(openingHours: any): string {
  if (!openingHours || Object.keys(openingHours).length === 0) return "Non configurés";

  // Compter les jours ouverts (supporte ancien et nouveau format)
  const activeDays: string[] = [];
  const slotCounts: Record<string, number> = {};

  for (const day of dayOrder) {
    const val = openingHours[day];
    if (!val) continue;

    // Nouveau format : { open: true, services: [...] }
    if (typeof val === "object" && !Array.isArray(val) && val.open && val.services?.length > 0) {
      activeDays.push(day);
      slotCounts[day] = val.services.length;
    }
    // Ancien format : [{ open/from, close/to }]
    else if (Array.isArray(val) && val.length > 0) {
      activeDays.push(day);
      slotCounts[day] = val.length;
    }
  }

  if (activeDays.length === 0) return "Non configurés";
  if (activeDays.length === 7) {
    // Tous les jours ouverts
    const allSame = activeDays.every((d) => slotCounts[d] === slotCounts[activeDays[0]]);
    if (allSame) {
      const svc = slotCounts[activeDays[0]] >= 3 ? "3 services" : slotCounts[activeDays[0]] >= 2 ? "midi+soir" : "continu";
      return `Tous les jours, ${svc}`;
    }
  }

  // Grouper les jours consécutifs avec le même nombre de services
  const patterns: { days: string[]; count: number }[] = [];
  for (const day of activeDays) {
    const count = slotCounts[day];
    const last = patterns[patterns.length - 1];
    // Vérifier que les jours sont consécutifs
    const lastDayIndex = last ? dayOrder.indexOf(last.days[last.days.length - 1]) : -1;
    const currentDayIndex = dayOrder.indexOf(day);
    if (last && last.count === count && currentDayIndex === lastDayIndex + 1) {
      last.days.push(day);
    } else {
      patterns.push({ days: [day], count });
    }
  }

  // Jours fermés
  const closedDays = dayOrder.filter((d) => !activeDays.includes(d));

  const parts = patterns.map((p) => {
    const range = p.days.length === 1
      ? dayShortLabels[p.days[0]]
      : `${dayShortLabels[p.days[0]]}-${dayShortLabels[p.days[p.days.length - 1]]}`;
    const svc = p.count >= 3 ? "3 services" : p.count >= 2 ? "midi+soir" : "";
    return svc ? `${range} ${svc}` : range;
  });

  // Ajouter les jours fermés si peu nombreux
  if (closedDays.length > 0 && closedDays.length <= 2) {
    parts.push(`fermé ${closedDays.map((d) => dayShortLabels[d]).join("+")}`);
  }

  return parts.join(", ");
}

const dayShortLabels: Record<string, string> = {
  lundi: "Lun", mardi: "Mar", mercredi: "Mer", jeudi: "Jeu",
  vendredi: "Ven", samedi: "Sam", dimanche: "Dim",
};

function getParkingSummary(info: PracticalInfo): string {
  if (info.parking === "gratuit") return "Gratuit sur place";
  if (info.parking === "public") return "À proximité";
  if (info.parking === "aucun") return "Non";
  return "Non configuré";
}

function getTerrasseSummary(info: PracticalInfo): string {
  if (!info.terrasse) return "Non";
  if (info.terrasse_capacity > 0) return `${info.terrasse_capacity} places`;
  return "Oui";
}

function getPmrSummary(info: PracticalInfo): string {
  return info.pmr ? "Oui" : "Non";
}

function getAnimalsSummary(info: PracticalInfo): string {
  if (info.animaux === "acceptes") return "Oui";
  if (info.animaux === "terrasse") return "Terrasse";
  if (info.animaux === "non") return "Non";
  return "Non configuré";
}

function getChairsSummary(info: PracticalInfo): string {
  if (!info.chaises_hautes) return "Non";
  if (info.chaises_hautes_count > 0)
    return `${info.chaises_hautes_count} disponible${info.chaises_hautes_count > 1 ? "s" : ""}`;
  return "Oui";
}

function getPaymentsSummary(info: PracticalInfo): string {
  if (info.paiements.length === 0) return "Non configurés";
  const labels = info.paiements.map(
    (v) => paymentMethods.find((m) => m.value === v)?.label || v
  );
  return labels.join(", ");
}

function getWifiSummary(info: PracticalInfo): string {
  if (!info.wifi) return "Non";
  if (info.wifi_code) return info.wifi_code;
  return "Oui";
}

function getEventsSummary(info: PracticalInfo): string {
  if (!info.evenements) return "Non";
  if (info.evenements_capacity > 0) return `${info.evenements_capacity} personnes`;
  return "Oui";
}

function getDressCodeSummary(info: PracticalInfo): string {
  return info.dress_code || "Aucun";
}

// ── Composants inline Apple Settings ──

/** Groupe de réglages avec label uppercase */
function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
        {label}
      </h3>
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

/** Rangée de réglage avec icône, label, résumé et accordéon */
function SettingsRow({
  icon: Icon,
  label,
  summary,
  expandedId,
  noExpand,
  badge,
  copyValue,
  expanded,
  onToggle,
  saving,
  onSave,
  children,
}: {
  icon: LucideIcon;
  label: string;
  summary: string;
  expandedId: string | null;
  noExpand?: boolean;
  badge?: React.ReactNode;
  copyValue?: string | null;
  expanded: boolean;
  onToggle: (id: string | null) => void;
  saving?: boolean;
  onSave?: () => void;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* En-tête de la rangée — toujours visible */}
      <button
        type="button"
        onClick={() => !noExpand && onToggle(expandedId)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
          noExpand ? "cursor-default" : "hover:bg-muted/30 cursor-pointer"
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge && <span>{badge}</span>}
        {copyValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {summary && !badge && !copyValue && (
          <span className="text-sm text-muted-foreground/60 truncate max-w-[160px]">
            {summary}
          </span>
        )}
        {!noExpand && (
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground/30 transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
      </button>

      {/* Contenu accordéon */}
      <AnimatePresence initial={false}>
        {expanded && children && (
          <motion.div
            key={expandedId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/30 bg-muted/[0.02]">
              <div className="space-y-3">{children}</div>
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="mt-4 text-sm font-medium text-[#4237C4] hover:text-[#4237C4]/80 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Composant principal ──

export function RestaurantSettings({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const supabase = createClient();

  // Section actuellement ouverte
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Données du formulaire principal
  const [form, setForm] = useState({
    name: restaurant.name,
    phone: restaurant.phone || "",
    address: restaurant.address || "",
    whatsapp_phone: restaurant.whatsapp_phone || "",
    owner_name: restaurant.owner_name || "",
  });

  // Slug pour la page de réservation publique
  const [slug, setSlug] = useState(restaurant.slug || "");
  const [slugCopied, setSlugCopied] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [whatsappError, setWhatsappError] = useState(false);

  // Réservations
  const [defaultReservationDuration, setDefaultReservationDuration] = useState(
    restaurant.default_reservation_duration ?? 90
  );
  const [turnoverBuffer, setTurnoverBuffer] = useState(
    restaurant.turnover_buffer ?? 15
  );

  // Horaires — accepte l'ancien et le nouveau format (normalisé par l'éditeur)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [openingHours, setOpeningHours] = useState<any>(
    restaurant.opening_hours || {}
  );

  // Infos pratiques
  const [practicalInfo, setPracticalInfo] = useState<PracticalInfo>(() => {
    const saved = (restaurant as Restaurant & { practical_info?: PracticalInfo })
      .practical_info;
    return saved
      ? { ...defaultPracticalInfo, ...saved }
      : { ...defaultPracticalInfo };
  });

  // Mot de passe
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Handlers ──

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

  /** Toggle accordéon — ferme si déjà ouvert */
  const toggleSection = useCallback(
    (id: string | null) => {
      setExpandedSection((prev) => (prev === id ? null : id));
    },
    []
  );

  /** Sauvegarde générique via PATCH /api/restaurants */
  async function saveFields(fields: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, ...fields }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Enregistré");
      setExpandedSection(null);
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
  }

  // ── Save handlers par section ──

  async function saveInfo() {
    await saveFields({
      name: form.name,
      owner_name: form.owner_name,
      address: form.address,
    });
  }

  async function saveContact() {
    const phoneValid = isValidPhone(form.phone);
    const whatsappValid = isValidPhone(form.whatsapp_phone);
    setPhoneError(!phoneValid);
    setWhatsappError(!whatsappValid);
    if (!phoneValid || !whatsappValid) {
      toast.error("Veuillez corriger les numéros de téléphone invalides");
      return;
    }
    await saveFields({
      phone: form.phone,
      whatsapp_phone: form.whatsapp_phone,
    });
  }

  async function saveHours() {
    await saveFields({ opening_hours: openingHours });
  }

  async function savePracticalInfo() {
    await saveFields({ practical_info: practicalInfo });
  }

  async function saveReservationDuration() {
    await saveFields({
      default_reservation_duration: defaultReservationDuration,
    });
  }

  async function saveReservationBuffer() {
    await saveFields({ turnover_buffer: turnoverBuffer });
  }

  async function saveSlug() {
    if (!slug) {
      toast.error("Le lien de réservation ne peut pas être vide");
      return;
    }
    // Slugify : minuscules, pas d'espaces, pas de caractères spéciaux
    const cleanSlug = slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    setSlug(cleanSlug);
    await saveFields({ slug: cleanSlug });
  }

  function copyBookingUrl() {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
    toast.success("Lien copié !");
  }

  async function handlePasswordChange() {
    if (newPassword.length < 8) {
      toast.error(
        "Le nouveau mot de passe doit contenir au moins 8 caractères"
      );
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
      setExpandedSection(null);
    }
    setPasswordLoading(false);
  }

  // ── Badge statut agent ──
  const agentStatusLabel =
    restaurant.agent_status === "active"
      ? "Actif"
      : restaurant.agent_status === "error"
      ? "Erreur"
      : "En pause";
  const agentStatusColor =
    restaurant.agent_status === "active"
      ? "bg-green-500"
      : restaurant.agent_status === "error"
      ? "bg-destructive"
      : "bg-amber-500";

  const statusBadge = (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${agentStatusColor}`} />
      {agentStatusLabel}
    </span>
  );

  // ── Rendu ──

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      {/* ═══ MON RESTAURANT ═══ */}
      <SettingsGroup label="Mon restaurant">
        <SettingsRow
          icon={Building2}
          label="Informations"
          summary={restaurant.name}
          expandedId="info"
          expanded={expandedSection === "info"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveInfo}
        >
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nom du restaurant</Label>
            <Input
              id="settings-name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-owner">Nom du propriétaire</Label>
            <Input
              id="settings-owner"
              value={form.owner_name}
              onChange={(e) => handleChange("owner_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-address">Adresse</Label>
            <Input
              id="settings-address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          icon={Phone}
          label="Contact"
          summary={form.phone || "Non configuré"}
          expandedId="contact"
          expanded={expandedSection === "contact"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveContact}
        >
          <div className="space-y-2">
            <Label htmlFor="settings-phone">Téléphone</Label>
            <Input
              id="settings-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => {
                handleChange("phone", e.target.value);
                if (phoneError) setPhoneError(!isValidPhone(e.target.value));
              }}
              className={phoneError ? "border-destructive" : ""}
            />
            {phoneError && (
              <p className="text-xs text-destructive">
                Numéro de téléphone invalide
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-whatsapp">Numéro WhatsApp</Label>
            <Input
              id="settings-whatsapp"
              type="tel"
              placeholder="+32..."
              value={form.whatsapp_phone}
              onChange={(e) => {
                handleChange("whatsapp_phone", e.target.value);
                if (whatsappError)
                  setWhatsappError(!isValidPhone(e.target.value));
              }}
              className={whatsappError ? "border-destructive" : ""}
            />
            {whatsappError && (
              <p className="text-xs text-destructive">
                Numéro de téléphone invalide
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Utilisé pour envoyer les confirmations de commande au client
            </p>
          </div>
        </SettingsRow>

        <SettingsRow
          icon={Clock}
          label="Horaires"
          summary={getHoursSummary(openingHours)}
          expandedId="hours"
          expanded={expandedSection === "hours"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveHours}
        >
          <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        </SettingsRow>

        <SettingsRow
          icon={CalendarDays}
          label="Réservation en ligne"
          summary={slug ? `getvoxena.com/book/${slug}` : "Non configuré"}
          expandedId="booking"
          expanded={expandedSection === "booking"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveSlug}
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="settings-slug">Lien de réservation</Label>
              <div className="flex gap-2">
                <div className="flex items-center gap-0 flex-1">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-2.5 rounded-l-md border border-r-0 border-border whitespace-nowrap">
                    /book/
                  </span>
                  <Input
                    id="settings-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="mon-restaurant"
                    className="rounded-l-none"
                  />
                </div>
                {slug && (
                  <button
                    type="button"
                    onClick={copyBookingUrl}
                    className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    {slugCopied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
                    {slugCopied ? "Copié" : "Copier"}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Vos clients pourront réserver en ligne via ce lien. Vous pouvez aussi l&apos;intégrer sur votre site web.
              </p>
            </div>
            {slug && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet/5 border border-violet/10">
                <span className="text-xs text-violet font-mono">
                  {typeof window !== "undefined" ? window.location.origin : "https://app.getvoxena.com"}/book/{slug}
                </span>
              </div>
            )}
          </div>
        </SettingsRow>
      </SettingsGroup>

      {/* ═══ SERVICES & ÉQUIPEMENTS ═══ */}
      <SettingsGroup label="Services & équipements">
        <SettingsRow
          icon={ParkingCircle}
          label="Parking"
          summary={getParkingSummary(practicalInfo)}
          expandedId="parking"
          expanded={expandedSection === "parking"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
          <div className="space-y-2">
            <Label>Type de parking</Label>
            <Select
              value={practicalInfo.parking}
              onValueChange={(v) => updatePracticalInfo("parking", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gratuit">Gratuit sur place</SelectItem>
                <SelectItem value="public">
                  Parking public à proximité
                </SelectItem>
                <SelectItem value="aucun">Pas de parking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Détails supplémentaires</Label>
            <Input
              placeholder="Adresse du parking, tarif, etc."
              value={practicalInfo.parking_details}
              onChange={(e) =>
                updatePracticalInfo("parking_details", e.target.value)
              }
            />
          </div>
        </SettingsRow>

        <SettingsRow
          icon={Sun}
          label="Terrasse"
          summary={getTerrasseSummary(practicalInfo)}
          expandedId="terrasse"
          expanded={expandedSection === "terrasse"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Capacité (places)
              </Label>
              <Input
                type="number"
                min={0}
                value={practicalInfo.terrasse_capacity || ""}
                onChange={(e) =>
                  updatePracticalInfo(
                    "terrasse_capacity",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="Nombre de places"
              />
            </div>
          )}
        </SettingsRow>

        <SettingsRow
          icon={Accessibility}
          label="Accessibilité PMR"
          summary={getPmrSummary(practicalInfo)}
          expandedId="pmr"
          expanded={expandedSection === "pmr"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Rampe, ascenseur, toilettes adaptées..."
                value={practicalInfo.pmr_notes}
                onChange={(e) =>
                  updatePracticalInfo("pmr_notes", e.target.value)
                }
              />
            </div>
          )}
        </SettingsRow>

        <SettingsRow
          icon={Dog}
          label="Animaux"
          summary={getAnimalsSummary(practicalInfo)}
          expandedId="animaux"
          expanded={expandedSection === "animaux"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
          <div className="space-y-2">
            <Label>Politique animaux</Label>
            <Select
              value={practicalInfo.animaux}
              onValueChange={(v) => updatePracticalInfo("animaux", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acceptes">Acceptés</SelectItem>
                <SelectItem value="terrasse">
                  En terrasse uniquement
                </SelectItem>
                <SelectItem value="non">Non acceptés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow
          icon={Baby}
          label="Chaises hautes"
          summary={getChairsSummary(practicalInfo)}
          expandedId="chaises"
          expanded={expandedSection === "chaises"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
          <div className="flex items-center gap-3">
            <Switch
              checked={practicalInfo.chaises_hautes}
              onCheckedChange={(val) =>
                updatePracticalInfo("chaises_hautes", val)
              }
            />
            <span className="text-sm text-muted-foreground">
              {practicalInfo.chaises_hautes
                ? "Disponibles"
                : "Non disponibles"}
            </span>
          </div>
          {practicalInfo.chaises_hautes && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Nombre disponible
              </Label>
              <Input
                type="number"
                min={0}
                value={practicalInfo.chaises_hautes_count || ""}
                onChange={(e) =>
                  updatePracticalInfo(
                    "chaises_hautes_count",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="Nombre de chaises hautes"
              />
            </div>
          )}
        </SettingsRow>

        <SettingsRow
          icon={CreditCard}
          label="Paiements"
          summary={getPaymentsSummary(practicalInfo)}
          expandedId="paiements"
          expanded={expandedSection === "paiements"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
          <div className="space-y-2">
            <Label>Moyens de paiement acceptés</Label>
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
        </SettingsRow>

        <SettingsRow
          icon={Wifi}
          label="WiFi"
          summary={getWifiSummary(practicalInfo)}
          expandedId="wifi"
          expanded={expandedSection === "wifi"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Code WiFi
              </Label>
              <Input
                value={practicalInfo.wifi_code}
                onChange={(e) =>
                  updatePracticalInfo("wifi_code", e.target.value)
                }
                placeholder="Mot de passe WiFi"
              />
            </div>
          )}
        </SettingsRow>

        <SettingsRow
          icon={PartyPopper}
          label="Événements privés"
          summary={getEventsSummary(practicalInfo)}
          expandedId="evenements"
          expanded={expandedSection === "evenements"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
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
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Capacité maximale
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={practicalInfo.evenements_capacity || ""}
                  onChange={(e) =>
                    updatePracticalInfo(
                      "evenements_capacity",
                      parseInt(e.target.value) || 0
                    )
                  }
                  placeholder="Nombre de personnes"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  placeholder="Type d'événements, équipements disponibles..."
                  value={practicalInfo.evenements_description}
                  onChange={(e) =>
                    updatePracticalInfo(
                      "evenements_description",
                      e.target.value
                    )
                  }
                />
              </div>
            </>
          )}
        </SettingsRow>

        <SettingsRow
          icon={Shirt}
          label="Dress code"
          summary={getDressCodeSummary(practicalInfo)}
          expandedId="dresscode"
          expanded={expandedSection === "dresscode"}
          onToggle={toggleSection}
          saving={saving}
          onSave={savePracticalInfo}
        >
          <div className="space-y-2">
            <Label>Dress code</Label>
            <Input
              value={practicalInfo.dress_code}
              onChange={(e) =>
                updatePracticalInfo("dress_code", e.target.value)
              }
              placeholder="Ex : Smart casual, Aucun dress code"
            />
          </div>
        </SettingsRow>
      </SettingsGroup>

      {/* ═══ RÉSERVATIONS ═══ */}
      <SettingsGroup label="Réservations">
        <SettingsRow
          icon={Timer}
          label="Durée par défaut"
          summary={`${defaultReservationDuration} min`}
          expandedId="duration"
          expanded={expandedSection === "duration"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveReservationDuration}
        >
          <div className="space-y-2">
            <Label>Durée de réservation par défaut (minutes)</Label>
            <Input
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
              Durée par défaut attribuée à chaque réservation
            </p>
          </div>
        </SettingsRow>

        <SettingsRow
          icon={RotateCcw}
          label="Temps de retournement"
          summary={`${turnoverBuffer} min`}
          expandedId="buffer"
          expanded={expandedSection === "buffer"}
          onToggle={toggleSection}
          saving={saving}
          onSave={saveReservationBuffer}
        >
          <div className="space-y-2">
            <Label>Temps de retournement (minutes)</Label>
            <Input
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
              Temps entre deux réservations pour le nettoyage et la préparation
              de la table
            </p>
          </div>
        </SettingsRow>
      </SettingsGroup>

      {/* ═══ AGENT VOCAL ═══ */}
      <SettingsGroup label="Agent vocal">
        <SettingsRow
          icon={Bot}
          label="Statut"
          summary=""
          expandedId={null}
          noExpand
          badge={statusBadge}
          expanded={false}
          onToggle={toggleSection}
        />

        <SettingsRow
          icon={Smartphone}
          label="Numéro dédié"
          summary={restaurant.telnyx_phone || "Non configuré"}
          expandedId={null}
          noExpand
          copyValue={restaurant.telnyx_phone}
          expanded={false}
          onToggle={toggleSection}
        />
      </SettingsGroup>

      {/* ═══ SÉCURITÉ ═══ */}
      <SettingsGroup label="Sécurité">
        <SettingsRow
          icon={Lock}
          label="Changer le mot de passe"
          summary=""
          expandedId="password"
          expanded={expandedSection === "password"}
          onToggle={toggleSection}
          saving={passwordLoading}
          onSave={handlePasswordChange}
        >
          {/* Mot de passe actuel */}
          <div className="space-y-2">
            <Label htmlFor="settings-current-password">
              Mot de passe actuel
            </Label>
            <div className="relative">
              <Input
                id="settings-current-password"
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
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="settings-new-password">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="settings-new-password"
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
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-amber-500">
                Encore {8 - newPassword.length} caractère
                {8 - newPassword.length > 1 ? "s" : ""} requis
              </p>
            )}
            <PasswordStrength password={newPassword} variant="light" />
          </div>

          {/* Confirmer le mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="settings-confirm-password">
              Confirmer le nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="settings-confirm-password"
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
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-amber-500">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}
