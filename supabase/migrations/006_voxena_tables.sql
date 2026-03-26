-- ═══════════════════════════════════════════
-- MIGRATION 006 — Voxena Tables (multi-produit)
-- Tables de sol, réservations, combinaisons, clients, infos pratiques
-- ═══════════════════════════════════════════

-- ── FLOOR TABLES (plan de salle) ──
CREATE TABLE floor_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  shape TEXT NOT NULL DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'round', 'square')),
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 100,
  height FLOAT NOT NULL DEFAULT 60,
  combinable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_floor_tables_restaurant ON floor_tables(restaurant_id);
CREATE INDEX idx_floor_tables_active ON floor_tables(restaurant_id, is_active);

-- ── RESERVATIONS ──
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES floor_tables(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  duration INT NOT NULL DEFAULT 90, -- durée en minutes
  covers INT NOT NULL DEFAULT 2,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'confirmee', 'assise', 'terminee', 'annulee', 'no_show')),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('phone', 'web', 'manual')),
  conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reservations_restaurant_date ON reservations(restaurant_id, date);
CREATE INDEX idx_reservations_table_date ON reservations(table_id, date);
CREATE INDEX idx_reservations_status ON reservations(restaurant_id, status);
CREATE INDEX idx_reservations_customer_phone ON reservations(customer_phone);

-- Trigger updated_at sur réservations (réutilise la fonction existante)
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TABLE COMBINATIONS (tables combinées pour grands groupes) ──
CREATE TABLE table_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_ids UUID[] NOT NULL,
  total_capacity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_table_combinations_reservation ON table_combinations(reservation_id);

-- ── CUSTOMERS (fichier client) ──
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  visit_count INT DEFAULT 1,
  last_visit_at TIMESTAMPTZ DEFAULT now(),
  total_spent DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

CREATE INDEX idx_customers_restaurant_phone ON customers(restaurant_id, phone);

-- ── PRACTICAL INFO (infos pratiques sur le restaurant) ──
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS practical_info JSONB;

-- ── SUBSCRIPTION PLAN — Migration vers les nouveaux plans multi-produit ──
-- Mettre à jour le défaut et les valeurs existantes
UPDATE restaurants SET subscription_plan = 'orders' WHERE subscription_plan = 'voxena_orders';
ALTER TABLE restaurants ALTER COLUMN subscription_plan SET DEFAULT 'orders';

-- ── FONCTION RPC : Upsert client (utilisé par /api/orders/create) ──
CREATE OR REPLACE FUNCTION upsert_customer(
  p_restaurant_id UUID,
  p_phone TEXT,
  p_name TEXT DEFAULT NULL,
  p_total DECIMAL DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO customers (restaurant_id, phone, name, visit_count, last_visit_at, total_spent)
  VALUES (p_restaurant_id, p_phone, p_name, 1, now(), p_total)
  ON CONFLICT (restaurant_id, phone)
  DO UPDATE SET
    visit_count = customers.visit_count + 1,
    last_visit_at = now(),
    total_spent = customers.total_spent + p_total,
    name = COALESCE(EXCLUDED.name, customers.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

-- floor_tables : owner voit son restaurant, admin voit tout
ALTER TABLE floor_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner voit ses tables" ON floor_tables FOR SELECT
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Owner gère ses tables" ON floor_tables FOR ALL
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');

-- reservations : owner voit son restaurant, admin voit tout, service role peut insérer
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner voit ses réservations" ON reservations FOR SELECT
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Owner gère ses réservations" ON reservations FOR ALL
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');

-- table_combinations : suit les mêmes règles que reservations
ALTER TABLE table_combinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir combinaisons via réservation" ON table_combinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = table_combinations.reservation_id
      AND (reservations.restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin')
    )
  );
CREATE POLICY "Gérer combinaisons via réservation" ON table_combinations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = table_combinations.reservation_id
      AND (reservations.restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin')
    )
  );

-- customers : owner voit ses clients, admin voit tout
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner voit ses clients" ON customers FOR ALL
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');

-- ═══════════════════════════════════════════
-- REALTIME — Réservations en temps réel
-- ═══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
