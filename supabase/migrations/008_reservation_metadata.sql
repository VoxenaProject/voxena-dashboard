ALTER TABLE reservations ADD COLUMN IF NOT EXISTS preferences TEXT[] DEFAULT '{}';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS occasion TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS turnover_buffer INT DEFAULT 15;

-- Ajouter le buffer par défaut dans les settings du restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS default_reservation_duration INT DEFAULT 90;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS turnover_buffer INT DEFAULT 15;
