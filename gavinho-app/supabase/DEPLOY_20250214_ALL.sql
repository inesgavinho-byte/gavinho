-- ============================================================================
-- DEPLOY ALL PENDING MIGRATIONS — 2026-02-14
--
-- Consolidates 3 migrations in correct order:
--   1. fix_orcamentos_columns — add missing columns to orcamentos
--   2. financeiro_phase2_4 — projecoes_cenarios + analise_ia column
--   3. fix_portfolio_view_columns — final v_financeiro_portfolio view
--
-- Copy-paste this entire file into Supabase SQL Editor and run.
-- All statements are idempotent (safe to re-run).
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PART 1: FIX ORCAMENTOS COLUMNS
-- The table was created by an earlier migration with a different schema.
-- CREATE TABLE IF NOT EXISTS was a no-op, so these columns were never added.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Financial columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'subtotal') THEN
    ALTER TABLE orcamentos ADD COLUMN subtotal DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'desconto_percentagem') THEN
    ALTER TABLE orcamentos ADD COLUMN desconto_percentagem DECIMAL(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'desconto_valor') THEN
    ALTER TABLE orcamentos ADD COLUMN desconto_valor DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'total_sem_iva') THEN
    ALTER TABLE orcamentos ADD COLUMN total_sem_iva DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'iva_percentagem') THEN
    ALTER TABLE orcamentos ADD COLUMN iva_percentagem DECIMAL(5,2) DEFAULT 23;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'iva_valor') THEN
    ALTER TABLE orcamentos ADD COLUMN iva_valor DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'total') THEN
    ALTER TABLE orcamentos ADD COLUMN total DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'margem_percentagem') THEN
    ALTER TABLE orcamentos ADD COLUMN margem_percentagem DECIMAL(5,2) DEFAULT 28;
  END IF;

  -- Metadata columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'versao') THEN
    ALTER TABLE orcamentos ADD COLUMN versao INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'validade') THEN
    ALTER TABLE orcamentos ADD COLUMN validade DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'notas_internas') THEN
    ALTER TABLE orcamentos ADD COLUMN notas_internas TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'notas_cliente') THEN
    ALTER TABLE orcamentos ADD COLUMN notas_cliente TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'codigo') THEN
    ALTER TABLE orcamentos ADD COLUMN codigo TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'projeto_codigo') THEN
    ALTER TABLE orcamentos ADD COLUMN projeto_codigo TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'projeto_nome') THEN
    ALTER TABLE orcamentos ADD COLUMN projeto_nome TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'cliente_nome') THEN
    ALTER TABLE orcamentos ADD COLUMN cliente_nome TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'titulo') THEN
    ALTER TABLE orcamentos ADD COLUMN titulo TEXT;
  END IF;
END $$;

-- Indexes (safe to re-run)
CREATE INDEX IF NOT EXISTS idx_orcamentos_projeto_id ON orcamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);


-- ════════════════════════════════════════════════════════════════════════════
-- PART 2: PROJECOES CENARIOS TABLE — saved scenario simulations
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projecoes_cenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  cenario_data JSONB NOT NULL DEFAULT '{}',
  resultados JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE projecoes_cenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projecoes_cenarios_select" ON projecoes_cenarios;
CREATE POLICY "projecoes_cenarios_select" ON projecoes_cenarios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "projecoes_cenarios_insert" ON projecoes_cenarios;
CREATE POLICY "projecoes_cenarios_insert" ON projecoes_cenarios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "projecoes_cenarios_update" ON projecoes_cenarios;
CREATE POLICY "projecoes_cenarios_update" ON projecoes_cenarios
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "projecoes_cenarios_delete" ON projecoes_cenarios;
CREATE POLICY "projecoes_cenarios_delete" ON projecoes_cenarios
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Index
CREATE INDEX IF NOT EXISTS idx_projecoes_cenarios_projeto ON projecoes_cenarios(projeto_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_projecoes_cenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projecoes_cenarios_updated_at ON projecoes_cenarios;
CREATE TRIGGER trg_projecoes_cenarios_updated_at
  BEFORE UPDATE ON projecoes_cenarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_projecoes_cenarios_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- PART 3: ADD analise_ia COLUMN TO alertas_financeiros
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alertas_financeiros' AND column_name = 'analise_ia'
  ) THEN
    ALTER TABLE alertas_financeiros ADD COLUMN analise_ia TEXT;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 4: v_financeiro_portfolio VIEW (final/correct version)
-- Multi-project financial overview with correct column names
-- ════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_financeiro_portfolio;

CREATE OR REPLACE VIEW v_financeiro_portfolio AS
SELECT
  p.id AS projeto_id,
  p.nome,
  p.codigo,
  p.status,
  p.fase,
  p.tipologia,
  COALESCE(o.valor_total, 0) AS orcamento_revisto,
  COALESCE(o.margem_global, 25) AS margem_global,
  COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0) AS orcamento_custo,
  COALESCE(po_agg.total_comprometido, 0) AS comprometido,
  COALESCE(f_agg.total_facturado, 0) AS facturado,
  CASE
    WHEN COALESCE(o.valor_total, 0) > 0
    THEN ((COALESCE(o.valor_total, 0) - COALESCE(po_agg.total_comprometido, 0)) / o.valor_total * 100)
    ELSE 0
  END AS margem_actual_pct,
  CASE
    WHEN COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0) > 0
    THEN ((COALESCE(po_agg.total_comprometido, 0) - COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0))
          / (o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0)) * 100)
    ELSE 0
  END AS desvio_pct,
  COALESCE(a_agg.alertas_activos, 0) AS alertas_activos,
  COALESCE(a_agg.alertas_urgentes, 0) AS alertas_urgentes,
  COALESCE(a_agg.alertas_criticos, 0) AS alertas_criticos,
  COALESCE(ext_agg.extras_pendentes, 0) AS extras_pendentes,
  COALESCE(ext_agg.extras_valor, 0) AS extras_valor_pendente,
  fc_agg.total_recebido,
  fc_agg.total_facturado AS total_facturado_cliente,
  fc_agg.proximo_vencimento
FROM projetos p
-- Orcamento mais recente aprovado
LEFT JOIN LATERAL (
  SELECT total AS valor_total, margem_percentagem AS margem_global
  FROM orcamentos
  WHERE projeto_id = p.id AND status = 'aprovado'
  ORDER BY created_at DESC
  LIMIT 1
) o ON true
-- POs agregados por projeto (column is `total`, not `valor_total`)
LEFT JOIN (
  SELECT projeto_id, SUM(total) AS total_comprometido
  FROM purchase_orders
  WHERE estado NOT IN ('rascunho', 'cancelada')
  GROUP BY projeto_id
) po_agg ON po_agg.projeto_id = p.id
-- Facturas agregadas por projeto (column is `total`, not `valor_total`)
LEFT JOIN (
  SELECT projeto_id, SUM(total) AS total_facturado
  FROM procurement_facturas
  WHERE estado IN ('verificada', 'aprovada', 'em_pagamento', 'paga')
  GROUP BY projeto_id
) f_agg ON f_agg.projeto_id = p.id
-- Alertas agregados por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    COUNT(*) FILTER (WHERE estado = 'activo') AS alertas_activos,
    COUNT(*) FILTER (WHERE estado = 'activo' AND gravidade = 'urgente') AS alertas_urgentes,
    COUNT(*) FILTER (WHERE estado = 'activo' AND gravidade = 'critico') AS alertas_criticos
  FROM alertas_financeiros
  GROUP BY projeto_id
) a_agg ON a_agg.projeto_id = p.id
-- Extras agregados por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    COUNT(*) FILTER (WHERE estado = 'pendente') AS extras_pendentes,
    SUM(preco_cliente) FILTER (WHERE estado = 'pendente') AS extras_valor
  FROM extras
  GROUP BY projeto_id
) ext_agg ON ext_agg.projeto_id = p.id
-- Facturação cliente agregada por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    SUM(valor) FILTER (WHERE estado = 'paga') AS total_recebido,
    SUM(valor) FILTER (WHERE estado = 'facturada') AS total_facturado,
    MIN(data_prevista) FILTER (WHERE estado NOT IN ('paga')) AS proximo_vencimento
  FROM facturacao_cliente
  GROUP BY projeto_id
) fc_agg ON fc_agg.projeto_id = p.id
WHERE p.status IN ('ativo', 'em_curso', 'em_progresso', 'active');


-- ════════════════════════════════════════════════════════════════════════════
-- SEED TRACKING
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, executado_em)
    VALUES
      ('20250214_fix_orcamentos_columns', now()),
      ('20250214_financeiro_phase2_4', now()),
      ('20250214_fix_portfolio_view_columns', now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- ============================================================================
-- DONE! All 4 parts applied:
--   1. orcamentos columns (17 columns added if missing)
--   2. projecoes_cenarios table + RLS + trigger
--   3. alertas_financeiros.analise_ia column
--   4. v_financeiro_portfolio view (corrected)
--
-- NEXT STEP: Deploy edge function:
--   supabase functions deploy recalcular-alertas-financeiros
-- ============================================================================
