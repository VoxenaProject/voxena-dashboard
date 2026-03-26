// Valide un numéro de téléphone (format international ou belge)
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return true; // Champ optionnel
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, "");
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}

// Formate un numéro pour l'affichage
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, "");
  if (cleaned.startsWith("+32")) {
    return cleaned.replace(/(\+32)(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
  }
  return phone;
}
