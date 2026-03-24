-- ═══════════════════════════════════════════
-- VOXENA DASHBOARD — Schema initial
-- ═══════════════════════════════════════════

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PROFILES (utilisateurs liés à auth.users) ──
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner')),
  restaurant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RESTAURANTS ──
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  whatsapp_phone TEXT,
  whatsapp_phone_id TEXT,
  agent_id TEXT,
  agent_status TEXT DEFAULT 'active' CHECK (agent_status IN ('active', 'paused', 'error')),
  owner_name TEXT,
  logo_url TEXT,
  opening_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK profile → restaurant (ajouté après création des deux tables)
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_restaurant
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

-- ── MENUS (catégories) ──
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── MENU ITEMS (plats/boissons) ──
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  supplements JSONB DEFAULT '[]'::jsonb,
  allergens TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ORDERS ──
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  conversation_id TEXT UNIQUE,
  status TEXT DEFAULT 'nouvelle' CHECK (status IN ('nouvelle', 'en_preparation', 'prete', 'livree', 'recuperee', 'annulee')),
  order_type TEXT CHECK (order_type IN ('emporter', 'livraison')),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  special_instructions TEXT,
  pickup_time TEXT,
  delivery_address TEXT,
  delivery_time_estimate TEXT,
  total_amount DECIMAL(10,2),
  transcript JSONB,
  audio_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── ORDER EVENTS (timeline) ──
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── AGENT LOGS (debug super admin) ──
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  conversation_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── TRIGGERS ──

-- Auto-update updated_at sur orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── INDEXES ──
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_agent_logs_restaurant ON agent_logs(restaurant_id);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX idx_profiles_restaurant ON profiles(restaurant_id);

-- ── REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ── ROW LEVEL SECURITY ──

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Fonction helper : récupérer le rôle du user connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fonction helper : récupérer le restaurant_id du user connecté
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES : chaque user voit son profil, admin voit tout
CREATE POLICY "Voir son profil" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

-- RESTAURANTS : owner voit son resto, admin voit tout
CREATE POLICY "Voir restaurants" ON restaurants FOR SELECT
  USING (id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Admin gère restaurants" ON restaurants FOR ALL
  USING (get_user_role() = 'admin');

-- MENUS : owner voit son resto, admin voit tout
CREATE POLICY "Voir menus" ON menus FOR SELECT
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Gérer menus" ON menus FOR ALL
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');

-- MENU ITEMS : idem
CREATE POLICY "Voir menu items" ON menu_items FOR SELECT
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Gérer menu items" ON menu_items FOR ALL
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');

-- ORDERS : owner voit ses commandes, admin voit tout
CREATE POLICY "Voir commandes" ON orders FOR SELECT
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
CREATE POLICY "Owner met à jour statut" ON orders FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin');
-- Les inserts sont faits via service_role (webhooks/server tools)

-- ORDER EVENTS : suit les mêmes règles que orders
CREATE POLICY "Voir events" ON order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND (orders.restaurant_id = get_user_restaurant_id() OR get_user_role() = 'admin')
    )
  );

-- AGENT LOGS : admin uniquement
CREATE POLICY "Admin voit logs" ON agent_logs FOR SELECT
  USING (get_user_role() = 'admin');
CREATE POLICY "Admin gère logs" ON agent_logs FOR ALL
  USING (get_user_role() = 'admin');
