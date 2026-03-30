/**
 * Templates SMS pour Voxena.
 * Tous les messages sont en français et restent courts (< 160 chars si possible).
 */

interface OrderItem {
  name: string;
  quantity: number;
}

// ── Confirmation de commande ──

export function orderConfirmationSms({
  customerName,
  restaurantName,
  items,
  totalAmount,
  orderType,
  pickupTime,
}: {
  customerName: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number | null;
  orderType: string | null;
  pickupTime: string | null;
}): string {
  const firstName = customerName.split(" ")[0];
  const itemsSummary = items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");
  const more = items.length > 3 ? ` +${items.length - 3} autre(s)` : "";
  const total = totalAmount ? ` — ${Number(totalAmount).toFixed(2)}€` : "";
  const type = orderType === "livraison" ? "Livraison" : "À emporter";
  const eta = pickupTime ? ` vers ${pickupTime}` : "";

  return `${restaurantName} : Bonjour ${firstName}, votre commande est confirmée !\n${itemsSummary}${more}${total}\n${type}${eta}\nMerci et à bientôt !`;
}

// ── Commande prête ──

export function orderReadySms({
  customerName,
  restaurantName,
}: {
  customerName: string;
  restaurantName: string;
}): string {
  const firstName = customerName.split(" ")[0];
  return `${restaurantName} : ${firstName}, votre commande est prête ! Vous pouvez venir la récupérer. À tout de suite !`;
}

// ── Confirmation de réservation ──

export function reservationConfirmationSms({
  customerName,
  restaurantName,
  date,
  timeSlot,
  covers,
}: {
  customerName: string;
  restaurantName: string;
  date: string;
  timeSlot: string;
  covers: number;
}): string {
  const firstName = customerName.split(" ")[0];
  const dateObj = new Date(date + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return `${restaurantName} : Bonjour ${firstName}, votre réservation est confirmée !\n${dateLabel} à ${timeSlot} — ${covers} personne${covers > 1 ? "s" : ""}\nÀ bientôt !`;
}

// ── Rappel de réservation (J-1) ──

export function reservationReminderSms({
  customerName,
  restaurantName,
  timeSlot,
  covers,
}: {
  customerName: string;
  restaurantName: string;
  timeSlot: string;
  covers: number;
}): string {
  const firstName = customerName.split(" ")[0];
  return `${restaurantName} : Rappel — ${firstName}, on vous attend demain à ${timeSlot} (${covers} pers.). En cas d'empêchement, merci de nous prévenir.`;
}

// ── Rappel jour même (H-2) ──

export function reservationSameDayReminderSms({
  customerName,
  restaurantName,
  timeSlot,
}: {
  customerName: string;
  restaurantName: string;
  timeSlot: string;
}): string {
  const firstName = customerName.split(" ")[0];
  return `${restaurantName} : ${firstName}, petit rappel — votre table est réservée aujourd'hui à ${timeSlot}. À tout à l'heure !`;
}
