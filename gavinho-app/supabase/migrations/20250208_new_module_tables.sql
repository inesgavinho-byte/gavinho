-- =====================================================
-- MIGRATION: New module tables (Leads, Custos Fixos, Compras Financeiro)
-- + Extend faturas table with missing columns
-- Date: 2025-02-08
-- =====================================================

-- =====================================================
-- 1. LEADS - Pipeline Comercial
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT,
  telefone TEXT,
  origem TEXT, -- referência, website, contacto direto, etc.
  fase TEXT NOT NULL DEFAULT 'contacto_inicial'
    CHECK (fase IN ('contacto_inicial', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  valor_estimado NUMERIC(12, 2),
  notas TEXT,
  -- Campos adicionais de qualificação
  tipo_projeto TEXT, -- design, obra, design_build
  localizacao TEXT,
  tipologia TEXT, -- residencial, comercial, hotelaria, etc.
  data_contacto DATE DEFAULT CURRENT_DATE,
  data_proposta DATE,
  data_decisao DATE,
  motivo_perda TEXT, -- só quando fase = 'perdido'
  responsavel_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL, -- quando convertido em projeto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_fase ON leads(fase);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(responsavel_id);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_select" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "leads_insert" ON leads;
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "leads_update" ON leads;
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "leads_delete" ON leads;
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 2. CUSTOS FIXOS - Gestão de custos fixos mensais
-- =====================================================
CREATE TABLE IF NOT EXISTS custos_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros'
    CHECK (categoria IN (
      'Rendas', 'Seguros', 'Licenças & Software', 'Telecomunicações',
      'Eletricidade', 'Água', 'Contabilidade', 'Manutenção', 'Outros'
    )),
  valor_mensal NUMERIC(10, 2) NOT NULL,
  fornecedor TEXT,
  data_inicio DATE,
  data_fim DATE, -- NULL = sem fim definido (custo contínuo)
  ativo BOOLEAN DEFAULT true,
  periodicidade TEXT DEFAULT 'mensal'
    CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual')),
  notas TEXT,
  -- Documento/contrato associado
  documento_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custos_fixos_categoria ON custos_fixos(categoria);
CREATE INDEX IF NOT EXISTS idx_custos_fixos_ativo ON custos_fixos(ativo);

-- RLS
ALTER TABLE custos_fixos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custos_fixos_select" ON custos_fixos;
CREATE POLICY "custos_fixos_select" ON custos_fixos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "custos_fixos_insert" ON custos_fixos;
CREATE POLICY "custos_fixos_insert" ON custos_fixos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "custos_fixos_update" ON custos_fixos;
CREATE POLICY "custos_fixos_update" ON custos_fixos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "custos_fixos_delete" ON custos_fixos;
CREATE POLICY "custos_fixos_delete" ON custos_fixos FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER set_custos_fixos_updated_at
  BEFORE UPDATE ON custos_fixos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 3. COMPRAS (Módulo Financeiro) - diferente de obras_compras
-- =====================================================
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  projeto TEXT, -- nome/código do projeto (texto livre)
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  categoria TEXT,
  valor NUMERIC(12, 2) NOT NULL,
  valor_com_iva NUMERIC(12, 2),
  iva_percentagem NUMERIC(5, 2) DEFAULT 23,
  data_encomenda DATE,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'encomendada', 'recebida', 'paga', 'cancelada')),
  forma_pagamento TEXT, -- transferência, cartão, cheque
  numero_fatura TEXT,
  notas TEXT,
  documento_url TEXT,
  aprovado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status);
CREATE INDEX IF NOT EXISTS idx_compras_projeto_id ON compras(projeto_id);
CREATE INDEX IF NOT EXISTS idx_compras_obra_id ON compras(obra_id);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id ON compras(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_data_encomenda ON compras(data_encomenda DESC);

-- RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compras_select" ON compras;
CREATE POLICY "compras_select" ON compras FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "compras_insert" ON compras;
CREATE POLICY "compras_insert" ON compras FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "compras_update" ON compras;
CREATE POLICY "compras_update" ON compras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "compras_delete" ON compras;
CREATE POLICY "compras_delete" ON compras FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER set_compras_updated_at
  BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 4. EXTEND FATURAS - adicionar colunas em falta
-- =====================================================
-- A tabela faturas já existe mas faltam colunas para o novo módulo Faturação
DO $$
BEGIN
  -- cliente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'cliente') THEN
    ALTER TABLE faturas ADD COLUMN cliente TEXT;
  END IF;

  -- projeto (texto livre)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'projeto') THEN
    ALTER TABLE faturas ADD COLUMN projeto TEXT;
  END IF;

  -- projeto_id (FK)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'projeto_id') THEN
    ALTER TABLE faturas ADD COLUMN projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL;
  END IF;

  -- descricao
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'descricao') THEN
    ALTER TABLE faturas ADD COLUMN descricao TEXT;
  END IF;

  -- valor (sem IVA)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'valor') THEN
    ALTER TABLE faturas ADD COLUMN valor NUMERIC(12, 2);
  END IF;

  -- valor_com_iva
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'valor_com_iva') THEN
    ALTER TABLE faturas ADD COLUMN valor_com_iva NUMERIC(12, 2);
  END IF;

  -- iva (percentagem numérica)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'iva') THEN
    ALTER TABLE faturas ADD COLUMN iva NUMERIC(5, 2) DEFAULT 23;
  END IF;

  -- status (alias para estado, mais usado no frontend)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'status') THEN
    ALTER TABLE faturas ADD COLUMN status TEXT DEFAULT 'rascunho'
      CHECK (status IN ('rascunho', 'emitida', 'enviada', 'paga', 'vencida', 'anulada'));
  END IF;

  -- notas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'notas') THEN
    ALTER TABLE faturas ADD COLUMN notas TEXT;
  END IF;

  -- forma_pagamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'forma_pagamento') THEN
    ALTER TABLE faturas ADD COLUMN forma_pagamento TEXT;
  END IF;

  -- data_pagamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faturas' AND column_name = 'data_pagamento') THEN
    ALTER TABLE faturas ADD COLUMN data_pagamento DATE;
  END IF;
END $$;

-- Index adicional
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_cliente ON faturas(cliente);
CREATE INDEX IF NOT EXISTS idx_faturas_projeto_id ON faturas(projeto_id);


-- =====================================================
-- DONE
-- =====================================================
-- Tabelas criadas:
--   1. leads (pipeline comercial, 6 fases)
--   2. custos_fixos (custos mensais por categoria)
--   3. compras (gestão financeira de compras)
--   4. faturas (extended com colunas para módulo Faturação)
--
-- Para aplicar: Supabase SQL Editor > New Query > Paste > Run
-- =====================================================
