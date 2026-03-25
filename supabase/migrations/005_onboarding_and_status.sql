-- Fix statut en_livraison manquant (idempotent — déjà dans 002 mais on sécurise)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('nouvelle', 'en_preparation', 'prete', 'en_livraison', 'livree', 'recuperee', 'annulee'));

-- Champ onboarding pour les profils
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mettre les profils existants comme onboarding complété
UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL;
