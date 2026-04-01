"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { Reservation, FloorTable, ReservationStatus, Customer } from "@/lib/supabase/types";

interface Props {
  initialReservations: Reservation[];
  restaurantId: string;
  tables: FloorTable[];
  selectedDate: string;
  customers: Customer[];
}

const tabs = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "À confirmer" },
  { key: "confirmee", label: "Confirmées" },
  { key: "assise", label: "Assises" },
];

const dotColor: Record<string, string> = {
  en_attente: "bg-amber-500", confirmee: "bg-green", assise: "bg-blue",
  terminee: "bg-muted-foreground/20", annulee: "bg-red-500", no_show: "bg-red-700", liste_attente: "bg-violet",
};

const statusBorder: Record<string, string> = {
  en_attente: "border-l-amber-500",
  confirmee: "border-l-green",
  assise: "border-l-blue",
};

const zoneLabels: Record<string, string> = {
  salle: "Salle", terrasse: "Terrasse", bar: "Bar", salle_privee: "Privée", vip: "VIP",
};

export function MobileReservationList({ initialReservations, restaurantId, tables, selectedDate, customers }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [activeTab, setActiveTab] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const active = reservations.filter((r) => !["annulee", "no_show"].includes(r.status));
  const totalResas = active.length;
  const totalCovers = active.reduce((s, r) => s + (r.covers || 0), 0);

  // Date nav
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const dateLabel = isToday ? "Aujourd'hui" : new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

  function navDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    router.push(`/reservations?date=${d.toISOString().split("T")[0]}`);
  }

  // Filtrage
  const filtered = activeTab === "all"
    ? reservations.filter((r) => !["annulee", "no_show"].includes(r.status))
    : reservations.filter((r) => r.status === activeTab);

  // Grouper par statut pour "Toutes"
  const groups: { label: string; key: string; items: Reservation[] }[] = [];
  if (activeTab === "all") {
    const pending = filtered.filter((r) => r.status === "en_attente");
    const confirmed = filtered.filter((r) => r.status === "confirmee");
    const seated = filtered.filter((r) => r.status === "assise");
    const done = filtered.filter((r) => r.status === "terminee");
    if (pending.length) groups.push({ label: "À confirmer", key: "en_attente", items: pending });
    if (confirmed.length) groups.push({ label: "Confirmées", key: "confirmee", items: confirmed });
    if (seated.length) groups.push({ label: "Assises", key: "assise", items: seated });
    if (done.length) groups.push({ label: "Terminées", key: "terminee", items: done });
  } else {
    groups.push({ label: tabs.find((t) => t.key === activeTab)?.label || "", key: activeTab, items: filtered });
  }

  async function handleStatus(id: string, status: ReservationStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
        const msg = status === "confirmee" ? "Confirmée" : status === "assise" ? "Installé" : status === "annulee" ? "Annulée" : "Mis à jour";
        toast.success(msg);
      } else toast.error("Erreur");
    } catch { toast.error("Erreur réseau"); }
    finally { setUpdatingId(null); }
  }

  return (
    <div className="px-3 pt-1 pb-4">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navDate(-1)} className="p-2 -ml-2 rounded-lg active:bg-muted/50"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
        <button onClick={() => { if (!isToday) router.push("/reservations"); }} className="text-sm font-semibold text-foreground">{dateLabel}</button>
        <button onClick={() => navDate(1)} className="p-2 -mr-2 rounded-lg active:bg-muted/50"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-3">
        <span><strong className="text-foreground font-mono">{totalResas}</strong> résas</span>
        <span className="text-border">·</span>
        <span><strong className="text-foreground font-mono">{totalCovers}</strong> couverts</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none">
        {tabs.map((t) => {
          const count = t.key === "all"
            ? reservations.filter((r) => !["annulee", "no_show"].includes(r.status)).length
            : reservations.filter((r) => r.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === t.key ? "bg-foreground text-background" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {t.label}{count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      {groups.map((section) => (
        <div key={section.key} className="mb-5">
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
            <span className={`w-2 h-2 rounded-full ${dotColor[section.key] || "bg-muted-foreground"}`} />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-[11px] text-muted-foreground/40">{section.items.length}</span>
          </div>
          <div className="space-y-2">
            {section.items.map((resa) => {
              const table = tables.find((t) => t.id === resa.table_id);
              const zone = table?.zone ? zoneLabels[table.zone] || table.zone : table?.name || "";
              const isExpanded = expandedId === resa.id;
              const isUpdating = updatingId === resa.id;

              return (
                <div
                  key={resa.id}
                  className={`bg-card border border-border border-l-[3px] ${statusBorder[resa.status] || "border-l-muted-foreground/20"} rounded-xl overflow-hidden`}
                >
                  {/* Clickable area */}
                  <button
                    className="w-full text-left px-3 py-2.5 active:bg-muted/30"
                    onClick={() => setExpandedId(isExpanded ? null : resa.id)}
                  >
                    {/* Row 1 */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground w-10 flex-shrink-0">{resa.time_slot.slice(0, 5)}</span>
                      <span className="text-sm font-semibold text-foreground truncate flex-1">{resa.customer_name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{resa.covers} couv.</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor[resa.status] || "bg-muted-foreground/20"}`} />
                    </div>
                    {/* Row 2 : zone + info */}
                    <div className="flex items-center gap-2 mt-0.5 pl-12">
                      {zone && <span className="text-[10px] text-muted-foreground">{zone}</span>}
                      {resa.occasion && resa.occasion !== "Aucune" && <span className="text-[10px] text-muted-foreground">· {resa.occasion}</span>}
                    </div>
                  </button>

                  {/* Expanded : details + actions */}
                  {isExpanded && (
                    <div className="px-3 pb-2.5 pt-0 border-t border-border/50">
                      {/* Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-[11px] text-muted-foreground">
                        {resa.customer_phone && <span>Tel: {resa.customer_phone}</span>}
                        {resa.customer_email && <span>Email: {resa.customer_email}</span>}
                        {resa.notes && <span className="italic">"{resa.notes}"</span>}
                        <span>Durée: {resa.duration || 90} min</span>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {resa.status === "en_attente" && (
                          <>
                            <button disabled={isUpdating} onClick={() => handleStatus(resa.id, "confirmee")} className="flex-1 text-center text-xs font-semibold text-white bg-green rounded-lg py-2 active:opacity-80 disabled:opacity-50">Confirmer</button>
                            <button disabled={isUpdating} onClick={() => handleStatus(resa.id, "annulee")} className="text-xs font-medium text-red-500 bg-red-500/5 rounded-lg px-4 py-2 active:bg-red-500/10 disabled:opacity-50">Annuler</button>
                          </>
                        )}
                        {resa.status === "confirmee" && (
                          <button disabled={isUpdating} onClick={() => handleStatus(resa.id, "assise")} className="flex-1 text-center text-xs font-semibold text-white bg-violet rounded-lg py-2 active:opacity-80 disabled:opacity-50">Installer à table</button>
                        )}
                        {resa.status === "assise" && (
                          <button disabled={isUpdating} onClick={() => handleStatus(resa.id, "terminee")} className="flex-1 text-center text-xs font-semibold text-violet bg-violet/5 border border-violet/15 rounded-lg py-2 active:bg-violet/10 disabled:opacity-50">Terminer</button>
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
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Aucune réservation</p>
        </div>
      )}
    </div>
  );
}
