-- Migration 009: Ajout du slug pour les pages publiques de réservation
-- Le slug permet d'avoir des URLs publiques : /book/{slug}

ALTER TABLE restaurants ADD COLUMN slug TEXT UNIQUE;

-- Index pour les lookups par slug
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- Générer un slug par défaut pour les restaurants existants (basé sur le nom)
-- Le slug est en minuscules, sans accents, avec des tirets
UPDATE restaurants
SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(name, 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ', 'aaaeeeeiioouuycAAEEEEIIOOUUYC'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL AND name IS NOT NULL;
