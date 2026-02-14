-- =====================================================
-- LEADS PIPELINE - Database Migration
-- Tables: leads, lead_interacoes, lead_documentos
-- Includes: RLS, indexes, triggers, auto-codigo
-- =====================================================

-- ── 1. LEADS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  empresa TEXT,
  tipologia TEXT DEFAULT 'outro' CHECK (tipologia IN ('moradia', 'apartamento', 'comercial', 'reabilitacao', 'outro')),
  localizacao TEXT,
  area_estimada DECIMAL,
  orcamento_estimado DECIMAL,
  fonte TEXT DEFAULT 'outro' CHECK (fonte IN ('site', 'referencia', 'instagram', 'outro')),
  notas TEXT,
  fase TEXT DEFAULT 'contacto_inicial' CHECK (fase IN ('contacto_inicial', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  responsavel_id UUID REFERENCES auth.users(id),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  data_contacto DATE DEFAULT CURRENT_DATE,
  data_ultima_interacao TIMESTAMPTZ DEFAULT now(),
  data_conversao TIMESTAMPTZ,
  motivo_perda TEXT,
  projeto_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if table already exists with different schema
DO $$
BEGIN
  -- Ensure all columns exist (idempotent)
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS codigo TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipologia TEXT DEFAULT 'outro';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS localizacao TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS area_estimada DECIMAL;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS orcamento_estimado DECIMAL;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS fonte TEXT DEFAULT 'outro';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'media';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_contacto DATE DEFAULT CURRENT_DATE;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_ultima_interacao TIMESTAMPTZ DEFAULT now();
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_conversao TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS projeto_id TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsavel_id UUID;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Some columns may already exist: %', SQLERRM;
END $$;

-- Rename valor_estimado to orcamento_estimado if old schema exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'valor_estimado'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'orcamento_estimado'
  ) THEN
    ALTER TABLE leads RENAME COLUMN valor_estimado TO orcamento_estimado;
  END IF;
  -- Rename origem to fonte if old schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'origem'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'fonte'
  ) THEN
    ALTER TABLE leads RENAME COLUMN origem TO fonte;
  END IF;
END $$;

-- ── 2. LEAD_INTERACOES TABLE ────────────────────────
CREATE TABLE IF NOT EXISTS lead_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('chamada', 'email', 'reuniao', 'visita', 'nota')),
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. LEAD_DOCUMENTOS TABLE ────────────────────────
CREATE TABLE IF NOT EXISTS lead_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. INDEXES ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_fase ON leads(fase);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_tipologia ON leads(tipologia);
CREATE INDEX IF NOT EXISTS idx_leads_fonte ON leads(fonte);
CREATE INDEX IF NOT EXISTS idx_leads_codigo ON leads(codigo);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interacoes_lead_id ON lead_interacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interacoes_created_at ON lead_interacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_documentos_lead_id ON lead_documentos(lead_id);

-- ── 5. AUTO-INCREMENT CODIGO ────────────────────────
-- Generate LEAD-001, LEAD-002, etc.
CREATE OR REPLACE FUNCTION generate_lead_codigo()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COALESCE(MAX(
      CASE
        WHEN codigo ~ '^LEAD-[0-9]+$'
        THEN CAST(SUBSTRING(codigo FROM 6) AS INT)
        ELSE 0
      END
    ), 0) + 1 INTO next_num FROM leads;
    NEW.codigo := 'LEAD-' || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_codigo ON leads;
CREATE TRIGGER trg_leads_codigo
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_lead_codigo();

-- ── 6. UPDATED_AT TRIGGER ───────────────────────────
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- ── 7. AUTO-UPDATE data_ultima_interacao ─────────────
-- When a new interaction is added, update the lead's last interaction date
CREATE OR REPLACE FUNCTION update_lead_ultima_interacao()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET data_ultima_interacao = NEW.created_at
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_interacao_update ON lead_interacoes;
CREATE TRIGGER trg_lead_interacao_update
  AFTER INSERT ON lead_interacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_ultima_interacao();

-- ── 8. RLS POLICIES ─────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_documentos ENABLE ROW LEVEL SECURITY;

-- Leads
DROP POLICY IF EXISTS "leads_select_auth" ON leads;
CREATE POLICY "leads_select_auth" ON leads
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "leads_insert_auth" ON leads;
CREATE POLICY "leads_insert_auth" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "leads_update_auth" ON leads;
CREATE POLICY "leads_update_auth" ON leads
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "leads_delete_auth" ON leads;
CREATE POLICY "leads_delete_auth" ON leads
  FOR DELETE TO authenticated
  USING (true);

-- Lead Interacoes
DROP POLICY IF EXISTS "lead_interacoes_select_auth" ON lead_interacoes;
CREATE POLICY "lead_interacoes_select_auth" ON lead_interacoes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "lead_interacoes_insert_auth" ON lead_interacoes;
CREATE POLICY "lead_interacoes_insert_auth" ON lead_interacoes
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lead_interacoes_delete_auth" ON lead_interacoes;
CREATE POLICY "lead_interacoes_delete_auth" ON lead_interacoes
  FOR DELETE TO authenticated
  USING (true);

-- Lead Documentos
DROP POLICY IF EXISTS "lead_documentos_select_auth" ON lead_documentos;
CREATE POLICY "lead_documentos_select_auth" ON lead_documentos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "lead_documentos_insert_auth" ON lead_documentos;
CREATE POLICY "lead_documentos_insert_auth" ON lead_documentos
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lead_documentos_delete_auth" ON lead_documentos;
CREATE POLICY "lead_documentos_delete_auth" ON lead_documentos
  FOR DELETE TO authenticated
  USING (true);

-- ── 9. BACKFILL EXISTING LEADS ──────────────────────
-- Set codigo for any leads that don't have one
DO $$
DECLARE
  r RECORD;
  counter INT := 0;
  max_num INT;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN codigo ~ '^LEAD-[0-9]+$'
      THEN CAST(SUBSTRING(codigo FROM 6) AS INT)
      ELSE 0
    END
  ), 0) INTO max_num FROM leads;

  FOR r IN SELECT id FROM leads WHERE codigo IS NULL OR codigo = '' ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE leads SET codigo = 'LEAD-' || LPAD((max_num + counter)::TEXT, 3, '0') WHERE id = r.id;
  END LOOP;

  IF counter > 0 THEN
    RAISE NOTICE 'Backfilled % lead codigos', counter;
  END IF;
END $$;

-- ── DONE ────────────────────────────────────────────
-- Tables: leads, lead_interacoes, lead_documentos
-- Triggers: auto-codigo, updated_at, ultima_interacao
-- RLS: all authenticated users can CRUD
-- Indexes: fase, responsavel, prioridade, tipologia, fonte, codigo
