-- Migration 004 : Infrastructure billing et usage
-- Colonnes abonnement sur restaurants + table usage_records

-- Colonnes abonnement sur restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused'));
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'voxena_orders';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2) DEFAULT 99.00;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_notes TEXT;

-- Table usage par mois
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  call_count INT DEFAULT 0,
  total_minutes DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_restaurant_month ON usage_records(restaurant_id, month);
CREATE INDEX IF NOT EXISTS idx_usage_records_month ON usage_records(month);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin voit usage" ON usage_records FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Service role gère usage" ON usage_records FOR ALL
  USING (true) WITH CHECK (true);

-- Fonction increment pour webhook (upsert atomique)
CREATE OR REPLACE FUNCTION increment_usage(
  p_restaurant_id UUID,
  p_month TEXT,
  p_minutes DECIMAL,
  p_cost DECIMAL
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_records (restaurant_id, month, call_count, total_minutes, total_cost)
  VALUES (p_restaurant_id, p_month, 1, p_minutes, p_cost)
  ON CONFLICT (restaurant_id, month)
  DO UPDATE SET
    call_count = usage_records.call_count + 1,
    total_minutes = usage_records.total_minutes + p_minutes,
    total_cost = usage_records.total_cost + p_cost,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour restos existants qui n'ont pas encore de statut
UPDATE restaurants
SET subscription_status = 'active',
    subscription_started_at = created_at,
    trial_ends_at = created_at + interval '14 days'
WHERE subscription_status IS NULL;
