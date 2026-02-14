-- ============================================================
-- FIX: Add TEXT overload for gavinho_can_access_project
-- 2026-02-14
--
-- Problem: Some tables have projeto_id as TEXT instead of UUID
-- (acompanhamento, projecoes_cenarios, analises_viabilidade).
-- The original function only accepts UUID, so RLS policies
-- on those tables fail with:
--   "function gavinho_can_access_project(text) does not exist"
--
-- Fix: Create a TEXT overload that casts to UUID and delegates.
--
-- Run this BEFORE 20250214_restrict_rls_policies.sql
-- (or just re-run the updated restrict_rls_policies.sql which
--  now includes this overload inline)
-- ============================================================

-- Ensure prerequisites exist
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_utilizadores_auth_role
  ON utilizadores(id, role) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_projeto
  ON projeto_equipa(utilizador_id, projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_active
  ON projeto_equipa(utilizador_id, projeto_id)
  WHERE data_saida IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_projeto
  ON obras(projeto_id) WHERE projeto_id IS NOT NULL;

-- UUID versions (primary)
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

-- TEXT overload: casts to UUID and delegates
CREATE OR REPLACE FUNCTION gavinho_can_access_project(p_projeto_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT gavinho_can_access_project(p_projeto_id::UUID);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION gavinho_can_access_obra(p_obra_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    gavinho_is_gestor_or_above()
    OR EXISTS (
      SELECT 1 FROM obras o
      JOIN projeto_equipa pe ON pe.projeto_id = o.projeto_id
      WHERE o.id = p_obra_id
        AND o.projeto_id IS NOT NULL
        AND pe.utilizador_id = auth.uid()
        AND (pe.data_saida IS NULL OR pe.data_saida >= CURRENT_DATE)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION gavinho_can_access_orcamento(p_orcamento_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    gavinho_is_gestor_or_above()
    OR EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = p_orcamento_id
        AND o.projeto_id IS NOT NULL
        AND gavinho_can_access_project(o.projeto_id)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION gavinho_can_access_po(p_po_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT
    gavinho_is_gestor_or_above()
    OR EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = p_po_id
        AND (
          (po.projeto_id IS NOT NULL AND gavinho_can_access_project(po.projeto_id))
          OR (po.obra_id IS NOT NULL AND gavinho_can_access_obra(po.obra_id))
        )
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_has_project_access(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN gavinho_can_access_project(p_projeto_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, nome, executado_em)
    VALUES ('20250214_fix_rls_functions_text_overload', '20250214_fix_rls_functions_text_overload', NOW())
    ON CONFLICT (seed_key) DO UPDATE SET executado_em = NOW();
  END IF;
END $$;
