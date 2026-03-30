"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import type { PracticalInfo } from "@/lib/supabase/types";

// ── Types ──

interface RestaurantPublic {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  opening_hours: Record<string, unknown> | null;
  practical_info: PracticalInfo | null;
  default_reservation_duration: number;
  turnover_buffer: number;
  zones: string[];
}

interface Slot {
  time: string;
  tables: { id: string; name: string; capacity: number; zone: string }[];
}

interface BookingData {
  date: string;
  time_slot: string;
  covers: number;
  zone: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  occasion: string;
}

// ── Constantes ──

const zoneLabels: Record<string, string> = {
  salle: "Salle",
  terrasse: "Terrasse",
  bar: "Bar",
  salle_privee: "Salle privée",
  vip: "VIP",
};

const occasions = ["Aucune", "Anniversaire", "Romantique", "Affaires", "Famille", "Amis", "Autre"];

const dayMapping: Record<string, string> = {
  sunday: "dimanche", monday: "lundi", tuesday: "mardi",
  wednesday: "mercredi", thursday: "jeudi", friday: "vendredi", saturday: "samedi",
};

// ── Page principale ──

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1=date, 2=heure, 3=infos, 4=confirmation, 5=merci
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [booking, setBooking] = useState<BookingData>({
    date: "",
    time_slot: "",
    covers: 2,
    zone: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    notes: "",
    occasion: "",
  });

  // Charger le restaurant
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/restaurants/${slug}`);
        if (!res.ok) {
          setError("Restaurant non trouvé");
          return;
        }
        const json = await res.json();
        setRestaurant(json.restaurant);
      } catch {
        setError("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Charger les créneaux quand date + covers changent
  const fetchSlots = useCallback(async () => {
    if (!restaurant || !booking.date || !booking.covers) return;
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({
        restaurant_id: restaurant.id,
        date: booking.date,
        covers: String(booking.covers),
      });
      if (booking.zone) params.set("zone", booking.zone);

      const res = await fetch(`/api/reservations/availability?${params}`);
      if (res.ok) {
        const json = await res.json();
        setSlots(json.slots || []);
      }
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [restaurant, booking.date, booking.covers, booking.zone]);

  useEffect(() => {
    if (step === 2) fetchSlots();
  }, [step, fetchSlots]);

  // Soumettre la réservation
  async function handleSubmit() {
    if (!restaurant) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          ...booking,
          preferences: booking.zone ? [booking.zone] : [],
        }),
      });

      if (res.ok) {
        setStep(5);
      } else {
        const json = await res.json();
        setError(json.error || "Erreur lors de la réservation");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  // Vérifier si un jour est ouvert
  function isDayOpen(dateStr: string): boolean {
    if (!restaurant?.opening_hours) return true;
    const d = new Date(dateStr + "T12:00:00");
    const dayEn = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const dayFr = dayMapping[dayEn] || dayEn;
    const hours = restaurant.opening_hours[dayFr] || restaurant.opening_hours[dayEn];
    if (!hours) return false;
    if (typeof hours === "object" && !Array.isArray(hours) && "open" in (hours as Record<string, unknown>)) {
      return (hours as { open: boolean }).open !== false;
    }
    if (typeof hours === "object" && !Array.isArray(hours) && "services" in (hours as Record<string, unknown>)) {
      const h = hours as { services?: unknown[]; open?: boolean };
      return h.open !== false && (h.services?.length || 0) > 0;
    }
    return Array.isArray(hours) && hours.length > 0;
  }

  // Générer les 30 prochains jours
  function getNext30Days(): { date: string; label: string; dayName: string; isOpen: boolean }[] {
    const days = [];
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("fr-BE", { day: "numeric", month: "short" }),
        dayName: dayNames[d.getDay()],
        isOpen: isDayOpen(dateStr),
      });
    }
    return days;
  }

  // ── Loading / Error states ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet" />
      </div>
    );
  }

  if (error && step !== 4) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-2">{error}</p>
          <p className="text-sm text-muted-foreground">Vérifiez le lien et réessayez</p>
        </div>
      </div>
    );
  }

  if (!restaurant) return null;

  const days = getNext30Days();

  // ── Render ──

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="font-heading text-lg font-bold">{restaurant.name}</h1>
            {restaurant.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {restaurant.address}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Progress */}
        {step < 5 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-violet" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1 — Date + Couverts */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold mb-1">Choisissez une date</h2>
                <p className="text-sm text-muted-foreground">Sélectionnez le jour et le nombre de personnes</p>
              </div>

              {/* Couverts */}
              <div>
                <label className="text-sm font-medium mb-2 block">Nombre de personnes</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBooking((b) => ({ ...b, covers: n }))}
                      className={`w-11 h-11 rounded-xl text-sm font-medium transition-all ${
                        booking.covers === n
                          ? "bg-violet text-white shadow-md"
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone (si plusieurs zones) */}
              {restaurant.zones.length > 1 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Zone (optionnel)</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setBooking((b) => ({ ...b, zone: "" }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        !booking.zone
                          ? "bg-violet text-white shadow-md"
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      Indifférent
                    </button>
                    {restaurant.zones.map((z) => (
                      <button
                        key={z}
                        onClick={() => setBooking((b) => ({ ...b, zone: z }))}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          booking.zone === z
                            ? "bg-violet text-white shadow-md"
                            : "bg-muted/50 text-foreground hover:bg-muted"
                        }`}
                      >
                        {zoneLabels[z] || z}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendrier */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                  {days.map((day) => (
                    <button
                      key={day.date}
                      disabled={!day.isOpen}
                      onClick={() => setBooking((b) => ({ ...b, date: day.date, time_slot: "" }))}
                      className={`flex flex-col items-center p-2 rounded-xl text-sm transition-all ${
                        !day.isOpen
                          ? "opacity-30 cursor-not-allowed"
                          : booking.date === day.date
                            ? "bg-violet text-white shadow-md"
                            : "bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-[10px] font-medium">{day.dayName}</span>
                      <span className="text-sm font-semibold">{day.label.split(" ")[0]}</span>
                      <span className="text-[10px]">{day.label.split(" ")[1]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!booking.date}
                className="w-full py-3 bg-violet text-white rounded-xl font-medium transition-all hover:bg-violet/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2 — Heure */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="p-1 rounded-lg hover:bg-muted">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Choisissez l&apos;heure</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.date + "T12:00:00").toLocaleDateString("fr-BE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {" · "}
                    {booking.covers} personne{booking.covers > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-violet" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Aucun créneau disponible</p>
                  <p className="text-xs mt-1">Essayez une autre date ou un nombre de personnes différent</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setBooking((b) => ({ ...b, time_slot: slot.time }))}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        booking.time_slot === slot.time
                          ? "bg-violet text-white shadow-md"
                          : "bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={!booking.time_slot}
                className="w-full py-3 bg-violet text-white rounded-xl font-medium transition-all hover:bg-violet/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 3 — Informations client */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="p-1 rounded-lg hover:bg-muted">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Vos coordonnées</h2>
                  <p className="text-sm text-muted-foreground">Pour confirmer votre réservation</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom *</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={booking.customer_name}
                      onChange={(e) => setBooking((b) => ({ ...b, customer_name: e.target.value }))}
                      placeholder="Votre nom"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={booking.customer_phone}
                      onChange={(e) => setBooking((b) => ({ ...b, customer_phone: e.target.value }))}
                      placeholder="+32 4XX XX XX XX"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email (optionnel)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={booking.customer_email}
                      onChange={(e) => setBooking((b) => ({ ...b, customer_email: e.target.value }))}
                      placeholder="email@exemple.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Occasion</label>
                  <div className="flex gap-2 flex-wrap">
                    {occasions.map((occ) => (
                      <button
                        key={occ}
                        onClick={() => setBooking((b) => ({ ...b, occasion: occ === "Aucune" ? "" : occ }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          (booking.occasion === occ || (!booking.occasion && occ === "Aucune"))
                            ? "bg-violet/10 text-violet border border-violet/20"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {occ}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes (optionnel)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <textarea
                      value={booking.notes}
                      onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))}
                      placeholder="Allergies, chaise haute, demandes spéciales..."
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(4)}
                disabled={!booking.customer_name || !booking.customer_phone}
                className="w-full py-3 bg-violet text-white rounded-xl font-medium transition-all hover:bg-violet/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Vérifier et confirmer <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 4 — Confirmation */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(3)} className="p-1 rounded-lg hover:bg-muted">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold">Confirmer votre réservation</h2>
              </div>

              <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-violet" />
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(booking.date + "T12:00:00").toLocaleDateString("fr-BE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">Date</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-violet" />
                  <div>
                    <p className="text-sm font-medium">{booking.time_slot}</p>
                    <p className="text-xs text-muted-foreground">Heure</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-violet" />
                  <div>
                    <p className="text-sm font-medium">
                      {booking.covers} personne{booking.covers > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Couverts</p>
                  </div>
                </div>

                {booking.zone && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-violet" />
                    <div>
                      <p className="text-sm font-medium">{zoneLabels[booking.zone] || booking.zone}</p>
                      <p className="text-xs text-muted-foreground">Zone</p>
                    </div>
                  </div>
                )}

                <hr className="border-border" />

                <div>
                  <p className="text-sm font-medium">{booking.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
                  {booking.customer_email && (
                    <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                  )}
                </div>

                {booking.occasion && (
                  <p className="text-xs text-muted-foreground">
                    <PartyPopper className="w-3 h-3 inline mr-1" />
                    {booking.occasion}
                  </p>
                )}

                {booking.notes && (
                  <p className="text-xs text-muted-foreground italic">&quot;{booking.notes}&quot;</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-600 text-sm p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-violet text-white rounded-xl font-medium transition-all hover:bg-violet/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Réservation en cours...</>
                ) : (
                  <><Check className="w-4 h-4" /> Confirmer la réservation</>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 5 — Merci */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto"
              >
                <Check className="w-8 h-8 text-green" />
              </motion.div>

              <h2 className="text-2xl font-bold">Réservation confirmée !</h2>
              <p className="text-muted-foreground">
                Votre table est réservée chez <span className="font-medium text-foreground">{restaurant.name}</span>
              </p>

              <div className="bg-muted/30 rounded-2xl p-4 inline-block text-left mx-auto">
                <p className="text-sm">
                  <span className="font-medium">
                    {new Date(booking.date + "T12:00:00").toLocaleDateString("fr-BE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  {" à "}
                  <span className="font-medium">{booking.time_slot}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {booking.covers} personne{booking.covers > 1 ? "s" : ""} · {booking.customer_name}
                </p>
              </div>

              {booking.customer_email && (
                <p className="text-xs text-muted-foreground">
                  Un email de confirmation a été envoyé à {booking.customer_email}
                </p>
              )}

              {restaurant.phone && (
                <p className="text-xs text-muted-foreground">
                  Pour modifier votre réservation, appelez le{" "}
                  <a href={`tel:${restaurant.phone}`} className="text-violet font-medium">
                    {restaurant.phone}
                  </a>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Propulsé par{" "}
          <a href="https://getvoxena.com" target="_blank" rel="noopener noreferrer" className="text-violet font-medium">
            Voxena
          </a>
        </p>
      </footer>
    </div>
  );
}
