// Constantes des zones pour le plan de salle Voxena Tables

export const ZONES = [
  { value: "salle", label: "Salle", color: "bg-blue-100 border-blue-300", dotColor: "bg-blue-400" },
  { value: "terrasse", label: "Terrasse", color: "bg-emerald-100 border-emerald-300", dotColor: "bg-emerald-400" },
  { value: "bar", label: "Bar", color: "bg-amber-100 border-amber-300", dotColor: "bg-amber-400" },
  { value: "salle_privee", label: "Salle privée", color: "bg-violet-100 border-violet-300", dotColor: "bg-violet-400" },
  { value: "vip", label: "VIP", color: "bg-yellow-100 border-yellow-300", dotColor: "bg-yellow-500" },
] as const;

// Trouver une zone par sa valeur
export function getZoneConfig(zone: string) {
  return ZONES.find((z) => z.value === zone) ?? ZONES[0];
}
