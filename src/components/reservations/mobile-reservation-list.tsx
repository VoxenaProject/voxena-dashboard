"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Reservation, FloorTable, ReservationStatus, Customer } from "@/lib/supabase/types";

interface Props {
  initialReservations: Reservation[];
  restaurantId: string;
  tables: FloorTable[];
  selectedDate: string;
  customers: Customer[];
}

const statusTabs = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "À confirmer" },
  { key: "confirmee", label: "Confirmées" },
  { key: "assise", label: "Assises" },
];

const statusDot: Record<string, string> = {
  en_attente: "bg-amber-500", confirmee: "bg-green", assise: "bg-blue",
  terminee: "bg-muted-foreground/30", annulee: "bg-red-500", no_show: "bg-red-700", liste_attente: "bg-violet",
};

export function MobileReservationList({ initialReservations, restaurantId, tables, selectedDate, customers }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [activeTab, setActiveTab] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Stats
  const totalResas = reservations.filter((r) => r.status !== "annulee" && r.status !== "no_show").length;
  const totalCovers = reservations.filter((r) => r.status !== "annulee" && r.status !== "no_show").reduce((s, r) => s + (r.covers || 0), 0);
  const pendingCount = reservations.filter((r) => r.status === "en_attente").length;

  // Date navigation
  const dateObj = new Date(selectedDate + "T12:00:00");
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const dateLabel = isToday
    ? "Aujourd'hui"
    : dateObj.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

  function navigateDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    router.push(`/reservations?date=${d.toISOString().split("T")[0]}`);
  }

  // Filtrage
  const filtered = activeTab === "all"
    ? reservations.filter((r) => r.status !== "annulee" && r.status !== "no_show")
    : reservations.filter((r) => r.status === activeTab);

  // Grouper par statut
  const groups: { label: string; status: string; resas: Reservation[] }[] = [];
  if (activeTab === "all") {
    const pending = filtered.filter((r) => r.status === "en_attente");
    const confirmed = filtered.filter((r) => r.status === "confirmee");
    const seated = filtered.filter((r) => r.status === "assise");
    const done = filtered.filter((r) => r.status === "terminee");
    if (pending.length) groups.push({ label: "À confirmer", status: "en_attente", resas: pending });
    if (confirmed.length) groups.push({ label: "Confirmées", status: "confirmee", resas: confirmed });
    if (seated.length) groups.push({ label: "Assises", status: "assise", resas: seated });
    if (done.length) groups.push({ label: "Terminées", status: "terminee", resas: done });
  } else {
    groups.push({ label: statusTabs.find((t) => t.key === activeTab)?.label || "", status: activeTab, resas: filtered });
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
        toast.success(status === "confirmee" ? "Réservation confirmée" : status === "assise" ? "Client installé" : "Statut mis à jour");
      } else {
        toast.error("Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="px-3 pt-2 pb-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg active:bg-muted/50">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => { if (!isToday) router.push("/reservations"); }}
          className="text-sm font-semibold text-foreground"
        >
          {dateLabel}
        </button>
        <button onClick={() => navigateDate(1)} className="p-2 rounded-lg active:bg-muted/50">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats inline */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-3">
        <span><strong className="text-foreground">{totalResas}</strong> résas</span>
        <span className="text-border">·</span>
        <span><strong className="text-foreground">{totalCovers}</strong> couverts</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-3 px-3 scrollbar-none">
        {statusTabs.map((tab) => {
          const count = tab.key === "all"
            ? reservations.filter((r) => r.status !== "annulee" && r.status !== "no_show").length
            : reservations.filter((r) => r.status === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {tab.label}{count > 0 && ` ${count}`}
            </button>
          );
        })}
      </div>

      {/* Grouped reservations */}
      {groups.map((section) => (
        <div key={section.label} className="mb-4">
          <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
            <span className={`w-2 h-2 rounded-full ${statusDot[section.status] || "bg-muted-foreground"}`} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.label}</span>
            <span className="text-xs text-muted-foreground/50">{section.resas.length}</span>
          </div>
          <div className="space-y-1.5">
            {section.resas.map((resa) => {
              const table = tables.find((t) => t.id === resa.table_id);
              const zone = table?.zone || "";
              const zoneLabel = zone === "salle" ? "Salle" : zone === "terrasse" ? "Terrasse" : zone === "bar" ? "Bar" : zone === "vip" ? "VIP" : "";
              const isUpdating = updatingId === resa.id;

              return (
                <div key={resa.id} className="bg-card border border-border rounded-xl p-2.5">
                  {/* Ligne 1 : heure + nom + couverts */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-foreground w-10 flex-shrink-0">{resa.time_slot.slice(0, 5)}</span>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{resa.customer_name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{resa.covers} couv.</span>
                  </div>
                  {/* Ligne 2 : zone + actions */}
                  <div className="flex items-center justify-between mt-1.5 pl-12">
                    <span className="text-[10px] text-muted-foreground">{zoneLabel || (table?.name || "")}</span>
                    <div className="flex items-center gap-1">
                      {resa.status === "en_attente" && (
                        <>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatus(resa.id, "confirmee")}
                            className="text-xs font-semibold text-violet px-2.5 py-1.5 rounded-lg active:bg-violet/5 disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatus(resa.id, "annulee")}
                            className="text-xs font-medium text-red-500 px-2 py-1.5 rounded-lg active:bg-red-500/5 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {resa.status === "confirmee" && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatus(resa.id, "assise")}
                          className="text-xs font-semibold text-violet px-2.5 py-1.5 rounded-lg active:bg-violet/5 disabled:opacity-50"
                        >
                          Asseoir →
                        </button>
                      )}
                      {resa.status === "assise" && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatus(resa.id, "terminee")}
                          className="text-xs font-semibold text-violet px-2.5 py-1.5 rounded-lg active:bg-violet/5 disabled:opacity-50"
                        >
                          Terminer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucune réservation</p>
        </div>
      )}
    </div>
  );
}
