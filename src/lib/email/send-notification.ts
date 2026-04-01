import { Resend } from "resend";

// Initialisation Resend — ne crashe pas si la clé est manquante
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "Voxena <noreply@getvoxena.com>";

// Couleurs de la marque Voxena
const BRAND = {
  violet: "#4237C4",
  navy: "#0E1333",
  navyDeep: "#080B1F",
  blue: "#74a3ff",
  green: "#1a9a5a",
  greenSoft: "#34d399",
  bg: "#FAFBFE",
  white: "#FFFFFF",
  gray: "#6B7280",
  grayLight: "#F3F4F6",
};

// ─── Types internes ───────────────────────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  modifications?: string[];
}

interface OrderNotificationParams {
  order: {
    customer_name: string | null;
    items: OrderItem[];
    total_amount: number | null;
    order_type: "emporter" | "livraison" | null;
    delivery_address: string | null;
    special_instructions: string | null;
    pickup_time: string | null;
    delivery_time_estimate: string | null;
  };
  restaurant: {
    name: string;
    owner_email: string;
  };
}

interface InvitationEmailParams {
  email: string;
  fullName: string;
  restaurantName: string;
  inviteUrl: string;
  tempPassword: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Wrapper d'email : header + contenu + footer Voxena */
function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Voxena</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(14,19,51,0.08);">
          ${content}
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:${BRAND.grayLight};text-align:center;">
              <p style="margin:0;font-size:13px;color:${BRAND.gray};line-height:1.5;">
                <strong style="color:${BRAND.violet};">Voxena</strong> — L'agent vocal de votre restaurant
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${BRAND.gray};">
                &copy; ${new Date().getFullYear()} Voxena. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Fonction 1 : Notification de nouvelle commande ───────────

/**
 * Envoie un email de notification au restaurateur quand une nouvelle commande arrive.
 * Ne throw jamais — log les erreurs en console.
 */
export async function sendOrderNotification({
  order,
  restaurant,
}: OrderNotificationParams): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY manquante — notification email ignorée");
    return;
  }

  try {
    const customerName = order.customer_name || "Client inconnu";
    const isLivraison = order.order_type === "livraison";
    const orderTypeLabel = isLivraison ? "Livraison" : "À emporter";
    const orderTypeIcon = isLivraison ? "🚗" : "🛍️";
    const totalFormatted = order.total_amount != null
      ? `${order.total_amount.toFixed(2)} €`
      : "Non calculé";

    // Construire la liste d'items
    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid ${BRAND.grayLight};font-size:14px;color:${BRAND.navy};">
              ${item.name}
              ${item.modifications?.length ? `<br/><span style="font-size:12px;color:${BRAND.gray};">${item.modifications.join(", ")}</span>` : ""}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid ${BRAND.grayLight};font-size:14px;color:${BRAND.navy};text-align:center;width:50px;">
              x${item.quantity}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid ${BRAND.grayLight};font-size:14px;color:${BRAND.navy};text-align:right;width:80px;">
              ${item.price != null ? `${(item.price * item.quantity).toFixed(2)} €` : "—"}
            </td>
          </tr>`
      )
      .join("");

    // Section adresse de livraison (si livraison)
    const deliverySection = isLivraison && order.delivery_address
      ? `<tr>
          <td style="padding:0 40px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.grayLight};border-radius:8px;padding:16px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">📍 Adresse de livraison</p>
                  <p style="margin:0;font-size:14px;color:${BRAND.navy};">${order.delivery_address}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

    // Section instructions spéciales
    const instructionsSection = order.special_instructions
      ? `<tr>
          <td style="padding:0 40px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF7ED;border-radius:8px;border-left:4px solid #F59E0B;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;">📝 Instructions spéciales</p>
                  <p style="margin:0;font-size:14px;color:${BRAND.navy};">${order.special_instructions}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

    // Section heure estimée
    const timeEstimate = order.pickup_time || order.delivery_time_estimate;
    const timeSection = timeEstimate
      ? `<tr>
          <td style="padding:0 40px 24px;">
            <p style="margin:0;font-size:13px;color:${BRAND.gray};">
              🕐 ${isLivraison ? "Heure de livraison estimée" : "Heure de retrait"} : <strong style="color:${BRAND.navy};">${timeEstimate}</strong>
            </p>
          </td>
        </tr>`
      : "";

    const emailHtml = wrapEmail(`
      <!-- Header avec nom du restaurant -->
      <tr>
        <td style="padding:32px 40px 24px;background:linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.violet} 100%);">
          <p style="margin:0 0 8px;font-size:14px;color:${BRAND.blue};font-weight:500;">${restaurant.name}</p>
          <h1 style="margin:0;font-size:24px;color:${BRAND.white};font-weight:700;font-family:'Space Grotesk','Inter',sans-serif;">
            Nouvelle commande
          </h1>
        </td>
      </tr>

      <!-- Type de commande + client -->
      <tr>
        <td style="padding:24px 40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;padding:6px 14px;background-color:${isLivraison ? "#DBEAFE" : "#F0FDF4"};color:${isLivraison ? "#1E40AF" : "#166534"};border-radius:20px;font-size:13px;font-weight:600;">
                  ${orderTypeIcon} ${orderTypeLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <p style="margin:0;font-size:13px;color:${BRAND.gray};">Client</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:600;color:${BRAND.navy};">${customerName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Détails des articles -->
      <tr>
        <td style="padding:8px 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 8px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">Article</td>
              <td style="padding:0 0 8px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;text-align:center;width:50px;">Qté</td>
              <td style="padding:0 0 8px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;text-align:right;width:80px;">Prix</td>
            </tr>
            ${itemsHtml}
            <!-- Total -->
            <tr>
              <td colspan="2" style="padding:12px 0 0;font-size:16px;font-weight:700;color:${BRAND.navy};">Total</td>
              <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${BRAND.violet};text-align:right;">${totalFormatted}</td>
            </tr>
          </table>
        </td>
      </tr>

      ${deliverySection}
      ${instructionsSection}
      ${timeSection}

      <!-- CTA : Voir la commande -->
      <tr>
        <td style="padding:8px 40px 32px;" align="center">
          <a href="https://app.getvoxena.com/orders" style="display:inline-block;padding:14px 32px;background-color:${BRAND.violet};color:${BRAND.white};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
            Voir la commande &rarr;
          </a>
        </td>
      </tr>
    `);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: restaurant.owner_email,
      subject: `🔔 Nouvelle commande — ${customerName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("[email] Erreur envoi notification commande:", error);
    } else {
      // Notification commande envoyée
    }
  } catch (err) {
    console.error("[email] Erreur inattendue envoi notification:", err);
  }
}

// ─── Fonction 2 : Email d'invitation restaurateur ─────────────

/**
 * Envoie un email d'invitation avec les identifiants temporaires au nouveau restaurateur.
 * Ne throw jamais — log les erreurs en console.
 */
export async function sendInvitationEmail({
  email,
  fullName,
  restaurantName,
  inviteUrl,
  tempPassword,
}: InvitationEmailParams): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY manquante — invitation email ignorée");
    return;
  }

  try {
    const emailHtml = wrapEmail(`
      <!-- Header -->
      <tr>
        <td style="padding:32px 40px 24px;background:linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.violet} 100%);">
          <h1 style="margin:0;font-size:24px;color:${BRAND.white};font-weight:700;font-family:'Space Grotesk','Inter',sans-serif;">
            Bienvenue chez Voxena
          </h1>
        </td>
      </tr>

      <!-- Corps du message -->
      <tr>
        <td style="padding:32px 40px 16px;">
          <p style="margin:0 0 16px;font-size:16px;color:${BRAND.navy};line-height:1.6;">
            Bonjour <strong>${fullName}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:${BRAND.navy};line-height:1.6;">
            Votre restaurant <strong style="color:${BRAND.violet};">${restaurantName}</strong> est maintenant connecté à Voxena !
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:${BRAND.navy};line-height:1.6;">
            Connectez-vous pour configurer votre menu et commencer à recevoir des commandes.
          </p>
        </td>
      </tr>

      <!-- Bouton CTA -->
      <tr>
        <td style="padding:0 40px 24px;" align="center">
          <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background-color:${BRAND.violet};color:${BRAND.white};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
            Accéder à mon dashboard &rarr;
          </a>
        </td>
      </tr>

      <!-- Identifiants temporaires -->
      <tr>
        <td style="padding:0 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.grayLight};border-radius:8px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">
                  🔑 Vos identifiants temporaires
                </p>
                <p style="margin:0 0 8px;font-size:14px;color:${BRAND.navy};">
                  <strong>Email :</strong> <span style="font-family:'JetBrains Mono',monospace;color:${BRAND.violet};">${email}</span>
                </p>
                <p style="margin:0;font-size:14px;color:${BRAND.navy};">
                  <strong>Mot de passe :</strong> <span style="font-family:'JetBrains Mono',monospace;color:${BRAND.violet};">${tempPassword}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Note changement de mot de passe -->
      <tr>
        <td style="padding:0 40px 32px;">
          <p style="margin:0;font-size:13px;color:${BRAND.gray};line-height:1.5;">
            💡 Vous pourrez changer votre mot de passe dans les paramètres de votre dashboard.
          </p>
        </td>
      </tr>
    `);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Bienvenue chez Voxena — Votre dashboard est prêt",
      html: emailHtml,
    });

    if (error) {
      console.error("[email] Erreur envoi invitation:", error);
    } else {
      // Invitation envoyée
    }
  } catch (err) {
    console.error("[email] Erreur inattendue envoi invitation:", err);
  }
}

// ─── Fonction 3 : Confirmation de réservation ───────────────

interface ReservationConfirmationParams {
  reservation: {
    customer_name: string;
    customer_email: string | null;
    date: string;
    time_slot: string;
    covers: number;
    notes: string | null;
  };
  restaurant: {
    name: string;
    address: string | null;
    phone: string | null;
  };
}

/** Formate une date YYYY-MM-DD en français (ex: "Vendredi 28 mars 2026") */
function formatDateFrench(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Envoie un email de confirmation de réservation au client.
 * Ne throw jamais — log les erreurs en console.
 * Si le client n'a pas d'email, on skip silencieusement.
 */
export async function sendReservationConfirmation({
  reservation,
  restaurant,
}: ReservationConfirmationParams): Promise<void> {
  // Pas d'email client → on skip
  if (!reservation.customer_email) {
    // Pas d'email client — confirmation ignorée
    return;
  }

  if (!resend) {
    console.warn("[email] RESEND_API_KEY manquante — confirmation réservation ignorée");
    return;
  }

  try {
    const formattedDate = formatDateFrench(reservation.date);

    const emailHtml = wrapEmail(`
      <!-- Header avec nom du restaurant -->
      <tr>
        <td style="padding:32px 40px 24px;background:linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.violet} 100%);">
          <p style="margin:0 0 8px;font-size:14px;color:${BRAND.blue};font-weight:500;">${restaurant.name}</p>
          <h1 style="margin:0;font-size:24px;color:${BRAND.white};font-weight:700;font-family:'Space Grotesk','Inter',sans-serif;">
            Réservation confirmée
          </h1>
        </td>
      </tr>

      <!-- Message de bienvenue -->
      <tr>
        <td style="padding:32px 40px 16px;">
          <p style="margin:0 0 8px;font-size:16px;color:${BRAND.navy};line-height:1.6;">
            Bonjour <strong>${reservation.customer_name}</strong>,
          </p>
          <p style="margin:0;font-size:15px;color:${BRAND.navy};line-height:1.6;">
            Votre réservation est confirmée !
          </p>
        </td>
      </tr>

      <!-- Carte de détails -->
      <tr>
        <td style="padding:8px 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.grayLight};border-radius:12px;border:1px solid #E5E7EB;">
            <tr>
              <td style="padding:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <!-- Date -->
                  <tr>
                    <td style="padding:0 0 16px;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">📅 Date</p>
                      <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.navy};">${formattedDate}</p>
                    </td>
                  </tr>
                  <!-- Heure -->
                  <tr>
                    <td style="padding:0 0 16px;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">🕐 Heure</p>
                      <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.navy};">${reservation.time_slot}</p>
                    </td>
                  </tr>
                  <!-- Couverts -->
                  <tr>
                    <td style="padding:0;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND.gray};text-transform:uppercase;letter-spacing:0.5px;">👥 Nombre de couverts</p>
                      <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.navy};">${reservation.covers} personne${reservation.covers > 1 ? "s" : ""}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${reservation.notes ? `
      <!-- Notes -->
      <tr>
        <td style="padding:0 40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF7ED;border-radius:8px;border-left:4px solid #F59E0B;">
            <tr>
              <td style="padding:12px 16px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;">📝 Notes</p>
                <p style="margin:0;font-size:14px;color:${BRAND.navy};">${reservation.notes}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ` : ""}

      <!-- Informations restaurant -->
      <tr>
        <td style="padding:8px 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${restaurant.address ? `
            <tr>
              <td style="padding:0 0 8px;">
                <p style="margin:0;font-size:14px;color:${BRAND.gray};">
                  📍 <strong>${restaurant.address}</strong>
                </p>
              </td>
            </tr>
            ` : ""}
            ${restaurant.phone ? `
            <tr>
              <td style="padding:0 0 8px;">
                <p style="margin:0;font-size:14px;color:${BRAND.gray};">
                  📞 <strong>${restaurant.phone}</strong>
                </p>
              </td>
            </tr>
            ` : ""}
          </table>
        </td>
      </tr>

      <!-- Message modification -->
      ${restaurant.phone ? `
      <tr>
        <td style="padding:0 40px 32px;">
          <p style="margin:0;font-size:13px;color:${BRAND.gray};line-height:1.5;">
            Pour modifier ou annuler votre réservation, appelez-nous au <strong style="color:${BRAND.navy};">${restaurant.phone}</strong>.
          </p>
        </td>
      </tr>
      ` : ""}
    `);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: reservation.customer_email,
      subject: `Réservation confirmée — ${restaurant.name}`,
      html: emailHtml,
    });

    if (error) {
      console.error("[email] Erreur envoi confirmation réservation:", error);
    } else {
      // Confirmation réservation envoyée
    }
  } catch (err) {
    console.error("[email] Erreur inattendue envoi confirmation réservation:", err);
  }
}
