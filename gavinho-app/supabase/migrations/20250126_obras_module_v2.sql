-- ============================================
-- MÓDULO OBRAS V2 - Sistema Completo
-- MQT → Orçamento → POPs → Compras → Execução → Autos
-- ============================================

-- Drop existing MQT tables (replace with new structure)
DROP TABLE IF EXISTS mqt_items CASCADE;
DROP TABLE IF EXISTS mqt_capitulos CASCADE;
DROP TABLE IF EXISTS mqt_mapas CASCADE;
DROP VIEW IF EXISTS mqt_capitulos_totais CASCADE;
DROP VIEW IF EXISTS mqt_mapas_totais CASCADE;

-- ============================================
-- 1. MQT VERSÕES E LINHAS
-- ============================================

CREATE TABLE IF NOT EXISTS mqt_versoes (
  id TEXT PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  versao TEXT NOT NULL,
  is_ativa BOOLEAN DEFAULT FALSE,
  is_congelada BOOLEAN DEFAULT FALSE,
  congelada_em TIMESTAMPTZ,
  congelada_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(obra_id, versao)
);

CREATE TABLE IF NOT EXISTS mqt_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mqt_versao_id TEXT NOT NULL REFERENCES mqt_versoes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  capitulo DECIMAL(10,2),
  referencia TEXT,
  tipo_subtipo TEXT,
  zona TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'un' CHECK (unidade IN ('un', 'm²', 'm³', 'ml', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç')),
  quantidade DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ORÇAMENTOS INTERNOS
-- ============================================

CREATE TABLE IF NOT EXISTS orcamentos_internos (
  id TEXT PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  mqt_versao_id TEXT NOT NULL REFERENCES mqt_versoes(id),
  is_congelado BOOLEAN DEFAULT FALSE,
  congelado_em TIMESTAMPTZ,
  total_custo DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mqt_versao_id)
);

CREATE TABLE IF NOT EXISTS orcamento_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id TEXT NOT NULL REFERENCES orcamentos_internos(id) ON DELETE CASCADE,
  mqt_linha_id UUID NOT NULL REFERENCES mqt_linhas(id) ON DELETE CASCADE,
  preco_custo_unitario DECIMAL(15,4) DEFAULT 0,
  preco_custo_total DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(orcamento_id, mqt_linha_id)
);

-- ============================================
-- 3. POPs (Propostas de Orçamento)
-- ============================================

CREATE TABLE IF NOT EXISTS pops (
  id TEXT PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  orcamento_id TEXT NOT NULL REFERENCES orcamentos_internos(id),
  numero INTEGER NOT NULL,
  estado TEXT DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'enviada', 'contratada', 'recusada')),
  is_congelada BOOLEAN DEFAULT FALSE,
  congelada_em TIMESTAMPTZ,
  data_envio TIMESTAMPTZ,
  data_adjudicacao TIMESTAMPTZ,
  total_cliente DECIMAL(15,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pop_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id TEXT NOT NULL REFERENCES pops(id) ON DELETE CASCADE,
  orcamento_linha_id UUID NOT NULL REFERENCES orcamento_linhas(id),
  margem_k DECIMAL(5,4) DEFAULT 1.25,
  preco_cliente_unitario DECIMAL(15,4) DEFAULT 0,
  preco_cliente_total DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pop_id, orcamento_linha_id)
);

-- ============================================
-- 4. ADENDAS
-- ============================================

CREATE TABLE IF NOT EXISTS adendas (
  id TEXT PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  pop_principal_id TEXT NOT NULL REFERENCES pops(id),
  numero INTEGER NOT NULL,
  descricao TEXT,
  estado TEXT DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'enviada', 'contratada', 'recusada')),
  is_congelada BOOLEAN DEFAULT FALSE,
  data_adjudicacao TIMESTAMPTZ,
  total_cliente DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adenda_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adenda_id TEXT NOT NULL REFERENCES adendas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  capitulo DECIMAL(10,2),
  referencia TEXT,
  tipo_subtipo TEXT,
  zona TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'un',
  quantidade DECIMAL(15,4) DEFAULT 0,
  preco_custo_unitario DECIMAL(15,4) DEFAULT 0,
  preco_custo_total DECIMAL(15,4) DEFAULT 0,
  margem_k DECIMAL(5,4) DEFAULT 1.25,
  preco_cliente_unitario DECIMAL(15,4) DEFAULT 0,
  preco_cliente_total DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. COMPRAS
-- ============================================

CREATE TABLE IF NOT EXISTS obras_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  pop_linha_id UUID REFERENCES pop_linhas(id),
  adenda_linha_id UUID REFERENCES adenda_linhas(id),
  preco_comprado_unitario DECIMAL(15,4) DEFAULT 0,
  preco_comprado_total DECIMAL(15,4) DEFAULT 0,
  fornecedor_id UUID REFERENCES fornecedores(id),
  data_compra DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_origem_compra CHECK (
    (pop_linha_id IS NOT NULL AND adenda_linha_id IS NULL) OR
    (pop_linha_id IS NULL AND adenda_linha_id IS NOT NULL) OR
    (pop_linha_id IS NULL AND adenda_linha_id IS NULL)
  )
);

-- ============================================
-- 6. EXECUÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS obras_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  pop_linha_id UUID REFERENCES pop_linhas(id),
  adenda_linha_id UUID REFERENCES adenda_linhas(id),
  quantidade_executada DECIMAL(15,4) DEFAULT 0,
  percentagem_execucao DECIMAL(5,2) DEFAULT 0,
  data_registo DATE DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_origem_execucao CHECK (
    (pop_linha_id IS NOT NULL AND adenda_linha_id IS NULL) OR
    (pop_linha_id IS NULL AND adenda_linha_id IS NOT NULL)
  )
);

-- ============================================
-- 7. AUTOS DE MEDIÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS autos (
  id TEXT PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  estado TEXT DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'enviado', 'aprovado')),
  data_envio TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,
  percentagem_acumulada DECIMAL(5,2) DEFAULT 0,
  percentagem_periodo DECIMAL(5,2) DEFAULT 0,
  valor_acumulado DECIMAL(15,2) DEFAULT 0,
  valor_periodo DECIMAL(15,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_id, ano, mes)
);

CREATE TABLE IF NOT EXISTS auto_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id TEXT NOT NULL REFERENCES autos(id) ON DELETE CASCADE,
  pop_linha_id UUID REFERENCES pop_linhas(id),
  adenda_linha_id UUID REFERENCES adenda_linhas(id),
  percentagem_anterior DECIMAL(5,2) DEFAULT 0,
  percentagem_atual DECIMAL(5,2) DEFAULT 0,
  percentagem_periodo DECIMAL(5,2) DEFAULT 0,
  valor_periodo DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_origem_auto CHECK (
    (pop_linha_id IS NOT NULL AND adenda_linha_id IS NULL) OR
    (pop_linha_id IS NULL AND adenda_linha_id IS NOT NULL)
  )
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mqt_versoes_obra ON mqt_versoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_mqt_linhas_versao ON mqt_linhas(mqt_versao_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_linhas_orcamento ON orcamento_linhas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_pop_linhas_pop ON pop_linhas(pop_id);
CREATE INDEX IF NOT EXISTS idx_adenda_linhas_adenda ON adenda_linhas(adenda_id);
CREATE INDEX IF NOT EXISTS idx_obras_compras_obra ON obras_compras(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_execucao_obra ON obras_execucao(obra_id);
CREATE INDEX IF NOT EXISTS idx_autos_obra ON autos(obra_id);
CREATE INDEX IF NOT EXISTS idx_auto_linhas_auto ON auto_linhas(auto_id);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mqt_linhas_updated_at BEFORE UPDATE ON mqt_linhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orcamentos_internos_updated_at BEFORE UPDATE ON orcamentos_internos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orcamento_linhas_updated_at BEFORE UPDATE ON orcamento_linhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pops_updated_at BEFORE UPDATE ON pops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pop_linhas_updated_at BEFORE UPDATE ON pop_linhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adendas_updated_at BEFORE UPDATE ON adendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adenda_linhas_updated_at BEFORE UPDATE ON adenda_linhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_obras_compras_updated_at BEFORE UPDATE ON obras_compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_obras_execucao_updated_at BEFORE UPDATE ON obras_execucao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_autos_updated_at BEFORE UPDATE ON autos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: CALCULAR ORCAMENTO LINHA TOTAL
-- ============================================

CREATE OR REPLACE FUNCTION calc_orcamento_linha_total()
RETURNS TRIGGER AS $$
DECLARE
  v_quantidade DECIMAL(15,4);
BEGIN
  SELECT quantidade INTO v_quantidade FROM mqt_linhas WHERE id = NEW.mqt_linha_id;
  NEW.preco_custo_total := COALESCE(v_quantidade, 0) * NEW.preco_custo_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_orcamento_linha_total_trigger
  BEFORE INSERT OR UPDATE ON orcamento_linhas
  FOR EACH ROW EXECUTE FUNCTION calc_orcamento_linha_total();

-- ============================================
-- TRIGGER: CALCULAR POP LINHA TOTAIS
-- ============================================

CREATE OR REPLACE FUNCTION calc_pop_linha_totais()
RETURNS TRIGGER AS $$
DECLARE
  v_quantidade DECIMAL(15,4);
  v_preco_custo_unitario DECIMAL(15,4);
BEGIN
  SELECT ml.quantidade, ol.preco_custo_unitario
  INTO v_quantidade, v_preco_custo_unitario
  FROM orcamento_linhas ol
  JOIN mqt_linhas ml ON ml.id = ol.mqt_linha_id
  WHERE ol.id = NEW.orcamento_linha_id;

  NEW.preco_cliente_unitario := COALESCE(v_preco_custo_unitario, 0) * NEW.margem_k;
  NEW.preco_cliente_total := COALESCE(v_quantidade, 0) * NEW.preco_cliente_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_pop_linha_totais_trigger
  BEFORE INSERT OR UPDATE ON pop_linhas
  FOR EACH ROW EXECUTE FUNCTION calc_pop_linha_totais();

-- ============================================
-- TRIGGER: CALCULAR ADENDA LINHA TOTAIS
-- ============================================

CREATE OR REPLACE FUNCTION calc_adenda_linha_totais()
RETURNS TRIGGER AS $$
BEGIN
  NEW.preco_custo_total := NEW.quantidade * NEW.preco_custo_unitario;
  NEW.preco_cliente_unitario := NEW.preco_custo_unitario * NEW.margem_k;
  NEW.preco_cliente_total := NEW.quantidade * NEW.preco_cliente_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_adenda_linha_totais_trigger
  BEFORE INSERT OR UPDATE ON adenda_linhas
  FOR EACH ROW EXECUTE FUNCTION calc_adenda_linha_totais();

-- ============================================
-- VIEW: TRACKING POR OBRA
-- ============================================

CREATE OR REPLACE VIEW v_tracking_obra AS
SELECT
  o.id as obra_id,
  o.nome as obra_nome,
  p.id as pop_id,
  COALESCE(ml.capitulo, al.capitulo) as capitulo,
  COALESCE(ml.descricao, al.descricao) as descricao,
  COALESCE(pl.preco_cliente_total, al.preco_cliente_total) as valor_contratado,
  COALESCE(e.quantidade_executada, 0) as qtd_executada,
  COALESCE(e.percentagem_execucao, 0) as perc_execucao
FROM obras o
LEFT JOIN pops p ON p.obra_id = o.id AND p.estado = 'contratada'
LEFT JOIN pop_linhas pl ON pl.pop_id = p.id
LEFT JOIN orcamento_linhas ol ON ol.id = pl.orcamento_linha_id
LEFT JOIN mqt_linhas ml ON ml.id = ol.mqt_linha_id
LEFT JOIN adendas a ON a.obra_id = o.id AND a.estado = 'contratada'
LEFT JOIN adenda_linhas al ON al.adenda_id = a.id
LEFT JOIN obras_execucao e ON e.pop_linha_id = pl.id OR e.adenda_linha_id = al.id;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE mqt_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqt_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE adendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE adenda_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE autos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_linhas ENABLE ROW LEVEL SECURITY;

-- Permitir tudo (ajustar conforme necessário para admin/gestor)
CREATE POLICY "allow_all_mqt_versoes" ON mqt_versoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_mqt_linhas" ON mqt_linhas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orcamentos_internos" ON orcamentos_internos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orcamento_linhas" ON orcamento_linhas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pops" ON pops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pop_linhas" ON pop_linhas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_adendas" ON adendas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_adenda_linhas" ON adenda_linhas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_obras_compras" ON obras_compras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_obras_execucao" ON obras_execucao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_autos" ON autos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_auto_linhas" ON auto_linhas FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DADOS DE EXEMPLO
-- ============================================

-- Será inserido após a migração via script separado
