-- =====================================================
-- MIGRAÇÃO: Tabela projeto_custos e view v_custos_por_capitulo
-- Gavinho Platform - Criado em 2025-02-07
-- Suporta o módulo Finance.jsx
-- =====================================================

-- projeto_custos - Custos individuais por projeto
CREATE TABLE IF NOT EXISTS projeto_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  capitulo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'comprometido' CHECK (estado IN ('comprometido', 'realizado', 'faturado')),
  tipo_documento TEXT DEFAULT 'fatura' CHECK (tipo_documento IN ('fatura', 'auto_medicao', 'nota_encomenda', 'adiantamento', 'outro')),
  numero_documento TEXT,
  data_documento DATE DEFAULT CURRENT_DATE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  valor_bruto DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva_percentagem DECIMAL(5,2) DEFAULT 23,
  iva_valor DECIMAL(12,2) DEFAULT 0,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_custos_projeto_id ON projeto_custos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_custos_capitulo ON projeto_custos(capitulo);
CREATE INDEX IF NOT EXISTS idx_projeto_custos_estado ON projeto_custos(estado);

-- View agregada de custos por capítulo (usada em Finance.jsx)
DROP VIEW IF EXISTS v_custos_por_capitulo;
CREATE OR REPLACE VIEW v_custos_por_capitulo AS
SELECT
  projeto_id,
  capitulo,
  COALESCE(SUM(CASE WHEN estado = 'comprometido' THEN valor_total END), 0) AS comprometido,
  COALESCE(SUM(CASE WHEN estado = 'realizado' THEN valor_total END), 0) AS realizado,
  COALESCE(SUM(CASE WHEN estado = 'faturado' THEN valor_total END), 0) AS faturado,
  COUNT(*) AS total_registos
FROM projeto_custos
GROUP BY projeto_id, capitulo;

-- RLS
ALTER TABLE projeto_custos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_custos_all" ON projeto_custos;
CREATE POLICY "projeto_custos_all" ON projeto_custos
  FOR ALL USING (true);

-- Trigger updated_at
CREATE TRIGGER trigger_updated_at_projeto_custos
  BEFORE UPDATE ON projeto_custos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
