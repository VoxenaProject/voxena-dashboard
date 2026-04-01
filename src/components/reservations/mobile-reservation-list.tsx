"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Check, X as XIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Reservation, FloorTable, ReservationStatus, Customer } from "@/lib/supabase/types";

interface Props { initialReservations: Reservation[]; restaurantId: string; tables: FloorTable[]; selectedDate: string; customers: Customer[] }

const tabs = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "À confirmer" },
  { key: "confirmee", label: "Confirmées" },
  { key: "assise", label: "Assises" },
];
const dotColor: Record<string, string> = { en_attente: "bg-amber-500", confirmee: "bg-green", assise: "bg-blue", terminee: "bg-muted-foreground/20", annulee: "bg-red-500", no_show: "bg-red-700", liste_attente: "bg-violet" };
const borderColor: Record<string, string> = { en_attente: "border-l-amber-500", confirmee: "border-l-green", assise: "border-l-blue" };
const zoneLabel: Record<string, string> = { salle: "Salle", terrasse: "Terrasse", bar: "Bar", salle_privee: "Privée", vip: "VIP" };

function vibrate() { try { navigator?.vibrate?.(10); } catch {} }

export function MobileReservationList({ initialReservations, restaurantId, tables, selectedDate, customers }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [activeTab, setActiveTab] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = reservations.filter((r) => !["annulee", "no_show"].includes(r.status));
  const totalResas = active.length;
  const totalCovers = active.reduce((s, r) => s + (r.covers || 0), 0);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const dateLabel = isToday ? "Aujourd'hui" : new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });
  function navDate(n: number) { const d = new Date(selectedDate + "T12:00:00"); d.setDate(d.getDate() + n); router.push(`/reservations?date=${d.toISOString().split("T")[0]}`); }

  const filtered = activeTab === "all" ? reservations.filter((r) => !["annulee", "no_show"].includes(r.status)) : reservations.filter((r) => r.status === activeTab);

  const groups: { label: string; key: string; items: Reservation[] }[] = [];
  if (activeTab === "all") {
    const p = filtered.filter((r) => r.status === "en_attente");
    const c = filtered.filter((r) => r.status === "confirmee");
    const s = filtered.filter((r) => r.status === "assise");
    const d = filtered.filter((r) => r.status === "terminee");
    if (p.length) groups.push({ label: "À confirmer", key: "en_attente", items: p });
    if (c.length) groups.push({ label: "Confirmées", key: "confirmee", items: c });
    if (s.length) groups.push({ label: "Assises", key: "assise", items: s });
    if (d.length) groups.push({ label: "Terminées", key: "terminee", items: d });
  } else groups.push({ label: tabs.find((t) => t.key === activeTab)?.label || "", key: activeTab, items: filtered });

  async function handleStatus(id: string, status: ReservationStatus) {
    vibrate();
    setUpdatingId(id);
    try {
      const res = await fetch("/api/reservations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (res.ok) {
        setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
        toast.success(status === "confirmee" ? "Confirmée !" : status === "assise" ? "Installé !" : status === "annulee" ? "Annulée" : "Mis à jour");
        setExpandedId(null);
      } else toast.error("Erreur");
    } catch { toast.error("Erreur réseau"); }
    finally { setUpdatingId(null); }
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Date */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navDate(-1)} className="h-10 w-10 flex items-center justify-center rounded-xl active:bg-muted/50 -ml-2"><ChevronLeft className="w-5 h-5 text-muted-foreground" /></button>
        <button onClick={() => { if (!isToday) router.push("/reservations"); }} className="text-sm font-semibold text-foreground px-3 py-2">{dateLabel}</button>
        <button onClick={() => navDate(1)} className="h-10 w-10 flex items-center justify-center rounded-xl active:bg-muted/50 -mr-2"><ChevronRight className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-3">
        <span><strong className="text-foreground font-mono text-sm">{totalResas}</strong> résas</span>
        <span className="text-border">·</span>
        <span><strong className="text-foreground font-mono text-sm">{totalCovers}</strong> couverts</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
        {tabs.map((t) => {
          const c = t.key === "all" ? reservations.filter((r) => !["annulee", "no_show"].includes(r.status)).length : reservations.filter((r) => r.status === t.key).length;
          return (
            <button key={t.key} onClick={() => { setActiveTab(t.key); vibrate(); }} className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all ${activeTab === t.key ? "bg-foreground text-background shadow-sm" : "bg-muted/30 text-muted-foreground"}`}>
              {t.label}{c > 0 ? ` ${c}` : ""}
            </button>
          );
        })}
      </div>

      {/* List */}
      {groups.map((section) => (
        <div key={section.key} className="mb-5">
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-10">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor[section.key] || "bg-muted-foreground"}`} />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-xs text-muted-foreground/30 font-mono">{section.items.length}</span>
          </div>
          <div className="space-y-2">
            {section.items.map((resa, i) => {
              const table = tables.find((t) => t.id === resa.table_id);
              const zone = table?.zone ? zoneLabel[table.zone] || "" : "";
              const isExpanded = expandedId === resa.id;
              const isUp = updatingId === resa.id;

              return (
                <div key={resa.id} className={`bg-card border border-border border-l-[3px] ${borderColor[resa.status] || "border-l-muted-foreground/15"} rounded-xl overflow-hidden`} style={{ animation: `fade-in-up 0.3s ease-out ${i * 30}ms both` }}>
                  {/* Main row — tap to expand */}
                  <button className="w-full text-left px-4 py-3 active:bg-muted/20 transition-colors" onClick={() => setExpandedId(isExpanded ? null : resa.id)}>
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="w-12 flex-shrink-0">
                        <span className="font-mono text-sm font-bold text-foreground">{resa.time_slot.slice(0, 5)}</span>
                      </div>
                      {/* Name + zone */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate block">{resa.customer_name}</span>
                        {zone && <span className="text-xs text-muted-foreground">{zone}</span>}
                      </div>
                      {/* Covers + dot */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">{resa.covers} couv.</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor[resa.status] || "bg-muted-foreground/20"}`} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-border/50" style={{ animation: "fade-in 0.2s ease-out" }}>
                      {/* Details */}
                      <div className="py-2.5 space-y-1 text-xs text-muted-foreground">
                        {resa.customer_phone && <p>Tel : {resa.customer_phone}</p>}
                        {resa.customer_email && <p>Email : {resa.customer_email}</p>}
                        {resa.notes && <p className="italic">"{resa.notes}"</p>}
                        {resa.occasion && resa.occasion !== "Aucune" && <p>Occasion : {resa.occasion}</p>}
                        <p>Durée : {resa.duration || 90} min · Table : {table?.name || "Auto"}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        {resa.status === "en_attente" && (
                          <>
                            <button disabled={isUp} onClick={() => handleStatus(resa.id, "confirmee")} className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-green text-white text-sm font-semibold rounded-xl active:opacity-80 disabled:opacity-50 transition-opacity">
                              <Check className="w-4 h-4" /> Confirmer
                            </button>
                            <button disabled={isUp} onClick={() => handleStatus(resa.id, "annulee")} className="h-11 w-11 flex items-center justify-center bg-red-500/8 text-red-500 rounded-xl active:bg-red-500/15 disabled:opacity-50">
                              <XIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {resa.status === "confirmee" && (
                          <button disabled={isUp} onClick={() => handleStatus(resa.id, "assise")} className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-violet text-white text-sm font-semibold rounded-xl active:opacity-80 disabled:opacity-50 transition-opacity">
                            <ArrowRight className="w-4 h-4" /> Installer à table
                          </button>
                        )}
                        {resa.status === "assise" && (
                          <button disabled={isUp} onClick={() => handleStatus(resa.id, "terminee")} className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-muted/50 text-foreground text-sm font-semibold rounded-xl active:bg-muted disabled:opacity-50 transition-opacity">
                            Terminer
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground">
            {activeTab === "en_attente" ? "Tout est confirmé !" : activeTab === "confirmee" ? "Pas de réservation confirmée" : activeTab === "assise" ? "Personne à table" : "Aucune réservation"}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">Les réservations apparaissent en temps réel</p>
        </div>
      )}
    </div>
  );
}
