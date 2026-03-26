"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface ReservationDatePickerProps {
  currentDate: string; // YYYY-MM-DD
  basePath?: string; // "/reservations" ou "/orders"
}

export function ReservationDatePicker({ currentDate, basePath = "/reservations" }: ReservationDatePickerProps) {
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

  // Formater la date en français
  const dateObj = new Date(currentDate + "T12:00:00");
  const formatted = dateObj.toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Zone cliquable qui ouvre le date picker natif */}
      <button
        onClick={() => inputRef.current?.showPicker()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-sm font-medium min-w-[130px] justify-center transition-colors cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        {isToday ? "Aujourd'hui" : formatted}
      </button>

      {/* Input date caché */}
      <input
        ref={inputRef}
        type="date"
        value={currentDate}
        onChange={(e) => goToDate(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isToday && (
        <Button variant="outline" size="sm" className="ml-1 text-xs h-8" onClick={() => goToDate(today)}>
          Aujourd&apos;hui
        </Button>
      )}
    </div>
  );
}
