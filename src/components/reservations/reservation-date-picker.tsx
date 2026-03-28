"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ReservationDatePickerProps {
  currentDate: string; // YYYY-MM-DD
  basePath?: string; // "/reservations", "/orders", ou "/"
}

// Noms des jours et mois en français
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/**
 * Sélecteur de date partagé — mini calendrier Apple-style.
 * Utilisé sur le dashboard (/), les commandes (/orders) et les réservations (/reservations).
 */
export function ReservationDatePicker({
  currentDate,
  basePath = "/reservations",
}: ReservationDatePickerProps) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(currentDate + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const isToday = currentDate === today;

  // Fermer le calendrier quand on clique en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [calendarOpen]);

  // Syncer le mois affiché quand la date change
  useEffect(() => {
    const d = new Date(currentDate + "T12:00:00");
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [currentDate]);

  function goToDate(newDate: string) {
    setCalendarOpen(false);
    if (newDate === today) {
      router.push(basePath);
    } else {
      router.push(`${basePath}?date=${newDate}`);
    }
  }

  function navigate(offset: number) {
    const d = new Date(currentDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    goToDate(d.toISOString().split("T")[0]);
  }

  function navigateMonth(offset: number) {
    setViewMonth((prev) => {
      let m = prev.month + offset;
      let y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0) { m = 11; y--; }
      return { year: y, month: m };
    });
  }

  // Générer les jours du mois pour le calendrier
  function getDaysInMonth(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Jour de la semaine du 1er (lundi = 0, dimanche = 6)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (number | null)[] = [];
    // Jours vides avant le 1er
    for (let i = 0; i < startDay; i++) days.push(null);
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }

  const days = getDaysInMonth(viewMonth.year, viewMonth.month);

  // Formater la date affichée
  const dateObj = new Date(currentDate + "T12:00:00");
  const formatted = dateObj.toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const displayDate = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return (
    <div className="relative" ref={containerRef}>
      <div className="p-1 bg-muted/40 rounded-2xl inline-flex items-center gap-0.5">
        {/* Flèche gauche */}
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl hover:bg-background flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Jour précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Affichage de la date — cliquable pour ouvrir le calendrier */}
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="px-4 py-1.5 rounded-xl text-sm hover:bg-background transition-colors min-w-[140px] text-center cursor-pointer"
        >
          {isToday ? (
            <span className="font-semibold text-foreground">Aujourd&apos;hui</span>
          ) : (
            <span className="font-medium text-foreground">{displayDate}</span>
          )}
        </button>

        {/* Flèche droite */}
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-xl hover:bg-background flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Jour suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Bouton "Aujourd'hui" */}
        {!isToday && (
          <button
            onClick={() => goToDate(today)}
            className="text-xs text-violet font-medium ml-1 px-2 py-1 rounded-xl hover:bg-background transition-colors"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Mini calendrier dropdown */}
      {calendarOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header du mois */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-semibold">
              {MOIS[viewMonth.month]} {viewMonth.year}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 mb-1">
            {JOURS.map((j) => (
              <div key={j} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1">
                {j}
              </div>
            ))}
          </div>

          {/* Grille des jours */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} />;
              }

              const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = dateStr === currentDate;
              const isTodayDay = dateStr === today;
              const isPast = dateStr < today;

              return (
                <button
                  key={dateStr}
                  onClick={() => goToDate(dateStr)}
                  className={`w-8 h-8 mx-auto rounded-lg text-xs font-medium transition-all flex items-center justify-center
                    ${isSelected
                      ? "bg-violet text-white shadow-sm"
                      : isTodayDay
                        ? "bg-violet/10 text-violet font-semibold"
                        : isPast
                          ? "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
                          : "text-foreground hover:bg-muted"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bouton Aujourd'hui en bas */}
          <button
            onClick={() => goToDate(today)}
            className="w-full mt-3 py-1.5 text-xs text-violet font-medium hover:bg-violet/5 rounded-lg transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>
      )}
    </div>
  );
}
