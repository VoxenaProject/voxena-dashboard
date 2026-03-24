-- Ajouter le statut "en_livraison" entre "prete" et "livree"
-- Flow livraison : nouvelle → en_preparation → prete → en_livraison → livree
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('nouvelle', 'en_preparation', 'prete', 'en_livraison', 'livree', 'recuperee', 'annulee'));
