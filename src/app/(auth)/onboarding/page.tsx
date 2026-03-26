"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Phone,
  BarChart3,
  UtensilsCrossed,
  ArrowRight,
  Check,
  MapPin,
  MessageCircle,
  Building2,
  Sparkles,
  PartyPopper,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { PasswordStrength } from "@/components/ui/password-strength";
import type { Profile, Restaurant, Menu, MenuItem } from "@/lib/supabase/types";

// ── Constantes ──
const STORAGE_KEY = "voxena_onboarding_step";
const TOTAL_STEPS = 6;

// ── Jours de la semaine ──
const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
] as const;

// ── Horaires par défaut ──
const DEFAULT_OPENING_HOURS: OpeningHours = {
  lundi: { open: true, services: [{ from: "11:30", to: "14:00" }, { from: "18:00", to: "22:00" }] },
  mardi: { open: true, services: [{ from: "11:30", to: "14:00" }, { from: "18:00", to: "22:00" }] },
  mercredi: { open: true, services: [{ from: "11:30", to: "14:00" }, { from: "18:00", to: "22:00" }] },
  jeudi: { open: true, services: [{ from: "11:30", to: "14:00" }, { from: "18:00", to: "22:00" }] },
  vendredi: { open: true, services: [{ from: "11:30", to: "14:00" }, { from: "18:00", to: "22:00" }] },
  samedi: { open: true, services: [{ from: "18:00", to: "23:00" }] },
  dimanche: { open: false, services: [] },
};

// ── Types horaires ──
interface ServiceSlot {
  from: string;
  to: string;
}

interface DaySchedule {
  open: boolean;
  services: ServiceSlot[];
}

type OpeningHours = Record<string, DaySchedule>;

// ── Générer les options de temps (06:00 à 02:00, par 30 min) ──
const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:30`);
}
for (let h = 0; h <= 2; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 2) TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:30`);
}

// ── Animations ──
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const slideTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

// ── Confetti particle ──
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ["#4237C4", "#74a3ff", "#1a9a5a", "#34d399", "#f59e0b", "#ec4899"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 8;

  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: 600,
        x: x + (Math.random() - 0.5) * 200,
        opacity: 0,
        rotate: rotation + 720,
        scale: 0.5,
      }}
      transition={{
        duration: 2.5 + Math.random() * 1.5,
        delay,
        ease: "easeOut",
      }}
      className="absolute top-0 pointer-events-none"
      style={{
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
      }}
    />
  );
}

// ── Select d'heure pour les horaires ──
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
      className="h-9 rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-violet/30 cursor-pointer appearance-none"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t} className="bg-navy-deep text-white">
          {t}
        </option>
      ))}
    </select>
  );
}

// ── Composant principal ──
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // State principal
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // State step 1 : mot de passe
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // State step 3 : formulaire restaurant
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    whatsapp_phone: "",
  });

  // State step 4 : horaires
  const [openingHours, setOpeningHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS);

  // Charger les données au montage
  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Profil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData) {
      router.push("/login");
      return;
    }

    // Si onboarding déjà terminé, rediriger
    if (profileData.onboarding_completed) {
      router.push("/");
      return;
    }

    setProfile(profileData as Profile);

    // Restaurant
    if (profileData.restaurant_id) {
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", profileData.restaurant_id)
        .single();

      if (restaurantData) {
        const resto = restaurantData as Restaurant;
        setRestaurant(resto);
        setFormData({
          name: resto.name || "",
          address: resto.address || "",
          phone: resto.phone || "",
          whatsapp_phone: resto.whatsapp_phone || "",
        });

        // Charger les horaires existants si disponibles
        if (resto.opening_hours && Object.keys(resto.opening_hours).length > 0) {
          // Convertir le format existant vers le format onboarding
          const existingHours: OpeningHours = {};
          for (const day of DAYS) {
            const dayData = (resto.opening_hours as Record<string, unknown>)[day.key];
            if (dayData && Array.isArray(dayData) && dayData.length > 0) {
              existingHours[day.key] = {
                open: true,
                services: dayData.map((slot: { open: string; close: string }) => ({
                  from: slot.open,
                  to: slot.close,
                })),
              };
            } else {
              existingHours[day.key] = { open: false, services: [] };
            }
          }
          setOpeningHours(existingHours);
        }

        // Menus et articles
        const { data: menusData } = await supabase
          .from("menus")
          .select("*")
          .eq("restaurant_id", resto.id)
          .order("sort_order");

        const { data: itemsData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", resto.id)
          .order("sort_order");

        setMenus((menusData as Menu[]) || []);
        setMenuItems((itemsData as MenuItem[]) || []);
      }
    }

    // Récupérer le step depuis localStorage
    const savedStep = localStorage.getItem(STORAGE_KEY);
    if (savedStep) {
      const parsed = parseInt(savedStep, 10);
      if (parsed >= 1 && parsed <= TOTAL_STEPS) {
        setStep(parsed);
      }
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sauvegarder le step dans localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, String(step));
    }
  }, [step, loading]);

  // Navigation entre les steps
  function goNext() {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }

  // Step 1 : Changer le mot de passe
  async function handleChangePassword() {
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError("Erreur lors du changement de mot de passe : " + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    goNext();
  }

  // Step 3 : Sauvegarder les infos restaurant
  async function handleSaveRestaurant() {
    if (!restaurant) return;
    setSaving(true);

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: restaurant.id,
        name: formData.name,
        address: formData.address || null,
        phone: formData.phone || null,
        whatsapp_phone: formData.whatsapp_phone || null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setRestaurant(updated);
    }

    setSaving(false);
    goNext();
  }

  // Step 4 : Sauvegarder les horaires
  async function handleSaveOpeningHours() {
    if (!restaurant) return;
    setSaving(true);

    // Convertir vers le format de la DB (compatible avec opening-hours-editor)
    const dbHours: Record<string, { open: string; close: string }[]> = {};
    for (const [day, schedule] of Object.entries(openingHours)) {
      if (schedule.open && schedule.services.length > 0) {
        dbHours[day] = schedule.services.map((s) => ({
          open: s.from,
          close: s.to,
        }));
      }
    }

    const res = await fetch("/api/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: restaurant.id,
        opening_hours: dbHours,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setRestaurant(updated);
    }

    setSaving(false);
    goNext();
  }

  // Step 6 : Finaliser l'onboarding
  async function handleComplete() {
    if (!profile) return;
    setSaving(true);

    // Marquer l'onboarding comme terminé via une API route (bypass RLS)
    await fetch("/api/invite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profile.id, onboarding_completed: true }),
    });

    // Nettoyer le localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }

    // Rediriger via window.location pour forcer un rechargement complet
    window.location.href = "/";
  }

  // Lancer les confettis quand on arrive au step 6
  useEffect(() => {
    if (step === 6) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Helpers horaires ──
  function toggleDay(dayKey: string) {
    setOpeningHours((prev) => ({
      ...prev,
      [dayKey]: {
        open: !prev[dayKey]?.open,
        services: !prev[dayKey]?.open
          ? [{ from: "11:30", to: "22:00" }]
          : [],
      },
    }));
  }

  function toggleDoubleService(dayKey: string) {
    setOpeningHours((prev) => {
      const day = prev[dayKey];
      if (!day || !day.open) return prev;

      if (day.services.length === 1) {
        // Passer en double service
        return {
          ...prev,
          [dayKey]: {
            open: true,
            services: [
              { from: "11:30", to: "14:00" },
              { from: "18:00", to: "22:00" },
            ],
          },
        };
      } else {
        // Revenir en service unique
        return {
          ...prev,
          [dayKey]: {
            open: true,
            services: [{ from: "11:30", to: "22:00" }],
          },
        };
      }
    });
  }

  function updateServiceTime(dayKey: string, serviceIndex: number, field: "from" | "to", value: string) {
    setOpeningHours((prev) => {
      const day = prev[dayKey];
      if (!day) return prev;
      const newServices = [...day.services];
      newServices[serviceIndex] = { ...newServices[serviceIndex], [field]: value };
      return {
        ...prev,
        [dayKey]: { ...day, services: newServices },
      };
    });
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-violet animate-spin" />
          <p className="text-white/50 text-sm">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  // ── Rendu principal ──
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé */}
      <div
        className="fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(66, 55, 196, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(116, 163, 255, 0.1) 0%, transparent 50%), #080B1F",
        }}
      />
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Confettis */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={Math.random() * 0.8}
              x={Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000)}
            />
          ))}
        </div>
      )}

      {/* Barre de progression */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <div className="h-1 bg-white/[0.06]">
          <motion.div
            className="h-full"
            style={{ background: "var(--gradient-violet)" }}
            initial={{ width: "0%" }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    i + 1 < step
                      ? "bg-green text-white"
                      : i + 1 === step
                        ? "bg-violet text-white"
                        : "bg-white/[0.08] text-white/30"
                  }`}
                >
                  {i + 1 < step ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div
                    className={`w-8 h-0.5 rounded-full transition-colors duration-300 hidden sm:block ${
                      i + 1 < step ? "bg-green/50" : "bg-white/[0.06]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-white/30 font-mono">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Contenu des steps */}
      <div className="relative z-10 min-h-screen flex items-center justify-center pt-20 pb-8 px-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>

            {/* ═══════════ STEP 1 : Changez votre mot de passe ═══════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-14 h-14 rounded-2xl bg-violet/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Lock className="w-7 h-7 text-blue" />
                  </motion.div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
                    Sécurisez votre compte
                  </h2>
                  <p className="text-white/50 text-sm max-w-md mx-auto">
                    Choisissez un nouveau mot de passe pour remplacer le mot de passe temporaire
                  </p>
                </div>

                <Card className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm">
                  <CardContent className="p-6 space-y-5">
                    {/* Nouveau mot de passe */}
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-white/70 text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        Nouveau mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordError("");
                          }}
                          className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30 pr-10"
                          placeholder="Minimum 8 caractères"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newPassword.length > 0 && newPassword.length < 8 && (
                        <p className="text-xs text-amber-400">
                          Encore {8 - newPassword.length} caractère{8 - newPassword.length > 1 ? "s" : ""} requis
                        </p>
                      )}
                      {/* Indicateur de force du mot de passe */}
                      <PasswordStrength password={newPassword} variant="dark" />
                    </div>

                    {/* Confirmer le mot de passe */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-white/70 text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        Confirmer le mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError("");
                          }}
                          className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30 pr-10"
                          placeholder="Retapez votre mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <p className="text-xs text-amber-400">
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                    </div>

                    {/* Erreur globale */}
                    {passwordError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <p className="text-sm text-red-400">{passwordError}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bouton */}
                <div className="flex items-center justify-end mt-8">
                  <Button
                    onClick={handleChangePassword}
                    disabled={saving || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="h-11 px-6 font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        Continuer
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════ STEP 2 : Bienvenue ═══════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="flex flex-col items-center text-center"
              >
                {/* Logo animé */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
                  className="mb-8"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="543 -20 486 570"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="white"
                        d="M949.9,0l-161.4,299.5L625.3,0h324.6ZM563.6,125.3l-1.1,1.9v234l223.1,167.1-222-403ZM785.6,528.3l223.1-167.1V127.2s-1.1-1.9-1.1-1.9l-222,403Z"
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Texte de bienvenue */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="font-heading text-3xl md:text-4xl font-bold text-white mb-3"
                >
                  Bienvenue chez Voxena !
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="text-lg text-white/70 mb-2"
                >
                  Bonjour{" "}
                  <span className="text-white font-semibold">
                    {profile?.full_name || ""}
                  </span>{" "}
                  !
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-white/50 mb-10 max-w-md"
                >
                  Votre restaurant{" "}
                  <span className="text-blue font-medium">
                    {restaurant?.name || ""}
                  </span>{" "}
                  est maintenant connecté à Voxena, votre agent vocal intelligent.
                </motion.p>

                {/* Feature cards */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10"
                >
                  {[
                    {
                      icon: Phone,
                      title: "Prise de commandes automatique",
                      desc: "Vos clients appellent, Voxena prend la commande",
                      gradient: "from-violet/20 to-blue/10",
                      iconColor: "text-blue",
                    },
                    {
                      icon: BarChart3,
                      title: "Dashboard en temps réel",
                      desc: "Suivez vos commandes, revenus et performances",
                      gradient: "from-green/20 to-green-soft/10",
                      iconColor: "text-green-soft",
                    },
                    {
                      icon: UtensilsCrossed,
                      title: "Menu intelligent",
                      desc: "L'agent connaît votre menu, vos prix et allergènes",
                      gradient: "from-violet/20 to-violet-dark/10",
                      iconColor: "text-violet",
                    },
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                    >
                      <Card className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] transition-all duration-300 h-full">
                        <CardContent className="p-5 text-center">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mx-auto mb-3`}
                          >
                            <feature.icon
                              className={`w-6 h-6 ${feature.iconColor}`}
                            />
                          </div>
                          <h3 className="font-heading text-sm font-semibold text-white mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-xs text-white/45 leading-relaxed">
                            {feature.desc}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Navigation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                  className="flex items-center gap-4"
                >
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="text-white/50 hover:text-white hover:bg-white/[0.06]"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={goNext}
                    className="h-12 px-8 text-base font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    C&apos;est parti
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════ STEP 3 : Vérifiez vos informations ═══════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-14 h-14 rounded-2xl bg-violet/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Building2 className="w-7 h-7 text-blue" />
                  </motion.div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
                    Vérifiez vos informations
                  </h2>
                  <p className="text-white/50 text-sm">
                    Assurez-vous que tout est correct avant de continuer
                  </p>
                </div>

                <Card className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm">
                  <CardContent className="p-6 space-y-5">
                    {/* Nom du restaurant */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="resto-name"
                        className="text-white/70 text-sm flex items-center gap-2"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        Nom du restaurant
                      </Label>
                      <Input
                        id="resto-name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, name: e.target.value }))
                        }
                        className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                        placeholder="Chez Mario"
                      />
                    </div>

                    {/* Adresse */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="resto-address"
                        className="text-white/70 text-sm flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Adresse
                      </Label>
                      <Input
                        id="resto-address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            address: e.target.value,
                          }))
                        }
                        className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                        placeholder="Rue de la Loi 42, 1000 Bruxelles"
                      />
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="resto-phone"
                        className="text-white/70 text-sm flex items-center gap-2"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Téléphone
                      </Label>
                      <Input
                        id="resto-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                        placeholder="+32 2 123 45 67"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="resto-whatsapp"
                        className="text-white/70 text-sm flex items-center gap-2"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                        <span className="text-white/30 text-xs">(optionnel)</span>
                      </Label>
                      <Input
                        id="resto-whatsapp"
                        type="tel"
                        value={formData.whatsapp_phone}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            whatsapp_phone: e.target.value,
                          }))
                        }
                        className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/30 focus:border-violet focus:ring-violet/30"
                        placeholder="+32 470 12 34 56"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="text-white/50 hover:text-white hover:bg-white/[0.06]"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleSaveRestaurant}
                    disabled={saving || !formData.name.trim()}
                    className="h-11 px-6 font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        Suivant
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════ STEP 4 : Horaires d'ouverture ═══════════ */}
            {step === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-14 h-14 rounded-2xl bg-green/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Clock className="w-7 h-7 text-green-soft" />
                  </motion.div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
                    Configurez vos horaires
                  </h2>
                  <p className="text-white/50 text-sm max-w-md mx-auto">
                    Indiquez quand votre restaurant est ouvert pour les commandes
                  </p>
                </div>

                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {DAYS.map(({ key, label }) => {
                    const daySchedule = openingHours[key] || { open: false, services: [] };
                    const isOpen = daySchedule.open;
                    const isDoubleService = daySchedule.services.length >= 2;

                    return (
                      <Card
                        key={key}
                        className={`backdrop-blur-sm transition-all duration-200 ${
                          isOpen
                            ? "bg-white/[0.06] border-white/[0.1]"
                            : "bg-white/[0.02] border-white/[0.05]"
                        }`}
                      >
                        <CardContent className="p-4">
                          {/* Ligne principale : toggle + nom du jour */}
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={isOpen}
                              onCheckedChange={() => toggleDay(key)}
                            />
                            <span className={`text-sm font-medium w-24 ${isOpen ? "text-white" : "text-white/40"}`}>
                              {label}
                            </span>
                            {!isOpen && (
                              <span className="text-sm text-white/30">Fermé</span>
                            )}
                          </div>

                          {isOpen && (
                            <div className="mt-3 ml-[52px] space-y-3">
                              {/* Toggle double service */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleDoubleService(key)}
                                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                                    isDoubleService
                                      ? "bg-violet/20 text-violet border border-violet/30"
                                      : "bg-white/[0.06] text-white/50 border border-white/[0.08] hover:text-white/70"
                                  }`}
                                >
                                  {isDoubleService ? "Double service (midi + soir)" : "Service continu"}
                                </button>
                              </div>

                              {/* Créneaux horaires */}
                              {daySchedule.services.map((service, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  {isDoubleService && (
                                    <span className="text-[11px] text-white/40 font-mono w-8">
                                      {i === 0 ? "Midi" : "Soir"}
                                    </span>
                                  )}
                                  <TimeSelect
                                    value={service.from}
                                    onChange={(v) => updateServiceTime(key, i, "from", v)}
                                  />
                                  <span className="text-xs text-white/40">à</span>
                                  <TimeSelect
                                    value={service.to}
                                    onChange={(v) => updateServiceTime(key, i, "to", v)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="text-white/50 hover:text-white hover:bg-white/[0.06]"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleSaveOpeningHours}
                    disabled={saving}
                    className="h-11 px-6 font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        Suivant
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════ STEP 5 : Menu ═══════════ */}
            {step === 5 && (
              <motion.div
                key="step5"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-14 h-14 rounded-2xl bg-green/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <UtensilsCrossed className="w-7 h-7 text-green-soft" />
                  </motion.div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
                    Configurez votre menu
                  </h2>
                  <p className="text-white/50 text-sm">
                    {menus.length > 0
                      ? "Votre menu est déjà configuré par notre équipe"
                      : "Vous pourrez configurer votre menu depuis le dashboard"}
                  </p>
                </div>

                {menus.length > 0 ? (
                  /* Menu déjà configuré — affichage en lecture seule */
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <Badge className="bg-green/20 text-green-soft border-green/30 gap-1.5 px-3 py-1">
                        <Check className="w-3.5 h-3.5" />
                        Votre menu est déjà configuré !
                      </Badge>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {menus.map((menu) => {
                        const items = menuItems.filter(
                          (item) => item.menu_id === menu.id
                        );
                        return (
                          <Card
                            key={menu.id}
                            className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm overflow-hidden"
                          >
                            <CardContent className="p-0">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                                <h3 className="font-heading text-sm font-semibold text-white">
                                  {menu.name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono border-white/[0.1] text-white/50"
                                >
                                  {items.length} article
                                  {items.length > 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {items.length > 0 && (
                                <div className="px-4 py-2 space-y-1.5">
                                  {items.slice(0, 5).map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-xs text-white/60">
                                        {item.name}
                                      </span>
                                      <span className="text-xs font-mono text-white/40">
                                        {Number(item.price).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                  {items.length > 5 && (
                                    <p className="text-[10px] text-white/30 flex items-center gap-1">
                                      <ChevronRight className="w-3 h-3" />
                                      +{items.length - 5} autres articles
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Récap */}
                    <div className="text-center mt-4">
                      <p className="text-xs text-white/30">
                        {menus.length} catégorie{menus.length > 1 ? "s" : ""} ·{" "}
                        {menuItems.length} article{menuItems.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Pas de menu — message informatif */
                  <Card className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                        <UtensilsCrossed className="w-8 h-8 text-white/30" />
                      </div>
                      <h3 className="font-heading text-base font-semibold text-white mb-2">
                        Aucun menu configuré
                      </h3>
                      <p className="text-sm text-white/45 max-w-sm mx-auto mb-4">
                        Pas de souci ! Vous pourrez ajouter votre menu complet
                        depuis le dashboard après l&apos;onboarding. Notre équipe peut
                        aussi le faire pour vous.
                      </p>
                      <Badge
                        variant="outline"
                        className="border-white/[0.1] text-white/40 text-xs"
                      >
                        Configurable depuis le dashboard
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="text-white/50 hover:text-white hover:bg-white/[0.06]"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={goNext}
                    className="h-11 px-6 font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    Suivant
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════ STEP 6 : Vous êtes prêt ! ═══════════ */}
            {step === 6 && (
              <motion.div
                key="step6"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="flex flex-col items-center text-center"
              >
                {/* Icône célébration */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.6,
                    type: "spring",
                    bounce: 0.5,
                  }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 rounded-full bg-green/20 flex items-center justify-center">
                    <PartyPopper className="w-10 h-10 text-green-soft" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="font-heading text-3xl md:text-4xl font-bold text-white mb-3"
                >
                  Vous êtes prêt !
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-white/50 mb-8 max-w-md"
                >
                  Votre agent vocal est prêt à prendre des commandes !
                </motion.p>

                {/* Recap card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-full max-w-sm mb-8"
                >
                  <Card className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm">
                    <CardContent className="p-6 space-y-4">
                      {/* Restaurant */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Restaurant</span>
                        <span className="text-sm font-medium text-white">
                          {restaurant?.name || "—"}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.06]" />

                      {/* Articles */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">
                          Articles au menu
                        </span>
                        <span className="text-sm font-mono font-medium text-white">
                          {menuItems.length}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.06]" />

                      {/* Mot de passe */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Mot de passe</span>
                        <Badge className="bg-green/20 text-green-soft border-green/30 gap-1 text-xs">
                          <Check className="w-3 h-3" />
                          Mis à jour
                        </Badge>
                      </div>
                      <div className="h-px bg-white/[0.06]" />

                      {/* Statut agent */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Agent Voxena</span>
                        <Badge className="bg-green/20 text-green-soft border-green/30 gap-1 text-xs">
                          <Sparkles className="w-3 h-3" />
                          Actif
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bouton final */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  <Button
                    onClick={handleComplete}
                    disabled={saving}
                    className="h-12 px-8 text-base font-medium gap-2"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirection...
                      </>
                    ) : (
                      <>
                        Accéder au dashboard
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
