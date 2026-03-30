/**
 * Fonctions haut niveau pour envoyer des notifications SMS.
 * Même pattern que send-notification.ts (fire-and-forget, ne throw pas).
 */

import { sendSms } from "./telnyx";
import {
  orderConfirmationSms,
  orderReadySms,
  reservationConfirmationSms,
  reservationReminderSms,
  reservationSameDayReminderSms,
} from "./templates";

interface OrderSmsParams {
  customerPhone: string;
  customerName: string;
  restaurantName: string;
  restaurantPhone: string; // numéro Telnyx (from)
  items: { name: string; quantity: number }[];
  totalAmount: number | null;
  orderType: string | null;
  pickupTime: string | null;
}

interface ReservationSmsParams {
  customerPhone: string;
  customerName: string;
  restaurantName: string;
  restaurantPhone: string; // numéro Telnyx (from)
  date: string;
  timeSlot: string;
  covers: number;
}

/**
 * SMS de confirmation de commande au client.
 */
export async function sendOrderConfirmationSms(params: OrderSmsParams): Promise<void> {
  const text = orderConfirmationSms({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
    items: params.items,
    totalAmount: params.totalAmount,
    orderType: params.orderType,
    pickupTime: params.pickupTime,
  });

  await sendSms({
    to: params.customerPhone,
    from: params.restaurantPhone,
    text,
  });
}

/**
 * SMS "commande prête" au client.
 */
export async function sendOrderReadySms(params: {
  customerPhone: string;
  customerName: string;
  restaurantName: string;
  restaurantPhone: string;
}): Promise<void> {
  const text = orderReadySms({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
  });

  await sendSms({
    to: params.customerPhone,
    from: params.restaurantPhone,
    text,
  });
}

/**
 * SMS de confirmation de réservation au client.
 */
export async function sendReservationConfirmationSms(params: ReservationSmsParams): Promise<void> {
  const text = reservationConfirmationSms({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
    date: params.date,
    timeSlot: params.timeSlot,
    covers: params.covers,
  });

  await sendSms({
    to: params.customerPhone,
    from: params.restaurantPhone,
    text,
  });
}

/**
 * SMS de rappel J-1 pour une réservation.
 */
export async function sendReservationReminderSms(params: ReservationSmsParams): Promise<void> {
  const text = reservationReminderSms({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
    timeSlot: params.timeSlot,
    covers: params.covers,
  });

  await sendSms({
    to: params.customerPhone,
    from: params.restaurantPhone,
    text,
  });
}

/**
 * SMS de rappel H-2 (jour même) pour une réservation.
 */
export async function sendReservationSameDayReminderSms(params: {
  customerPhone: string;
  customerName: string;
  restaurantName: string;
  restaurantPhone: string;
  timeSlot: string;
}): Promise<void> {
  const text = reservationSameDayReminderSms({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
    timeSlot: params.timeSlot,
  });

  await sendSms({
    to: params.customerPhone,
    from: params.restaurantPhone,
    text,
  });
}
