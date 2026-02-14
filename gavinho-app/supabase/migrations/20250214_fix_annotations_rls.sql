-- ============================================================
-- Fix: design_review_annotations RLS policies
-- 2026-02-14
--
-- Bugs fixed:
--   1. Policies referenced non-existent `review_id` column.
--      Correct path: version_id → design_review_versions → design_reviews
--   2. Delete policy referenced `criado_por` → corrected to `autor_id`
--
-- Self-contained: includes prerequisite functions so this single
-- file can be run in Supabase SQL editor with no dependencies.
-- ============================================================

-- ── 0. Prerequisites ──
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- ── 1. Performance indexes ──
CREATE INDEX IF NOT EXISTS idx_utilizadores_auth_role
  ON utilizadores(id, role) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_projeto
  ON projeto_equipa(utilizador_id, projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_active
  ON projeto_equipa(utilizador_id, projeto_id)
  WHERE data_saida IS NULL;

-- ── 2. Helper functions (SECURITY DEFINER, STABLE) ──

CREATE OR REPLACE FUNCTION gavinho_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilizadores
    WHERE id = auth.uid()
      AND role = 'admin'
      AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION gavinho_is_gestor_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilizadores
    WHERE id = auth.uid()
      AND role IN ('admin', 'gestor')
      AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION gavinho_can_access_project(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    gavinho_is_gestor_or_above()
    OR EXISTS (
      SELECT 1 FROM projeto_equipa
      WHERE projeto_id = p_projeto_id
        AND utilizador_id = auth.uid()
        AND (data_saida IS NULL OR data_saida >= CURRENT_DATE)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- TEXT overload for tables where projeto_id is TEXT
CREATE OR REPLACE FUNCTION gavinho_can_access_project(p_projeto_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN gavinho_can_access_project(p_projeto_id::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── 3. Fix design_review_annotations RLS policies ──

-- Enable RLS (idempotent)
ALTER TABLE design_review_annotations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_select" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_insert" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_update" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_delete" ON design_review_annotations;

-- Recreate with correct join: annotations → versions → reviews → projeto_id
CREATE POLICY "design_review_annotations_select" ON design_review_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_insert" ON design_review_annotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_update" ON design_review_annotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_delete" ON design_review_annotations FOR DELETE
  USING (
    auth.uid() = autor_id  -- author can delete own
    OR gavinho_is_gestor_or_above()
  );
