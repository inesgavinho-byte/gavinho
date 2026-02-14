-- ══════════════════════════════════════════════════════════════════
-- RESTRICT RLS POLICIES BY USER ROLE / TEAM
-- 2026-02-14
--
-- Replaces permissive USING(true) policies with role-based access:
--   admin  → full access to everything
--   gestor → full access to everything (manages the firm)
--   tecnico/user → only projects they are assigned to (projeto_equipa)
--
-- Finance writes (INSERT/UPDATE/DELETE on financial tables) → gestor+
-- DELETE on most tables → admin/gestor
-- Chat → project membership via canal → projeto
--
-- IMPORTANT: All SQL is idempotent.
--   - DROP POLICY IF EXISTS before CREATE POLICY
--   - CREATE OR REPLACE FUNCTION
--   - ADD COLUMN IF NOT EXISTS
--   - CREATE INDEX IF NOT EXISTS
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────
-- 0. PREREQUISITES: Ensure role column exists
-- ──────────────────────────────────────────────────
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- ──────────────────────────────────────────────────
-- 1. PERFORMANCE INDEXES
--    These indexes are critical for RLS check performance.
--    Without them, every row-level check would do a seq scan.
-- ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_utilizadores_auth_role
  ON utilizadores(id, role) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_projeto
  ON projeto_equipa(utilizador_id, projeto_id);

CREATE INDEX IF NOT EXISTS idx_projeto_equipa_user_active
  ON projeto_equipa(utilizador_id, projeto_id)
  WHERE data_saida IS NULL;

CREATE INDEX IF NOT EXISTS idx_obras_projeto
  ON obras(projeto_id) WHERE projeto_id IS NOT NULL;

-- ──────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
--    These run as the function owner, bypassing RLS.
--    STABLE = result is cached within a single statement/transaction.
-- ──────────────────────────────────────────────────

-- 2a. Is the current user an admin?
CREATE OR REPLACE FUNCTION gavinho_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilizadores
    WHERE id = auth.uid()
      AND role = 'admin'
      AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2b. Is the current user a gestor or admin?
CREATE OR REPLACE FUNCTION gavinho_is_gestor_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilizadores
    WHERE id = auth.uid()
      AND role IN ('admin', 'gestor')
      AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2c. Can the current user access a specific project?
--     TRUE if: admin/gestor (see all) OR member of projeto_equipa
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

-- 2c-text. TEXT overload for tables where projeto_id is TEXT instead of UUID
--          (acompanhamento, projecoes_cenarios, analises_viabilidade)
--          Uses plpgsql so body is validated at call-time, not create-time.
CREATE OR REPLACE FUNCTION gavinho_can_access_project(p_projeto_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN gavinho_can_access_project(p_projeto_id::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2d. Can the current user access a specific obra?
--     TRUE if: admin/gestor OR member of the project the obra belongs to
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

-- 2e. Can the current user access a project via its orcamento?
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

-- 2f. Can the current user access a project via a purchase order?
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

-- 2g. Update the existing decisoes helper to match new conventions
CREATE OR REPLACE FUNCTION user_has_project_access(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN gavinho_can_access_project(p_projeto_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ══════════════════════════════════════════════════════════════════
-- 3. CORE TABLES: projetos, obras
--    These may not have had RLS enabled before.
-- ══════════════════════════════════════════════════════════════════

-- ── 3a. projetos ──
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projetos_select" ON projetos;
DROP POLICY IF EXISTS "projetos_insert" ON projetos;
DROP POLICY IF EXISTS "projetos_update" ON projetos;
DROP POLICY IF EXISTS "projetos_delete" ON projetos;
-- Drop any old permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projetos;
DROP POLICY IF EXISTS "Allow all select on projetos" ON projetos;
DROP POLICY IF EXISTS "Allow all insert on projetos" ON projetos;
DROP POLICY IF EXISTS "Allow all update on projetos" ON projetos;
DROP POLICY IF EXISTS "Allow all delete on projetos" ON projetos;
DROP POLICY IF EXISTS "projetos_all" ON projetos;

-- SELECT: admin/gestor see all, tecnico/user see only assigned
CREATE POLICY "projetos_select" ON projetos FOR SELECT
  USING (gavinho_can_access_project(id));

-- INSERT: only gestor+ can create new projects
CREATE POLICY "projetos_insert" ON projetos FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

-- UPDATE: only gestor+ can modify projects
CREATE POLICY "projetos_update" ON projetos FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

-- DELETE: admin only
CREATE POLICY "projetos_delete" ON projetos FOR DELETE
  USING (gavinho_is_admin());


-- ── 3b. obras ──
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obras_select" ON obras;
DROP POLICY IF EXISTS "obras_insert" ON obras;
DROP POLICY IF EXISTS "obras_update" ON obras;
DROP POLICY IF EXISTS "obras_delete" ON obras;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obras;
DROP POLICY IF EXISTS "Allow all select on obras" ON obras;
DROP POLICY IF EXISTS "Allow all insert on obras" ON obras;
DROP POLICY IF EXISTS "Allow all update on obras" ON obras;
DROP POLICY IF EXISTS "Allow all delete on obras" ON obras;
DROP POLICY IF EXISTS "obras_all" ON obras;

-- SELECT: admin/gestor see all, tecnico/user see only via project team
CREATE POLICY "obras_select" ON obras FOR SELECT
  USING (gavinho_can_access_obra(id));

-- INSERT: only gestor+ can create obras
CREATE POLICY "obras_insert" ON obras FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

-- UPDATE: only gestor+ can modify obras
CREATE POLICY "obras_update" ON obras FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

-- DELETE: admin only
CREATE POLICY "obras_delete" ON obras FOR DELETE
  USING (gavinho_is_admin());


-- ══════════════════════════════════════════════════════════════════
-- 4. PROJECT-SCOPED TABLES
--    Tables with projeto_id → restrict by project membership
-- ══════════════════════════════════════════════════════════════════

-- ── 4a. projeto_equipa ──
-- This is the core team membership table. Team can see their project's team.
-- Only gestor+ can add/remove team members.
DROP POLICY IF EXISTS "Allow all select on projeto_equipa" ON projeto_equipa;
DROP POLICY IF EXISTS "Allow all insert on projeto_equipa" ON projeto_equipa;
DROP POLICY IF EXISTS "Allow all update on projeto_equipa" ON projeto_equipa;
DROP POLICY IF EXISTS "Allow all delete on projeto_equipa" ON projeto_equipa;
DROP POLICY IF EXISTS "projeto_equipa_select" ON projeto_equipa;
DROP POLICY IF EXISTS "projeto_equipa_insert" ON projeto_equipa;
DROP POLICY IF EXISTS "projeto_equipa_update" ON projeto_equipa;
DROP POLICY IF EXISTS "projeto_equipa_delete" ON projeto_equipa;

CREATE POLICY "projeto_equipa_select" ON projeto_equipa FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_equipa_insert" ON projeto_equipa FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projeto_equipa_update" ON projeto_equipa FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projeto_equipa_delete" ON projeto_equipa FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4b. projeto_entregaveis ──
ALTER TABLE projeto_entregaveis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_entregaveis;
DROP POLICY IF EXISTS "Allow all select on projeto_entregaveis" ON projeto_entregaveis;
DROP POLICY IF EXISTS "Allow all insert on projeto_entregaveis" ON projeto_entregaveis;
DROP POLICY IF EXISTS "Allow all update on projeto_entregaveis" ON projeto_entregaveis;
DROP POLICY IF EXISTS "Allow all delete on projeto_entregaveis" ON projeto_entregaveis;
DROP POLICY IF EXISTS "projeto_entregaveis_select" ON projeto_entregaveis;
DROP POLICY IF EXISTS "projeto_entregaveis_insert" ON projeto_entregaveis;
DROP POLICY IF EXISTS "projeto_entregaveis_update" ON projeto_entregaveis;
DROP POLICY IF EXISTS "projeto_entregaveis_delete" ON projeto_entregaveis;
DROP POLICY IF EXISTS "projeto_entregaveis_all" ON projeto_entregaveis;

CREATE POLICY "projeto_entregaveis_select" ON projeto_entregaveis FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_entregaveis_insert" ON projeto_entregaveis FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_entregaveis_update" ON projeto_entregaveis FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_entregaveis_delete" ON projeto_entregaveis FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4c. projeto_pagamentos ──
DROP POLICY IF EXISTS "projeto_pagamentos_select" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_insert" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_update" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_delete" ON projeto_pagamentos;
DROP POLICY IF EXISTS "Allow all select on projeto_pagamentos" ON projeto_pagamentos;
DROP POLICY IF EXISTS "Allow all insert on projeto_pagamentos" ON projeto_pagamentos;
DROP POLICY IF EXISTS "Allow all update on projeto_pagamentos" ON projeto_pagamentos;
DROP POLICY IF EXISTS "Allow all delete on projeto_pagamentos" ON projeto_pagamentos;

CREATE POLICY "projeto_pagamentos_select" ON projeto_pagamentos FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_pagamentos_insert" ON projeto_pagamentos FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_pagamentos_update" ON projeto_pagamentos FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_pagamentos_delete" ON projeto_pagamentos FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4d. projeto_servicos ──
DROP POLICY IF EXISTS "projeto_servicos_select" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_insert" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_update" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_delete" ON projeto_servicos;
DROP POLICY IF EXISTS "Allow all select on projeto_servicos" ON projeto_servicos;
DROP POLICY IF EXISTS "Allow all insert on projeto_servicos" ON projeto_servicos;
DROP POLICY IF EXISTS "Allow all update on projeto_servicos" ON projeto_servicos;
DROP POLICY IF EXISTS "Allow all delete on projeto_servicos" ON projeto_servicos;

CREATE POLICY "projeto_servicos_select" ON projeto_servicos FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_servicos_insert" ON projeto_servicos FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_servicos_update" ON projeto_servicos FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_servicos_delete" ON projeto_servicos FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4e. projeto_duvidas ──
DROP POLICY IF EXISTS "projeto_duvidas_select" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_insert" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_update" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_delete" ON projeto_duvidas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_duvidas;
DROP POLICY IF EXISTS "Allow all select on projeto_duvidas" ON projeto_duvidas;
DROP POLICY IF EXISTS "Allow all insert on projeto_duvidas" ON projeto_duvidas;
DROP POLICY IF EXISTS "Allow all update on projeto_duvidas" ON projeto_duvidas;
DROP POLICY IF EXISTS "Allow all delete on projeto_duvidas" ON projeto_duvidas;

CREATE POLICY "projeto_duvidas_select" ON projeto_duvidas FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_duvidas_insert" ON projeto_duvidas FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_duvidas_update" ON projeto_duvidas FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_duvidas_delete" ON projeto_duvidas FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4f. projeto_intervenientes ──
DROP POLICY IF EXISTS "Allow all select on projeto_intervenientes" ON projeto_intervenientes;
DROP POLICY IF EXISTS "Allow all insert on projeto_intervenientes" ON projeto_intervenientes;
DROP POLICY IF EXISTS "Allow all update on projeto_intervenientes" ON projeto_intervenientes;
DROP POLICY IF EXISTS "Allow all delete on projeto_intervenientes" ON projeto_intervenientes;
DROP POLICY IF EXISTS "projeto_intervenientes_select" ON projeto_intervenientes;
DROP POLICY IF EXISTS "projeto_intervenientes_insert" ON projeto_intervenientes;
DROP POLICY IF EXISTS "projeto_intervenientes_update" ON projeto_intervenientes;
DROP POLICY IF EXISTS "projeto_intervenientes_delete" ON projeto_intervenientes;

CREATE POLICY "projeto_intervenientes_select" ON projeto_intervenientes FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_intervenientes_insert" ON projeto_intervenientes FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_intervenientes_update" ON projeto_intervenientes FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_intervenientes_delete" ON projeto_intervenientes FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4g. projeto_fases_contratuais ──
DROP POLICY IF EXISTS "Allow all select on projeto_fases_contratuais" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "Allow all insert on projeto_fases_contratuais" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "Allow all update on projeto_fases_contratuais" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "Allow all delete on projeto_fases_contratuais" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "projeto_fases_contratuais_select" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "projeto_fases_contratuais_insert" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "projeto_fases_contratuais_update" ON projeto_fases_contratuais;
DROP POLICY IF EXISTS "projeto_fases_contratuais_delete" ON projeto_fases_contratuais;

CREATE POLICY "projeto_fases_contratuais_select" ON projeto_fases_contratuais FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_fases_contratuais_insert" ON projeto_fases_contratuais FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_fases_contratuais_update" ON projeto_fases_contratuais FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_fases_contratuais_delete" ON projeto_fases_contratuais FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4h. projeto_renders ──
DROP POLICY IF EXISTS "Users can view renders" ON projeto_renders;
DROP POLICY IF EXISTS "Users can insert renders" ON projeto_renders;
DROP POLICY IF EXISTS "Users can update renders" ON projeto_renders;
DROP POLICY IF EXISTS "Users can delete renders" ON projeto_renders;
DROP POLICY IF EXISTS "projeto_renders_select" ON projeto_renders;
DROP POLICY IF EXISTS "projeto_renders_insert" ON projeto_renders;
DROP POLICY IF EXISTS "projeto_renders_update" ON projeto_renders;
DROP POLICY IF EXISTS "projeto_renders_delete" ON projeto_renders;

CREATE POLICY "projeto_renders_select" ON projeto_renders FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_renders_insert" ON projeto_renders FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_renders_update" ON projeto_renders FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_renders_delete" ON projeto_renders FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4i. projeto_custos ──
DROP POLICY IF EXISTS "projeto_custos_all" ON projeto_custos;
DROP POLICY IF EXISTS "projeto_custos_select" ON projeto_custos;
DROP POLICY IF EXISTS "projeto_custos_insert" ON projeto_custos;
DROP POLICY IF EXISTS "projeto_custos_update" ON projeto_custos;
DROP POLICY IF EXISTS "projeto_custos_delete" ON projeto_custos;

CREATE POLICY "projeto_custos_select" ON projeto_custos FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_custos_insert" ON projeto_custos FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_custos_update" ON projeto_custos FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_custos_delete" ON projeto_custos FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4j. projeto_atas ──
DROP POLICY IF EXISTS "projeto_atas_select" ON projeto_atas;
DROP POLICY IF EXISTS "projeto_atas_insert" ON projeto_atas;
DROP POLICY IF EXISTS "projeto_atas_update" ON projeto_atas;
DROP POLICY IF EXISTS "projeto_atas_delete" ON projeto_atas;

CREATE POLICY "projeto_atas_select" ON projeto_atas FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_atas_insert" ON projeto_atas FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_atas_update" ON projeto_atas FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_atas_delete" ON projeto_atas FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4k. projeto_acompanhamento_visitas ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_acompanhamento_visitas;
DROP POLICY IF EXISTS "projeto_acompanhamento_visitas_select" ON projeto_acompanhamento_visitas;
DROP POLICY IF EXISTS "projeto_acompanhamento_visitas_insert" ON projeto_acompanhamento_visitas;
DROP POLICY IF EXISTS "projeto_acompanhamento_visitas_update" ON projeto_acompanhamento_visitas;
DROP POLICY IF EXISTS "projeto_acompanhamento_visitas_delete" ON projeto_acompanhamento_visitas;

CREATE POLICY "projeto_acompanhamento_visitas_select" ON projeto_acompanhamento_visitas FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_acompanhamento_visitas_insert" ON projeto_acompanhamento_visitas FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_acompanhamento_visitas_update" ON projeto_acompanhamento_visitas FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_acompanhamento_visitas_delete" ON projeto_acompanhamento_visitas FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4l. projeto_desenhos_obra ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_desenhos_obra;
DROP POLICY IF EXISTS "projeto_desenhos_obra_select" ON projeto_desenhos_obra;
DROP POLICY IF EXISTS "projeto_desenhos_obra_insert" ON projeto_desenhos_obra;
DROP POLICY IF EXISTS "projeto_desenhos_obra_update" ON projeto_desenhos_obra;
DROP POLICY IF EXISTS "projeto_desenhos_obra_delete" ON projeto_desenhos_obra;

CREATE POLICY "projeto_desenhos_obra_select" ON projeto_desenhos_obra FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_desenhos_obra_insert" ON projeto_desenhos_obra FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_desenhos_obra_update" ON projeto_desenhos_obra FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "projeto_desenhos_obra_delete" ON projeto_desenhos_obra FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4m. design_reviews (has projeto_id) ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON design_reviews;
DROP POLICY IF EXISTS "design_reviews_select" ON design_reviews;
DROP POLICY IF EXISTS "design_reviews_insert" ON design_reviews;
DROP POLICY IF EXISTS "design_reviews_update" ON design_reviews;
DROP POLICY IF EXISTS "design_reviews_delete" ON design_reviews;

CREATE POLICY "design_reviews_select" ON design_reviews FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "design_reviews_insert" ON design_reviews FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "design_reviews_update" ON design_reviews FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "design_reviews_delete" ON design_reviews FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4n. design_review_versions (via review_id → design_reviews) ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON design_review_versions;
DROP POLICY IF EXISTS "design_review_versions_select" ON design_review_versions;
DROP POLICY IF EXISTS "design_review_versions_insert" ON design_review_versions;
DROP POLICY IF EXISTS "design_review_versions_update" ON design_review_versions;
DROP POLICY IF EXISTS "design_review_versions_delete" ON design_review_versions;

CREATE POLICY "design_review_versions_select" ON design_review_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_versions.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_versions_insert" ON design_review_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_versions.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_versions_update" ON design_review_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_versions.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_versions_delete" ON design_review_versions FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4o. design_review_annotations (via review_id → design_reviews) ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_select" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_insert" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_update" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_delete" ON design_review_annotations;

CREATE POLICY "design_review_annotations_select" ON design_review_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_annotations.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_insert" ON design_review_annotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_annotations.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_update" ON design_review_annotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM design_reviews dr
    WHERE dr.id = design_review_annotations.review_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_delete" ON design_review_annotations FOR DELETE
  USING (
    auth.uid() = criado_por  -- author can delete own
    OR gavinho_is_gestor_or_above()
  );


-- ── 4p. entrega_ficheiros (has projeto_id) ──
DROP POLICY IF EXISTS "Allow all for authenticated users" ON entrega_ficheiros;
DROP POLICY IF EXISTS "entrega_ficheiros_select" ON entrega_ficheiros;
DROP POLICY IF EXISTS "entrega_ficheiros_insert" ON entrega_ficheiros;
DROP POLICY IF EXISTS "entrega_ficheiros_update" ON entrega_ficheiros;
DROP POLICY IF EXISTS "entrega_ficheiros_delete" ON entrega_ficheiros;

CREATE POLICY "entrega_ficheiros_select" ON entrega_ficheiros FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "entrega_ficheiros_insert" ON entrega_ficheiros FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "entrega_ficheiros_update" ON entrega_ficheiros FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "entrega_ficheiros_delete" ON entrega_ficheiros FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 4q. tarefas (has projeto_id) ──
DROP POLICY IF EXISTS "Visualizar tarefas dos projetos" ON tarefas;
DROP POLICY IF EXISTS "Criar tarefas" ON tarefas;
DROP POLICY IF EXISTS "Atualizar tarefas" ON tarefas;
DROP POLICY IF EXISTS "Eliminar tarefas" ON tarefas;
DROP POLICY IF EXISTS "tarefas_select" ON tarefas;
DROP POLICY IF EXISTS "tarefas_insert" ON tarefas;
DROP POLICY IF EXISTS "tarefas_update" ON tarefas;
DROP POLICY IF EXISTS "tarefas_delete" ON tarefas;

CREATE POLICY "tarefas_select" ON tarefas FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "tarefas_insert" ON tarefas FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "tarefas_update" ON tarefas FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "tarefas_delete" ON tarefas FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ══════════════════════════════════════════════════════════════════
-- 5. FINANCE TABLES
--    READ: project team can view
--    WRITE (INSERT/UPDATE): gestor+ only
--    DELETE: admin only
-- ══════════════════════════════════════════════════════════════════

-- ── 5a. orcamentos ──
DROP POLICY IF EXISTS "Allow all select on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow all insert on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow all update on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow all delete on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "orcamentos_select" ON orcamentos;
DROP POLICY IF EXISTS "orcamentos_insert" ON orcamentos;
DROP POLICY IF EXISTS "orcamentos_update" ON orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete" ON orcamentos;

CREATE POLICY "orcamentos_select" ON orcamentos FOR SELECT
  USING (
    gavinho_is_gestor_or_above()
    OR (projeto_id IS NOT NULL AND gavinho_can_access_project(projeto_id))
  );

CREATE POLICY "orcamentos_insert" ON orcamentos FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamentos_update" ON orcamentos FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamentos_delete" ON orcamentos FOR DELETE
  USING (gavinho_is_admin());


-- ── 5b. orcamento_capitulos (via orcamento_id → orcamentos) ──
DROP POLICY IF EXISTS "Allow all select on orcamento_capitulos" ON orcamento_capitulos;
DROP POLICY IF EXISTS "Allow all insert on orcamento_capitulos" ON orcamento_capitulos;
DROP POLICY IF EXISTS "Allow all update on orcamento_capitulos" ON orcamento_capitulos;
DROP POLICY IF EXISTS "Allow all delete on orcamento_capitulos" ON orcamento_capitulos;
DROP POLICY IF EXISTS "orcamento_capitulos_select" ON orcamento_capitulos;
DROP POLICY IF EXISTS "orcamento_capitulos_insert" ON orcamento_capitulos;
DROP POLICY IF EXISTS "orcamento_capitulos_update" ON orcamento_capitulos;
DROP POLICY IF EXISTS "orcamento_capitulos_delete" ON orcamento_capitulos;

CREATE POLICY "orcamento_capitulos_select" ON orcamento_capitulos FOR SELECT
  USING (gavinho_can_access_orcamento(orcamento_id));

CREATE POLICY "orcamento_capitulos_insert" ON orcamento_capitulos FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamento_capitulos_update" ON orcamento_capitulos FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamento_capitulos_delete" ON orcamento_capitulos FOR DELETE
  USING (gavinho_is_admin());


-- ── 5c. orcamento_itens (via capitulo_id → orcamento_capitulos → orcamentos) ──
DROP POLICY IF EXISTS "Allow all select on orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Allow all insert on orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Allow all update on orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Allow all delete on orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_select" ON orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_insert" ON orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_update" ON orcamento_itens;
DROP POLICY IF EXISTS "orcamento_itens_delete" ON orcamento_itens;

CREATE POLICY "orcamento_itens_select" ON orcamento_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orcamento_capitulos oc
    JOIN orcamentos o ON o.id = oc.orcamento_id
    WHERE oc.id = orcamento_itens.capitulo_id
      AND (gavinho_is_gestor_or_above() OR (o.projeto_id IS NOT NULL AND gavinho_can_access_project(o.projeto_id)))
  ));

CREATE POLICY "orcamento_itens_insert" ON orcamento_itens FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamento_itens_update" ON orcamento_itens FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "orcamento_itens_delete" ON orcamento_itens FOR DELETE
  USING (gavinho_is_admin());


-- ── 5d. purchase_orders ──
DROP POLICY IF EXISTS "po_all" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  USING (
    gavinho_is_gestor_or_above()
    OR (projeto_id IS NOT NULL AND gavinho_can_access_project(projeto_id))
    OR (obra_id IS NOT NULL AND gavinho_can_access_obra(obra_id))
  );

CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "purchase_orders_delete" ON purchase_orders FOR DELETE
  USING (gavinho_is_admin());


-- ── 5e. po_linhas (via po_id → purchase_orders) ──
DROP POLICY IF EXISTS "pol_all" ON po_linhas;
DROP POLICY IF EXISTS "po_linhas_select" ON po_linhas;
DROP POLICY IF EXISTS "po_linhas_insert" ON po_linhas;
DROP POLICY IF EXISTS "po_linhas_update" ON po_linhas;
DROP POLICY IF EXISTS "po_linhas_delete" ON po_linhas;

CREATE POLICY "po_linhas_select" ON po_linhas FOR SELECT
  USING (gavinho_can_access_po(po_id));

CREATE POLICY "po_linhas_insert" ON po_linhas FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "po_linhas_update" ON po_linhas FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "po_linhas_delete" ON po_linhas FOR DELETE
  USING (gavinho_is_admin());


-- ── 5f. procurement_facturas ──
DROP POLICY IF EXISTS "pfat_all" ON procurement_facturas;
DROP POLICY IF EXISTS "procurement_facturas_select" ON procurement_facturas;
DROP POLICY IF EXISTS "procurement_facturas_insert" ON procurement_facturas;
DROP POLICY IF EXISTS "procurement_facturas_update" ON procurement_facturas;
DROP POLICY IF EXISTS "procurement_facturas_delete" ON procurement_facturas;

CREATE POLICY "procurement_facturas_select" ON procurement_facturas FOR SELECT
  USING (
    gavinho_is_gestor_or_above()
    OR (projeto_id IS NOT NULL AND gavinho_can_access_project(projeto_id))
    OR (po_id IS NOT NULL AND gavinho_can_access_po(po_id))
  );

CREATE POLICY "procurement_facturas_insert" ON procurement_facturas FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "procurement_facturas_update" ON procurement_facturas FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "procurement_facturas_delete" ON procurement_facturas FOR DELETE
  USING (gavinho_is_admin());


-- ── 5g. facturacao_cliente ──
DROP POLICY IF EXISTS "facturacao_cliente_all" ON facturacao_cliente;
DROP POLICY IF EXISTS "facturacao_cliente_select" ON facturacao_cliente;
DROP POLICY IF EXISTS "facturacao_cliente_insert" ON facturacao_cliente;
DROP POLICY IF EXISTS "facturacao_cliente_update" ON facturacao_cliente;
DROP POLICY IF EXISTS "facturacao_cliente_delete" ON facturacao_cliente;

CREATE POLICY "facturacao_cliente_select" ON facturacao_cliente FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "facturacao_cliente_insert" ON facturacao_cliente FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "facturacao_cliente_update" ON facturacao_cliente FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "facturacao_cliente_delete" ON facturacao_cliente FOR DELETE
  USING (gavinho_is_admin());


-- ── 5h. extras ──
DROP POLICY IF EXISTS "extras_all" ON extras;
DROP POLICY IF EXISTS "extras_select" ON extras;
DROP POLICY IF EXISTS "extras_insert" ON extras;
DROP POLICY IF EXISTS "extras_update" ON extras;
DROP POLICY IF EXISTS "extras_delete" ON extras;

CREATE POLICY "extras_select" ON extras FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "extras_insert" ON extras FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "extras_update" ON extras FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "extras_delete" ON extras FOR DELETE
  USING (gavinho_is_admin());


-- ── 5i. alertas_financeiros ──
DROP POLICY IF EXISTS "alertas_fin_all" ON alertas_financeiros;
DROP POLICY IF EXISTS "alertas_financeiros_select" ON alertas_financeiros;
DROP POLICY IF EXISTS "alertas_financeiros_insert" ON alertas_financeiros;
DROP POLICY IF EXISTS "alertas_financeiros_update" ON alertas_financeiros;
DROP POLICY IF EXISTS "alertas_financeiros_delete" ON alertas_financeiros;

CREATE POLICY "alertas_financeiros_select" ON alertas_financeiros FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

-- INSERT: gestor+ or service role (for triggers/edge functions)
CREATE POLICY "alertas_financeiros_insert" ON alertas_financeiros FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "alertas_financeiros_update" ON alertas_financeiros FOR UPDATE
  USING (gavinho_can_access_project(projeto_id))
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "alertas_financeiros_delete" ON alertas_financeiros FOR DELETE
  USING (gavinho_is_admin());


-- ── 5j. projecoes_financeiras ──
DROP POLICY IF EXISTS "projecoes_all" ON projecoes_financeiras;
DROP POLICY IF EXISTS "projecoes_financeiras_select" ON projecoes_financeiras;
DROP POLICY IF EXISTS "projecoes_financeiras_insert" ON projecoes_financeiras;
DROP POLICY IF EXISTS "projecoes_financeiras_update" ON projecoes_financeiras;
DROP POLICY IF EXISTS "projecoes_financeiras_delete" ON projecoes_financeiras;

CREATE POLICY "projecoes_financeiras_select" ON projecoes_financeiras FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projecoes_financeiras_insert" ON projecoes_financeiras FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projecoes_financeiras_update" ON projecoes_financeiras FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projecoes_financeiras_delete" ON projecoes_financeiras FOR DELETE
  USING (gavinho_is_admin());


-- ── 5k. faturas ──
DROP POLICY IF EXISTS "Allow all select on faturas" ON faturas;
DROP POLICY IF EXISTS "Allow all insert on faturas" ON faturas;
DROP POLICY IF EXISTS "Allow all update on faturas" ON faturas;
DROP POLICY IF EXISTS "Allow all delete on faturas" ON faturas;
DROP POLICY IF EXISTS "faturas_select" ON faturas;
DROP POLICY IF EXISTS "faturas_insert" ON faturas;
DROP POLICY IF EXISTS "faturas_update" ON faturas;
DROP POLICY IF EXISTS "faturas_delete" ON faturas;

CREATE POLICY "faturas_select" ON faturas FOR SELECT
  USING (
    gavinho_is_gestor_or_above()
    OR (projeto_id IS NOT NULL AND gavinho_can_access_project(projeto_id))
  );

CREATE POLICY "faturas_insert" ON faturas FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "faturas_update" ON faturas FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "faturas_delete" ON faturas FOR DELETE
  USING (gavinho_is_admin());


-- ── 5l. projecoes_cenarios ──
DROP POLICY IF EXISTS "projecoes_cenarios_select" ON projecoes_cenarios;
DROP POLICY IF EXISTS "projecoes_cenarios_insert" ON projecoes_cenarios;
DROP POLICY IF EXISTS "projecoes_cenarios_update" ON projecoes_cenarios;
DROP POLICY IF EXISTS "projecoes_cenarios_delete" ON projecoes_cenarios;

CREATE POLICY "projecoes_cenarios_select" ON projecoes_cenarios FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "projecoes_cenarios_insert" ON projecoes_cenarios FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projecoes_cenarios_update" ON projecoes_cenarios FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "projecoes_cenarios_delete" ON projecoes_cenarios FOR DELETE
  USING (gavinho_is_admin());


-- ══════════════════════════════════════════════════════════════════
-- 6. CHAT TABLES
--    Access follows project membership via: canal → projeto
--    chat_canais has projeto_id
--    chat_topicos → canal_id → chat_canais.projeto_id
--    chat_mensagens → topico_id → chat_topicos → chat_canais
-- ══════════════════════════════════════════════════════════════════

-- ── 6a. chat_canais ──
DROP POLICY IF EXISTS "chat_canais_all" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_select" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_insert" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_update" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_delete" ON chat_canais;

CREATE POLICY "chat_canais_select" ON chat_canais FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "chat_canais_insert" ON chat_canais FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "chat_canais_update" ON chat_canais FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "chat_canais_delete" ON chat_canais FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 6b. chat_topicos (via canal_id → chat_canais) ──
DROP POLICY IF EXISTS "chat_topicos_all" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_select" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_insert" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_update" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_delete" ON chat_topicos;

CREATE POLICY "chat_topicos_select" ON chat_topicos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_canais c
    WHERE c.id = chat_topicos.canal_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_topicos_insert" ON chat_topicos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_canais c
    WHERE c.id = chat_topicos.canal_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_topicos_update" ON chat_topicos FOR UPDATE
  USING (
    auth.uid() = criado_por  -- author can update own topic
    OR gavinho_is_gestor_or_above()
  );

CREATE POLICY "chat_topicos_delete" ON chat_topicos FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 6c. chat_mensagens ──
DROP POLICY IF EXISTS "chat_mensagens_all" ON chat_mensagens;
DROP POLICY IF EXISTS "allow_all_chat_mensagens" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_select" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_insert" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_update" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_delete" ON chat_mensagens;

-- SELECT: project members can see messages in their project's channels
CREATE POLICY "chat_mensagens_select" ON chat_mensagens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_topicos t
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE t.id = chat_mensagens.topico_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- INSERT: project members can post messages
CREATE POLICY "chat_mensagens_insert" ON chat_mensagens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_topicos t
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE t.id = chat_mensagens.topico_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- UPDATE: only the author can edit their own messages
CREATE POLICY "chat_mensagens_update" ON chat_mensagens FOR UPDATE
  USING (
    auth.uid() = autor_id
    OR gavinho_is_gestor_or_above()
  );

-- DELETE: author or gestor+
CREATE POLICY "chat_mensagens_delete" ON chat_mensagens FOR DELETE
  USING (
    auth.uid() = autor_id
    OR gavinho_is_gestor_or_above()
  );


-- ── 6d. chat_reacoes ──
DROP POLICY IF EXISTS "chat_reacoes_all" ON chat_reacoes;
DROP POLICY IF EXISTS "allow_all_chat_reacoes" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_select" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_insert" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_delete" ON chat_reacoes;

CREATE POLICY "chat_reacoes_select" ON chat_reacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_reacoes.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_reacoes_insert" ON chat_reacoes FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_reacoes_delete" ON chat_reacoes FOR DELETE
  USING (auth.uid() = utilizador_id);


-- ── 6e. chat_mencoes ──
DROP POLICY IF EXISTS "chat_mencoes_all" ON chat_mencoes;
DROP POLICY IF EXISTS "allow_all_chat_mencoes" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_select" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_insert" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_update" ON chat_mencoes;

-- Users can see mentions directed at them
CREATE POLICY "chat_mencoes_select" ON chat_mencoes FOR SELECT
  USING (auth.uid() = utilizador_id OR gavinho_is_gestor_or_above());

CREATE POLICY "chat_mencoes_insert" ON chat_mencoes FOR INSERT
  WITH CHECK (true);  -- Triggered by message insert

CREATE POLICY "chat_mencoes_update" ON chat_mencoes FOR UPDATE
  USING (auth.uid() = utilizador_id);  -- Mark as read


-- ── 6f. chat_leituras ──
DROP POLICY IF EXISTS "chat_leituras_all" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_select" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_insert" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_update" ON chat_leituras;

-- Users manage their own read receipts
CREATE POLICY "chat_leituras_select" ON chat_leituras FOR SELECT
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_leituras_insert" ON chat_leituras FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_leituras_update" ON chat_leituras FOR UPDATE
  USING (auth.uid() = utilizador_id);


-- ── 6g. chat_notificacoes ──
DROP POLICY IF EXISTS "chat_notificacoes_all" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_select" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_insert" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_update" ON chat_notificacoes;

-- Users see their own notifications
CREATE POLICY "chat_notificacoes_select" ON chat_notificacoes FOR SELECT
  USING (auth.uid() = utilizador_id);

-- System/triggers insert notifications (need service_role or SECURITY DEFINER trigger)
CREATE POLICY "chat_notificacoes_insert" ON chat_notificacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "chat_notificacoes_update" ON chat_notificacoes FOR UPDATE
  USING (auth.uid() = utilizador_id);  -- Mark as read


-- ── 6h. chat_subscricoes ──
DROP POLICY IF EXISTS "chat_subscricoes_all" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_select" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_insert" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_update" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_delete" ON chat_subscricoes;

-- Users manage their own subscription preferences
CREATE POLICY "chat_subscricoes_select" ON chat_subscricoes FOR SELECT
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_insert" ON chat_subscricoes FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_update" ON chat_subscricoes FOR UPDATE
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_delete" ON chat_subscricoes FOR DELETE
  USING (auth.uid() = utilizador_id);


-- ── 6i. chat_mensagens_historico ──
DROP POLICY IF EXISTS "chat_mensagens_historico_all" ON chat_mensagens_historico;
DROP POLICY IF EXISTS "chat_mensagens_historico_select" ON chat_mensagens_historico;
DROP POLICY IF EXISTS "chat_mensagens_historico_insert" ON chat_mensagens_historico;

CREATE POLICY "chat_mensagens_historico_select" ON chat_mensagens_historico FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_mensagens_historico.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- Insert is done by trigger (SECURITY DEFINER)
CREATE POLICY "chat_mensagens_historico_insert" ON chat_mensagens_historico FOR INSERT
  WITH CHECK (true);


-- ── 6j. chat_anexos ──
DROP POLICY IF EXISTS "chat_anexos_all" ON chat_anexos;
DROP POLICY IF EXISTS "allow_all_chat_anexos" ON chat_anexos;
DROP POLICY IF EXISTS "chat_anexos_select" ON chat_anexos;
DROP POLICY IF EXISTS "chat_anexos_insert" ON chat_anexos;

CREATE POLICY "chat_anexos_select" ON chat_anexos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_anexos.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_anexos_insert" ON chat_anexos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_anexos.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));


-- ── 6k. chat_presenca — keep permissive (presence is not sensitive) ──
-- Presence and typing are ephemeral and not sensitive
-- Keeping USING(true) for performance on realtime subscriptions
DROP POLICY IF EXISTS "chat_presenca_all" ON chat_presenca;
DROP POLICY IF EXISTS "chat_presenca_select" ON chat_presenca;
DROP POLICY IF EXISTS "chat_presenca_upsert" ON chat_presenca;

CREATE POLICY "chat_presenca_select" ON chat_presenca FOR SELECT
  USING (true);  -- All authenticated can see who's online

CREATE POLICY "chat_presenca_upsert" ON chat_presenca FOR ALL
  USING (auth.uid() = utilizador_id)
  WITH CHECK (auth.uid() = utilizador_id);


-- ── 6l. chat_typing — keep permissive (ephemeral) ──
DROP POLICY IF EXISTS "chat_typing_all" ON chat_typing;
DROP POLICY IF EXISTS "chat_typing_select" ON chat_typing;
DROP POLICY IF EXISTS "chat_typing_upsert" ON chat_typing;

CREATE POLICY "chat_typing_select" ON chat_typing FOR SELECT
  USING (true);

CREATE POLICY "chat_typing_upsert" ON chat_typing FOR ALL
  USING (auth.uid() = utilizador_id)
  WITH CHECK (auth.uid() = utilizador_id);


-- ══════════════════════════════════════════════════════════════════
-- 7. OBRA-SCOPED TABLES (most critical ones)
--    Access via: obra_id → obras.projeto_id → projeto_equipa
-- ══════════════════════════════════════════════════════════════════

-- ── 7a. obra_diario ──
DROP POLICY IF EXISTS "Allow all select on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all insert on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all update on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all delete on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_select" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_insert" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_update" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_delete" ON obra_diario;

CREATE POLICY "obra_diario_select" ON obra_diario FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_insert" ON obra_diario FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_update" ON obra_diario FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_delete" ON obra_diario FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 7b. obra_autos ──
DROP POLICY IF EXISTS "Allow all select on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all insert on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all update on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all delete on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_select" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_insert" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_update" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_delete" ON obra_autos;

CREATE POLICY "obra_autos_select" ON obra_autos FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_autos_insert" ON obra_autos FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "obra_autos_update" ON obra_autos FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "obra_autos_delete" ON obra_autos FOR DELETE
  USING (gavinho_is_admin());


-- ── 7c. obra_items ──
DROP POLICY IF EXISTS "Allow all select on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all insert on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all update on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all delete on obra_items" ON obra_items;
DROP POLICY IF EXISTS "obra_items_select" ON obra_items;
DROP POLICY IF EXISTS "obra_items_insert" ON obra_items;
DROP POLICY IF EXISTS "obra_items_update" ON obra_items;
DROP POLICY IF EXISTS "obra_items_delete" ON obra_items;

CREATE POLICY "obra_items_select" ON obra_items FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_insert" ON obra_items FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_update" ON obra_items FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_delete" ON obra_items FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 7d. obra_mensagens ──
DROP POLICY IF EXISTS "Allow all select on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all insert on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all update on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all delete on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_select" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_insert" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_update" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_delete" ON obra_mensagens;

CREATE POLICY "obra_mensagens_select" ON obra_mensagens FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_insert" ON obra_mensagens FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_update" ON obra_mensagens FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_delete" ON obra_mensagens FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ── 7e. obra_especialidades ──
DROP POLICY IF EXISTS "Allow all select on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all insert on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all update on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all delete on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_select" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_insert" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_update" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_delete" ON obra_especialidades;

CREATE POLICY "obra_especialidades_select" ON obra_especialidades FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_insert" ON obra_especialidades FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_update" ON obra_especialidades FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_delete" ON obra_especialidades FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ══════════════════════════════════════════════════════════════════
-- 8. LOG MIGRATION
-- ══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, nome, executado_em)
    VALUES ('20250214_restrict_rls_policies', '20250214_restrict_rls_policies', NOW())
    ON CONFLICT (seed_key) DO UPDATE SET executado_em = NOW();
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- SUMMARY OF CHANGES
-- ══════════════════════════════════════════════════════════════════
--
-- Helper functions created (SECURITY DEFINER, STABLE):
--   gavinho_is_admin()
--   gavinho_is_gestor_or_above()
--   gavinho_can_access_project(UUID)
--   gavinho_can_access_obra(UUID)
--   gavinho_can_access_orcamento(UUID)
--   gavinho_can_access_po(TEXT)
--   user_has_project_access(UUID) — updated to delegate to new function
--
-- Tables with restricted RLS (42 tables):
--   CORE:         projetos, obras
--   PROJECT:      projeto_equipa, projeto_entregaveis, projeto_pagamentos,
--                 projeto_servicos, projeto_duvidas, projeto_intervenientes,
--                 projeto_fases_contratuais, projeto_renders, projeto_custos,
--                 projeto_atas, projeto_acompanhamento_visitas,
--                 projeto_desenhos_obra, design_reviews,
--                 design_review_versions, design_review_annotations,
--                 entrega_ficheiros, tarefas
--   FINANCE:      orcamentos, orcamento_capitulos, orcamento_itens,
--                 purchase_orders, po_linhas, procurement_facturas,
--                 facturacao_cliente, extras, alertas_financeiros,
--                 projecoes_financeiras, faturas, projecoes_cenarios
--   CHAT:         chat_canais, chat_topicos, chat_mensagens, chat_reacoes,
--                 chat_mencoes, chat_leituras, chat_notificacoes,
--                 chat_subscricoes, chat_mensagens_historico, chat_anexos,
--                 chat_presenca, chat_typing
--   OBRA:         obra_diario, obra_autos, obra_items, obra_mensagens,
--                 obra_especialidades
--
-- Access matrix:
--   admin   → full access to all tables
--   gestor  → read all, write all, delete most (not admin-only deletes)
--   tecnico → read/write assigned projects only, no finance writes
--   user    → read/write assigned projects only, no finance writes
--
-- Performance indexes added:
--   idx_utilizadores_auth_role      — for role checks
--   idx_projeto_equipa_user_projeto — for team membership checks
--   idx_projeto_equipa_user_active  — for active team membership
--   idx_obras_projeto               — for obra→project lookups
-- ══════════════════════════════════════════════════════════════════
