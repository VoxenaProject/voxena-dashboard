import { Check, X } from "lucide-react";
import type { RestaurantHealth } from "@/lib/dashboard/admin-stats";

const checks = [
  { key: "hasPhone" as const, label: "Téléphone renseigné" },
  { key: "hasMenu" as const, label: "Menu configuré" },
  { key: "hasAgentId" as const, label: "Agent ElevenLabs lié" },
  { key: "hasWhatsApp" as const, label: "WhatsApp configuré" },
];

export function OnboardingChecklist({ restaurant }: { restaurant: RestaurantHealth }) {
  const completed = checks.filter((c) => restaurant[c.key]).length;
  const total = checks.length;
  const allDone = completed === total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Setup {completed}/{total}
        </p>
        <div className="h-1.5 flex-1 ml-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allDone ? "bg-green" : "bg-violet"
            }`}
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>
      {checks.map((c) => {
        const done = restaurant[c.key];
        return (
          <div key={c.key} className="flex items-center gap-2 text-xs">
            {done ? (
              <Check className="w-3.5 h-3.5 text-green" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
            <span className={done ? "text-foreground" : "text-muted-foreground"}>
              {c.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
