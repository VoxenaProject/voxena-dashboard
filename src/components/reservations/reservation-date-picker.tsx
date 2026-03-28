"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface ReservationDatePickerProps {
  currentDate: string; // YYYY-MM-DD
  basePath?: string; // "/reservations", "/orders", ou "/"
}

/**
 * Sélecteur de date partagé — style Apple Calendar.
 * Utilisé sur le dashboard (/), les commandes (/orders) et les réservations (/reservations).
 */
export function ReservationDatePicker({
  currentDate,
  basePath = "/reservations",
}: ReservationDatePickerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];
  const isToday = currentDate === today;

  function goToDate(newDate: string) {
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

  // Formater la date en français — "Ven 28 mars"
  const dateObj = new Date(currentDate + "T12:00:00");
  const formatted = dateObj.toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  // Capitaliser la première lettre du jour
  const displayDate =
    formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return (
    <div className="p-1 bg-muted/40 rounded-2xl inline-flex items-center gap-0.5">
      {/* Flèche gauche */}
      <button
        onClick={() => navigate(-1)}
        className="w-8 h-8 rounded-xl hover:bg-background flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
        aria-label="Jour précédent"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Affichage de la date — cliquable pour ouvrir le date picker natif */}
      <button
        onClick={() => inputRef.current?.showPicker()}
        className="px-4 py-1.5 rounded-xl text-sm hover:bg-background transition-colors min-w-[140px] text-center cursor-pointer"
      >
        {isToday ? (
          <span className="font-semibold text-foreground">
            Aujourd&apos;hui
          </span>
        ) : (
          <span className="font-medium text-foreground">{displayDate}</span>
        )}
      </button>

      {/* Input date caché pour le picker natif */}
      <input
        ref={inputRef}
        type="date"
        value={currentDate}
        onChange={(e) => {
          if (e.target.value) goToDate(e.target.value);
        }}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Flèche droite */}
      <button
        onClick={() => navigate(1)}
        className="w-8 h-8 rounded-xl hover:bg-background flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
        aria-label="Jour suivant"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Bouton "Aujourd'hui" — affiché uniquement quand on n'est pas sur aujourd'hui */}
      {!isToday && (
        <button
          onClick={() => goToDate(today)}
          className="text-xs text-violet font-medium ml-1 px-2 py-1 rounded-xl hover:bg-background transition-colors"
        >
          Aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
