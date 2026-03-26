-- Zones sur les tables
ALTER TABLE floor_tables ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'salle';

-- Waitlist sur les réservations
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('en_attente', 'confirmee', 'assise', 'terminee', 'annulee', 'no_show', 'liste_attente'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS waitlist_position INT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS estimated_wait_minutes INT;
