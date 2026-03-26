"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReservationDatePickerProps {
  currentDate: string; // YYYY-MM-DD
}

export function ReservationDatePicker({ currentDate }: ReservationDatePickerProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const isToday = currentDate === today;

  function navigate(offset: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split("T")[0];
    if (newDate === today) {
      router.push("/reservations");
    } else {
      router.push(`/reservations?date=${newDate}`);
    }
  }

  function goToday() {
    router.push("/reservations");
  }

  // Formater la date en français
  const dateObj = new Date(currentDate + "T12:00:00"); // Midi pour éviter les bugs timezone
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

      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-sm font-medium min-w-[120px] justify-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        {isToday ? "Aujourd'hui" : formatted}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isToday && (
        <Button variant="outline" size="sm" className="ml-1 text-xs h-8" onClick={goToday}>
          Aujourd&apos;hui
        </Button>
      )}
    </div>
  );
}
