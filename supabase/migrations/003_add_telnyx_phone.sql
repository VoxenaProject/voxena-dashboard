-- Numéro Telnyx dédié par restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telnyx_phone TEXT;
