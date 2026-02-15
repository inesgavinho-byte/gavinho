-- =====================================================
-- FOTO COMPARADOR - add compartimento to acompanhamento photos
-- Allows grouping photos by room/division for before/after comparison
-- =====================================================

ALTER TABLE projeto_acompanhamento_fotos
  ADD COLUMN IF NOT EXISTS compartimento VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_acomp_fotos_compartimento
  ON projeto_acompanhamento_fotos(compartimento);
