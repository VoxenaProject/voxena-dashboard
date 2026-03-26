-- ═══════════════════════════════════════════
-- SEED : Chez Voxena — Restaurant démo complet
-- ID : 910446ef-df54-4912-8e29-cee23d6d27a0
-- ═══════════════════════════════════════════

-- Variables
DO $$
DECLARE
  rid UUID := '910446ef-df54-4912-8e29-cee23d6d27a0';
  -- IDs menus
  mid_entrees UUID;
  mid_plats UUID;
  mid_burgers UUID;
  mid_pates UUID;
  mid_desserts UUID;
  mid_boissons UUID;
  mid_vins UUID;
  mid_offres UUID;
  -- IDs tables
  tid UUID;
BEGIN

-- ═══════════════════════════════════════════
-- 1. METTRE À JOUR LE RESTAURANT
-- ═══════════════════════════════════════════
UPDATE restaurants SET
  name = 'Chez Voxena',
  phone = '+32 2 511 78 90',
  address = 'Place du Grand Sablon 15, 1000 Bruxelles',
  owner_name = 'Dejvi Prifti',
  whatsapp_phone = '+32 470 99 88 77',
  agent_status = 'active',
  subscription_plan = 'pro',
  subscription_status = 'active',
  subscription_amount = 149.00,
  subscription_started_at = NOW() - INTERVAL '30 days',
  opening_hours = '{
    "lundi": { "open": false },
    "mardi": { "open": true, "services": [{"from": "11:30", "to": "14:30"}, {"from": "18:00", "to": "22:30"}] },
    "mercredi": { "open": true, "services": [{"from": "11:30", "to": "14:30"}, {"from": "18:00", "to": "22:30"}] },
    "jeudi": { "open": true, "services": [{"from": "11:30", "to": "14:30"}, {"from": "18:00", "to": "22:30"}] },
    "vendredi": { "open": true, "services": [{"from": "11:30", "to": "14:30"}, {"from": "18:00", "to": "23:00"}] },
    "samedi": { "open": true, "services": [{"from": "12:00", "to": "15:00"}, {"from": "18:30", "to": "23:00"}] },
    "dimanche": { "open": true, "services": [{"from": "12:00", "to": "15:00"}] }
  }'::jsonb,
  practical_info = '{
    "parking": { "type": "Parking public à proximité", "details": "Parking du Sablon à 50m, 2€/h" },
    "terrasse": { "available": true, "capacity": 24 },
    "accessibility": { "pmr": true, "notes": "Accès de plain-pied, toilettes PMR" },
    "animals": { "policy": "En terrasse uniquement" },
    "high_chairs": { "available": true, "count": 3 },
    "payments": ["CB", "Espèces", "Bancontact", "Payconiq"],
    "wifi": { "available": true, "code": "VOXENA2026" },
    "private_events": { "available": true, "capacity": 16, "description": "Salle privée au fond, idéale pour anniversaires et dîners d affaires" },
    "dress_code": "Smart casual"
  }'::jsonb,
  default_reservation_duration = 90,
  turnover_buffer = 15
WHERE id = rid;

-- ═══════════════════════════════════════════
-- 2. NETTOYER LES ANCIENNES DONNÉES DEMO
-- ═══════════════════════════════════════════
DELETE FROM reservations WHERE restaurant_id = rid;
DELETE FROM floor_tables WHERE restaurant_id = rid;
DELETE FROM menu_items WHERE restaurant_id = rid;
DELETE FROM menus WHERE restaurant_id = rid;
DELETE FROM orders WHERE restaurant_id = rid;

-- ═══════════════════════════════════════════
-- 3. MENU COMPLET — Brasserie belge moderne
-- ═══════════════════════════════════════════

INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Entrées', 0, true) RETURNING id INTO mid_entrees;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Plats principaux', 1, true) RETURNING id INTO mid_plats;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Burgers', 2, true) RETURNING id INTO mid_burgers;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Pâtes', 3, true) RETURNING id INTO mid_pates;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Desserts', 4, true) RETURNING id INTO mid_desserts;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Boissons', 5, true) RETURNING id INTO mid_boissons;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Carte des vins', 6, true) RETURNING id INTO mid_vins;
INSERT INTO menus (restaurant_id, name, sort_order, is_active) VALUES (rid, 'Offres du moment', 7, true) RETURNING id INTO mid_offres;

-- Entrées
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_entrees, rid, 'Croquettes aux crevettes grises', 14.50, '2 croquettes croustillantes, crevettes grises de la Mer du Nord, persil frit', ARRAY['gluten','crustaces','oeufs','lait'], true, 0),
(mid_entrees, rid, 'Soupe à l''oignon gratinée', 9.50, 'Oignon caramélisé, croûton, gruyère fondu', ARRAY['gluten','lait'], true, 1),
(mid_entrees, rid, 'Tartare de saumon', 15.00, 'Saumon frais, avocat, citron vert, sésame, wasabi léger', ARRAY['poisson','sesame'], true, 2),
(mid_entrees, rid, 'Salade de chèvre chaud', 12.50, 'Chèvre pané, miel, noix, mesclun, vinaigrette balsamique', ARRAY['gluten','lait','fruits_a_coque'], true, 3),
(mid_entrees, rid, 'Carpaccio de bœuf', 14.00, 'Bœuf tranché finement, roquette, parmesan, câpres, huile de truffe', ARRAY['lait'], true, 4),
(mid_entrees, rid, 'Planche apéro à partager', 18.00, 'Charcuterie artisanale, fromages belges, olives, pain grillé', ARRAY['gluten','lait'], true, 5);

-- Plats principaux
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_plats, rid, 'Carbonnade flamande', 19.50, 'Bœuf mijoté à la bière brune, pain d''épices, frites maison', ARRAY['gluten'], true, 0),
(mid_plats, rid, 'Vol-au-vent maison', 18.50, 'Poulet, boulettes, champignons, sauce crème, frites', ARRAY['gluten','lait','oeufs'], true, 1),
(mid_plats, rid, 'Steak-frites', 24.00, 'Entrecôte 250g, sauce au poivre ou béarnaise, frites maison', ARRAY['lait','oeufs'], true, 2),
(mid_plats, rid, 'Moules-frites', 22.00, 'Moules de Zélande, marinière ou crème, frites maison (saison sept-avril)', ARRAY['mollusques','lait'], true, 3),
(mid_plats, rid, 'Filet de bar grillé', 23.00, 'Bar sauvage, légumes de saison, beurre blanc citronné', ARRAY['poisson','lait'], true, 4),
(mid_plats, rid, 'Waterzooi de poulet', 19.00, 'Poulet fermier, légumes racines, crème, pommes de terre', ARRAY['lait','celeri'], true, 5),
(mid_plats, rid, 'Risotto aux champignons', 17.50, 'Riz carnaroli, cèpes, shiitake, parmesan 24 mois, truffe', ARRAY['lait'], true, 6),
(mid_plats, rid, 'Tartare de bœuf', 21.00, 'Bœuf haché au couteau, câpres, oignon, condiments, frites', ARRAY['oeufs','moutarde'], true, 7);

-- Burgers
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_burgers, rid, 'Classic Burger', 16.50, 'Bœuf 180g, cheddar, salade, tomate, oignon, sauce maison, frites', ARRAY['gluten','lait','oeufs','sesame'], true, 0),
(mid_burgers, rid, 'Burger Truffe', 19.50, 'Bœuf 180g, brie fondant, roquette, mayo truffe, frites', ARRAY['gluten','lait','oeufs'], true, 1),
(mid_burgers, rid, 'Chicken Burger', 15.50, 'Poulet pané croustillant, coleslaw, pickles, sauce ranch, frites', ARRAY['gluten','lait','oeufs'], true, 2),
(mid_burgers, rid, 'Veggie Burger', 15.00, 'Galette de lentilles et légumes, guacamole, oignons confits, frites', ARRAY['gluten'], true, 3);

-- Pâtes
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_pates, rid, 'Spaghetti bolognaise', 14.50, 'Sauce tomate, bœuf haché mijoté, parmesan', ARRAY['gluten','lait'], true, 0),
(mid_pates, rid, 'Penne arrabiata', 13.00, 'Sauce tomate pimentée, ail, basilic frais', ARRAY['gluten'], true, 1),
(mid_pates, rid, 'Tagliatelles carbonara', 15.50, 'Guanciale, pecorino romano, œuf, poivre noir', ARRAY['gluten','lait','oeufs'], true, 2),
(mid_pates, rid, 'Linguine aux fruits de mer', 19.00, 'Crevettes, moules, calamars, ail, vin blanc, persil', ARRAY['gluten','crustaces','mollusques'], true, 3);

-- Desserts
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_desserts, rid, 'Dame blanche', 9.50, 'Glace vanille, chocolat chaud, chantilly', ARRAY['lait','oeufs'], true, 0),
(mid_desserts, rid, 'Crème brûlée', 8.50, 'Vanille de Madagascar, caramel craquant', ARRAY['lait','oeufs'], true, 1),
(mid_desserts, rid, 'Moelleux au chocolat', 10.00, 'Cœur coulant, glace vanille, coulis de framboises', ARRAY['gluten','lait','oeufs'], true, 2),
(mid_desserts, rid, 'Gaufre de Bruxelles', 8.00, 'Gaufre légère, sucre glace, chantilly, fruits rouges', ARRAY['gluten','lait','oeufs'], true, 3),
(mid_desserts, rid, 'Tiramisu', 9.00, 'Mascarpone, café, biscuits imbibés, cacao amer', ARRAY['gluten','lait','oeufs'], true, 4),
(mid_desserts, rid, 'Assiette de fromages belges', 12.00, 'Herve, Chimay, Passendale, confiture de figues, pain aux noix', ARRAY['lait','gluten','fruits_a_coque'], true, 5);

-- Boissons
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_boissons, rid, 'Coca-Cola', 3.50, '33cl', ARRAY[]::TEXT[], true, 0),
(mid_boissons, rid, 'Coca-Cola Zero', 3.50, '33cl', ARRAY[]::TEXT[], true, 1),
(mid_boissons, rid, 'Fanta Orange', 3.50, '33cl', ARRAY[]::TEXT[], true, 2),
(mid_boissons, rid, 'Spa Reine', 3.00, 'Eau plate 50cl', ARRAY[]::TEXT[], true, 3),
(mid_boissons, rid, 'Spa Barisart', 3.00, 'Eau pétillante 50cl', ARRAY[]::TEXT[], true, 4),
(mid_boissons, rid, 'Jus d''orange pressé', 5.00, 'Oranges fraîches pressées à la commande', ARRAY[]::TEXT[], true, 5),
(mid_boissons, rid, 'Limonade maison', 5.50, 'Citron, menthe fraîche, miel, eau pétillante', ARRAY[]::TEXT[], true, 6),
(mid_boissons, rid, 'Café espresso', 2.80, 'Arabica torréfié à Bruxelles', ARRAY[]::TEXT[], true, 7),
(mid_boissons, rid, 'Cappuccino', 3.80, 'Espresso, mousse de lait', ARRAY['lait'], true, 8),
(mid_boissons, rid, 'Thé (sélection)', 3.50, 'Earl Grey, menthe, vert jasmin, rooibos', ARRAY[]::TEXT[], true, 9);

-- Carte des vins
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_vins, rid, 'Côtes du Rhône rouge', 6.50, 'Verre — Fruité, épicé, léger', ARRAY['sulfites'], true, 0),
(mid_vins, rid, 'Chablis blanc', 7.50, 'Verre — Minéral, frais, agrumes', ARRAY['sulfites'], true, 1),
(mid_vins, rid, 'Prosecco', 6.00, 'Verre — Bulles fines, fruité', ARRAY['sulfites'], true, 2),
(mid_vins, rid, 'Bouteille Bordeaux rouge', 28.00, 'Saint-Émilion 2021', ARRAY['sulfites'], true, 3),
(mid_vins, rid, 'Bouteille Sancerre blanc', 32.00, 'Loire 2022', ARRAY['sulfites'], true, 4);

-- Offres du moment
INSERT INTO menu_items (menu_id, restaurant_id, name, price, description, allergens, is_available, sort_order) VALUES
(mid_offres, rid, 'Menu Lunch', 18.50, 'Entrée + plat du jour — Du mardi au vendredi midi uniquement', ARRAY['gluten','lait'], true, 0),
(mid_offres, rid, 'Formule Duo', 55.00, '2 entrées + 2 plats + 2 desserts + 1 bouteille de vin — Économisez 20€', ARRAY['gluten','lait','sulfites'], true, 1),
(mid_offres, rid, 'Apéro Happy Hour', 12.00, 'Planche apéro + 2 verres de vin ou 2 bières — Mardi au jeudi 18h-19h', ARRAY['gluten','lait','sulfites'], true, 2);

-- ═══════════════════════════════════════════
-- 4. PLAN DE SALLE — 18 tables réalistes
-- ═══════════════════════════════════════════

-- SALLE INTÉRIEURE (8 tables)
INSERT INTO floor_tables (restaurant_id, name, capacity, shape, x, y, width, height, zone, combinable, is_active, sort_order) VALUES
(rid, 'Table 1', 2, 'square', 80, 80, 80, 80, 'salle', true, true, 0),
(rid, 'Table 2', 2, 'square', 200, 80, 80, 80, 'salle', true, true, 1),
(rid, 'Table 3', 4, 'rectangle', 320, 80, 140, 80, 'salle', true, true, 2),
(rid, 'Table 4', 4, 'rectangle', 80, 220, 140, 80, 'salle', true, true, 3),
(rid, 'Table 5', 4, 'rectangle', 280, 220, 140, 80, 'salle', true, true, 4),
(rid, 'Table 6', 6, 'rectangle', 80, 380, 180, 90, 'salle', true, true, 5),
(rid, 'Table 7', 6, 'rectangle', 320, 380, 180, 90, 'salle', true, true, 6),
(rid, 'Table 8', 8, 'rectangle', 180, 520, 220, 100, 'salle', true, true, 7);

-- TERRASSE (6 tables)
INSERT INTO floor_tables (restaurant_id, name, capacity, shape, x, y, width, height, zone, combinable, is_active, sort_order) VALUES
(rid, 'Terrasse 1', 2, 'round', 600, 80, 70, 70, 'terrasse', true, true, 8),
(rid, 'Terrasse 2', 2, 'round', 720, 80, 70, 70, 'terrasse', true, true, 9),
(rid, 'Terrasse 3', 4, 'round', 840, 80, 90, 90, 'terrasse', true, true, 10),
(rid, 'Terrasse 4', 4, 'square', 600, 200, 100, 100, 'terrasse', true, true, 11),
(rid, 'Terrasse 5', 4, 'square', 750, 200, 100, 100, 'terrasse', true, true, 12),
(rid, 'Terrasse 6', 6, 'rectangle', 620, 350, 160, 80, 'terrasse', true, true, 13);

-- BAR (2 places)
INSERT INTO floor_tables (restaurant_id, name, capacity, shape, x, y, width, height, zone, combinable, is_active, sort_order) VALUES
(rid, 'Bar 1', 2, 'rectangle', 550, 520, 100, 60, 'bar', false, true, 14),
(rid, 'Bar 2', 2, 'rectangle', 700, 520, 100, 60, 'bar', false, true, 15);

-- SALLE PRIVÉE (2 tables)
INSERT INTO floor_tables (restaurant_id, name, capacity, shape, x, y, width, height, zone, combinable, is_active, sort_order) VALUES
(rid, 'Privé 1', 8, 'rectangle', 900, 220, 220, 100, 'salle_privee', true, true, 16),
(rid, 'Privé 2', 8, 'rectangle', 900, 380, 220, 100, 'salle_privee', true, true, 17);

-- ═══════════════════════════════════════════
-- 5. RÉSERVATIONS FICTIVES POUR AUJOURD'HUI
-- ═══════════════════════════════════════════

-- Service midi
INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '12:00'::TIME, 2, 'Marie Dupont', '+32 475 11 22 33', 'confirmee', 'phone', NULL, NULL, ARRAY[]::TEXT[], 90;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '12:30'::TIME, 4, 'Pierre Laurent', '+32 478 44 55 66', 'confirmee', 'manual', 'Anniversaire de mariage', 'anniversaire', ARRAY['terrasse']::TEXT[], 120;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '13:00'::TIME, 6, 'Société Delhaize', '+32 2 412 21 11', 'confirmee', 'phone', 'Lunch business — présentation Q2', 'business', ARRAY['salle_privee']::TEXT[], 120;

-- Service soir
INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '19:00'::TIME, 2, 'Thomas & Emma', '+32 470 77 88 99', 'confirmee', 'phone', NULL, 'rendez_vous', ARRAY['fenetre']::TEXT[], 90;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '19:30'::TIME, 4, 'Famille Janssens', '+32 479 22 33 44', 'en_attente', 'phone', 'Chaise haute pour bébé', NULL, ARRAY['chaise_haute']::TEXT[], 90;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '20:00'::TIME, 8, 'Groupe anniversaire Sarah', '+32 473 55 66 77', 'confirmee', 'phone', 'Gâteau surprise prévu — ne pas en parler devant elle !', 'anniversaire', ARRAY['salle_privee']::TEXT[], 150;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '20:30'::TIME, 2, 'Ahmed B.', '+32 476 88 99 00', 'confirmee', 'manual', NULL, NULL, ARRAY['terrasse']::TEXT[], 90;

INSERT INTO reservations (restaurant_id, date, time_slot, covers, customer_name, customer_phone, customer_email, status, source, notes, occasion, preferences, duration)
SELECT rid, CURRENT_DATE, '21:00'::TIME, 3, 'Sophie Martin', '+32 471 33 44 55', 'sophie.martin@gmail.com', 'liste_attente', 'phone', NULL, NULL, ARRAY['terrasse']::TEXT[], 90;

-- ═══════════════════════════════════════════
-- 6. COMMANDES FICTIVES
-- ═══════════════════════════════════════════

INSERT INTO orders (restaurant_id, customer_name, customer_phone, items, total_amount, order_type, status, created_at, pickup_time) VALUES
(rid, 'Lucas V.', '+32 478 55 66 77',
 '[{"name":"Classic Burger","quantity":2,"price":16.50},{"name":"Frites maison","quantity":1,"price":4.50},{"name":"Coca-Cola","quantity":2,"price":3.50}]'::jsonb,
 44.50, 'emporter', 'nouvelle', NOW() - INTERVAL '5 minutes', '20:45');

INSERT INTO orders (restaurant_id, customer_name, customer_phone, items, total_amount, order_type, status, delivery_address, created_at, delivery_time_estimate) VALUES
(rid, 'Nadia R.', '+32 473 66 77 88',
 '[{"name":"Carbonnade flamande","quantity":1,"price":19.50},{"name":"Vol-au-vent maison","quantity":1,"price":18.50},{"name":"Dame blanche","quantity":2,"price":9.50},{"name":"Spa Barisart","quantity":2,"price":3.00}]'::jsonb,
 63.00, 'livraison', 'en_preparation', 'Rue de Namur 45, 1000 Bruxelles', NOW() - INTERVAL '20 minutes', '21:15');

INSERT INTO orders (restaurant_id, customer_name, customer_phone, items, total_amount, order_type, status, created_at, pickup_time) VALUES
(rid, 'Jean-Pierre M.', '+32 479 11 22 33',
 '[{"name":"Tartare de saumon","quantity":1,"price":15.00},{"name":"Steak-frites","quantity":1,"price":24.00},{"name":"Moelleux au chocolat","quantity":1,"price":10.00},{"name":"Côtes du Rhône rouge","quantity":2,"price":6.50}]'::jsonb,
 62.00, 'emporter', 'prete', NOW() - INTERVAL '40 minutes', '20:30');

-- ═══════════════════════════════════════════
-- 7. CLIENTS FICTIFS
-- ═══════════════════════════════════════════

INSERT INTO customers (restaurant_id, phone, name, email, visit_count, last_visit_at, total_spent, tags) VALUES
(rid, '+32 475 11 22 33', 'Marie Dupont', 'marie.dupont@gmail.com', 12, NOW(), 480.00, ARRAY['habituée','vip']),
(rid, '+32 478 44 55 66', 'Pierre Laurent', NULL, 3, NOW(), 185.00, ARRAY[]::TEXT[]),
(rid, '+32 470 77 88 99', 'Thomas', NULL, 1, NOW(), 0, ARRAY[]::TEXT[]),
(rid, '+32 479 22 33 44', 'Famille Janssens', NULL, 7, NOW(), 350.00, ARRAY['habituée','chaise_haute']),
(rid, '+32 473 55 66 77', 'Sarah', 'sarah.birthday@gmail.com', 2, NOW(), 120.00, ARRAY[]::TEXT[]),
(rid, '+32 478 55 66 77', 'Lucas V.', NULL, 5, NOW(), 210.00, ARRAY['habituée'])
ON CONFLICT (restaurant_id, phone) DO UPDATE SET
  visit_count = EXCLUDED.visit_count,
  last_visit_at = EXCLUDED.last_visit_at,
  total_spent = EXCLUDED.total_spent,
  tags = EXCLUDED.tags;

END $$;
