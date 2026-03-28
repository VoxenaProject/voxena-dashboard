/**
 * Mapping jour anglais → français pour les horaires d'ouverture.
 * Partagé entre les routes orders/create, reservations/availability, etc.
 */
export const DAY_EN_TO_FR: Record<string, string> = {
  sunday: "dimanche",
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
};

/**
 * Retourne le nom du jour en français pour une date donnée.
 */
export function getDayFrench(date: Date): string {
  const dayEnglish = date
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Brussels" })
    .toLowerCase();
  return DAY_EN_TO_FR[dayEnglish] || dayEnglish;
}

/**
 * Interface pour un service (plage horaire) d'un restaurant.
 */
interface ServiceSlot {
  from: string;
  to: string;
}

interface DayHours {
  open?: boolean;
  services?: ServiceSlot[];
}

/**
 * Extrait les plages horaires d'ouverture pour un jour donné.
 * Gère les différents formats de stockage (français/anglais, services/array).
 * Retourne null si le restaurant est fermé ce jour-là.
 */
export function getOpeningSlots(
  openingHours: Record<string, DayHours | { open: string; close: string }[]> | null | undefined,
  date: Date
): { open: string; close: string }[] | null {
  if (!openingHours) return null;

  // Utiliser le timezone Brussels pour déterminer le bon jour
  const dayEnglish = date
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Brussels" })
    .toLowerCase();
  const dayFrench = DAY_EN_TO_FR[dayEnglish] || dayEnglish;

  // Chercher d'abord en français, puis en anglais (compatibilité)
  const dayHours = openingHours[dayFrench] || openingHours[dayEnglish];

  // Si le jour est fermé
  if (!dayHours) return null;

  // Format objet avec open=false
  if (
    !Array.isArray(dayHours) &&
    ((dayHours as DayHours).open === false ||
      ((dayHours as DayHours).services &&
        (dayHours as DayHours).services!.length === 0))
  ) {
    return null;
  }

  // Format avec services
  if (!Array.isArray(dayHours) && (dayHours as DayHours).services && Array.isArray((dayHours as DayHours).services)) {
    return (dayHours as DayHours).services!.map((s) => ({
      open: s.from,
      close: s.to,
    }));
  }

  // Format array direct [{ open: "11:00", close: "23:00" }]
  if (Array.isArray(dayHours) && dayHours.length > 0) {
    return dayHours as { open: string; close: string }[];
  }

  return null;
}

/**
 * Vérifie si le restaurant est actuellement ouvert.
 * Retourne un objet avec le statut et le prochain créneau d'ouverture si fermé.
 */
export function checkRestaurantOpen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openingHours: Record<string, any> | null | undefined,
  now: Date = new Date()
): {
  isOpen: boolean;
  closingSoon: boolean; // Ferme dans moins de 15 minutes
  minutesUntilClose: number | null;
  reopens: string | null; // Ex: "mardi à 11:30"
} {
  const slots = getOpeningSlots(openingHours, now);

  // Convertir en heure Brussels (le serveur Vercel est en UTC)
  const brusselsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  const currentMinutes = brusselsTime.getHours() * 60 + brusselsTime.getMinutes();

  if (!slots || slots.length === 0) {
    // Fermé aujourd'hui — trouver le prochain jour d'ouverture
    const reopens = findNextOpening(openingHours, now);
    return { isOpen: false, closingSoon: false, minutesUntilClose: null, reopens };
  }

  // Vérifier si on est dans un créneau ouvert
  for (const slot of slots) {
    const [openH, openM] = slot.open.split(":").map(Number);
    const [closeH, closeM] = slot.close.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      const minutesUntilClose = closeMinutes - currentMinutes;
      return {
        isOpen: true,
        closingSoon: minutesUntilClose <= 15,
        minutesUntilClose,
        reopens: null,
      };
    }
  }

  // On est entre deux services ou après la fermeture
  // Vérifier s'il y a un service plus tard aujourd'hui
  for (const slot of slots) {
    const [openH, openM] = slot.open.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    if (currentMinutes < openMinutes) {
      const dayFr = getDayFrench(now);
      return {
        isOpen: false,
        closingSoon: false,
        minutesUntilClose: null,
        reopens: `${dayFr} à ${slot.open}`,
      };
    }
  }

  // Après le dernier service — trouver le prochain jour d'ouverture
  const reopens = findNextOpening(openingHours, now, true);
  return { isOpen: false, closingSoon: false, minutesUntilClose: null, reopens };
}

/**
 * Trouve le prochain créneau d'ouverture (dans les 7 prochains jours).
 */
function findNextOpening(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openingHours: Record<string, any> | null | undefined,
  now: Date,
  skipToday: boolean = false
): string | null {
  if (!openingHours) return null;

  const startOffset = skipToday ? 1 : 1; // On commence toujours au jour suivant
  for (let i = startOffset; i <= 7; i++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + i);
    const slots = getOpeningSlots(openingHours, futureDate);
    if (slots && slots.length > 0) {
      const dayFr = getDayFrench(futureDate);
      return `${dayFr} à ${slots[0].open}`;
    }
  }

  return null;
}
