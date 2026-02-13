-- ══════════════════════════════════════════════════════════════════
-- PAINEL FINANCEIRO TEMPO REAL — Phase 1 Migration
-- Tables: facturacao_cliente, extras, alertas_financeiros, projecoes_financeiras
-- Views: v_financeiro_capitulo, v_financeiro_portfolio
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────
-- 1. FACTURAÇÃO AO CLIENTE (milestones de pagamento)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturacao_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Milestone
  descricao TEXT NOT NULL,
  percentagem_contrato DECIMAL(5,2),
  valor DECIMAL(12,2) NOT NULL,

  -- Estado
  estado TEXT DEFAULT 'prevista' CHECK (
    estado IN ('prevista', 'facturada', 'paga', 'em_atraso')
  ),

  -- Datas
  data_prevista DATE,
  data_facturada DATE,
  data_vencimento DATE,
  data_recebimento DATE,

  -- Documento
  numero_factura TEXT,
  documento_url TEXT,

  condicoes_pagamento_dias INTEGER DEFAULT 30
);

CREATE INDEX IF NOT EXISTS idx_facturacao_cliente_projeto
  ON facturacao_cliente(projeto_id, estado);

ALTER TABLE facturacao_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facturacao_cliente_all"
  ON facturacao_cliente FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────
-- 2. EXTRAS (alterações ao contrato)
-- ──────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS extras_seq START 1;

CREATE TABLE IF NOT EXISTS extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  codigo TEXT UNIQUE DEFAULT 'EXT-' || lpad(nextval('extras_seq')::text, 3, '0'),

  -- Descrição
  titulo TEXT NOT NULL,
  descricao TEXT,
  capitulo TEXT,

  -- Valores
  custo_gavinho DECIMAL(12,2) NOT NULL,
  margem_percentagem DECIMAL(5,2) DEFAULT 25.0,
  preco_cliente DECIMAL(12,2) NOT NULL,

  -- Estado
  estado TEXT DEFAULT 'pendente' CHECK (
    estado IN ('pendente', 'aprovado', 'rejeitado', 'absorvido')
  ),
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,

  -- Origem
  decisao_id UUID REFERENCES decisoes(id) ON DELETE SET NULL,
  reuniao_id UUID REFERENCES projeto_atas(id) ON DELETE SET NULL,
  email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,

  -- Facturação
  facturado BOOLEAN DEFAULT false,
  factura_cliente_id UUID REFERENCES facturacao_cliente(id) ON DELETE SET NULL,

  criado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_extras_projeto ON extras(projeto_id, estado);

ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extras_all"
  ON extras FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────
-- 3. ALERTAS FINANCEIROS
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Tipo
  tipo TEXT NOT NULL CHECK (
    tipo IN ('capitulo_85', 'capitulo_95', 'capitulo_100',
             'factura_excede_po', 'factura_sem_po',
             'margem_erosao', 'margem_critica',
             'po_sem_factura', 'factura_vencida',
             'desvio_projectado', 'extra_pendente')
  ),
  gravidade TEXT NOT NULL CHECK (
    gravidade IN ('info', 'atencao', 'critico', 'urgente')
  ),

  -- Conteúdo
  titulo TEXT NOT NULL,
  descricao TEXT,
  analise_ia TEXT,
  sugestoes JSONB,

  -- Referências
  capitulo TEXT,
  po_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  factura_id TEXT REFERENCES procurement_facturas(id) ON DELETE SET NULL,
  extra_id UUID REFERENCES extras(id) ON DELETE SET NULL,

  -- Valores
  valor_referencia DECIMAL(12,2),
  valor_actual DECIMAL(12,2),
  desvio_percentual DECIMAL(5,2),

  -- Estado
  estado TEXT DEFAULT 'activo' CHECK (
    estado IN ('activo', 'visto', 'resolvido', 'ignorado')
  ),
  visto_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  visto_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMPTZ,
  resolucao_nota TEXT
);

CREATE INDEX IF NOT EXISTS idx_alertas_fin_projeto
  ON alertas_financeiros(projeto_id, estado) WHERE estado = 'activo';

ALTER TABLE alertas_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_fin_all"
  ON alertas_financeiros FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────
-- 4. PROJECÇÕES FINANCEIRAS (snapshot periódico)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projecoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  data_projecao DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Valores globais
  orcamento_original DECIMAL(12,2),
  orcamento_revisto DECIMAL(12,2),
  comprometido DECIMAL(12,2),
  facturado DECIMAL(12,2),
  pago DECIMAL(12,2),

  -- Projecção
  etc DECIMAL(12,2),
  eac DECIMAL(12,2),
  desvio_projectado DECIMAL(12,2),
  margem_projectada_percentagem DECIMAL(5,2),

  -- Por capítulo
  detalhe_capitulos JSONB,

  -- Contexto
  modelo_calculo TEXT DEFAULT 'hybrid',
  notas TEXT,

  UNIQUE(projeto_id, data_projecao)
);

CREATE INDEX IF NOT EXISTS idx_projecoes_projeto
  ON projecoes_financeiras(projeto_id, data_projecao DESC);

ALTER TABLE projecoes_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projecoes_all"
  ON projecoes_financeiras FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────
-- 5. VIEW: Financeiro por capítulo
-- Aggregates PO + factura data per chapter
-- ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_financeiro_capitulo AS
SELECT
  p.id as projeto_id,
  oc.nome as capitulo,
  oc.valor as orcamento_cliente,
  ROUND(oc.valor * (1 - COALESCE(o.margem_percentagem, 25) / 100), 2) as orcamento_custo,
  COALESCE(o.margem_percentagem, 25) as margem_percentagem,

  COALESCE(po_agg.total_comprometido, 0) as comprometido,
  COALESCE(fat_agg.total_facturado, 0) as facturado,
  COALESCE(fat_agg.total_pago, 0) as pago,

  ROUND(
    COALESCE(po_agg.total_comprometido, 0) /
    NULLIF(ROUND(oc.valor * (1 - COALESCE(o.margem_percentagem, 25) / 100), 2), 0) * 100,
    1
  ) as percentagem_comprometido,

  ROUND(oc.valor * (1 - COALESCE(o.margem_percentagem, 25) / 100), 2)
    - COALESCE(po_agg.total_comprometido, 0) as margem_restante,

  CASE
    WHEN COALESCE(po_agg.total_comprometido, 0) /
         NULLIF(ROUND(oc.valor * (1 - COALESCE(o.margem_percentagem, 25) / 100), 2), 0) >= 0.95
      THEN 'critico'
    WHEN COALESCE(po_agg.total_comprometido, 0) /
         NULLIF(ROUND(oc.valor * (1 - COALESCE(o.margem_percentagem, 25) / 100), 2), 0) >= 0.85
      THEN 'atencao'
    WHEN COALESCE(po_agg.total_comprometido, 0) = 0
      THEN 'nao_iniciado'
    ELSE 'ok'
  END as estado_health,

  COALESCE(po_agg.num_pos, 0) as num_pos,
  COALESCE(fat_agg.num_facturas, 0) as num_facturas

FROM projetos p
JOIN orcamentos o ON o.projeto_id = p.id AND o.status = 'aprovado'
JOIN orcamento_capitulos oc ON oc.orcamento_id = o.id
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(po.total), 0) as total_comprometido,
    COUNT(*) as num_pos
  FROM purchase_orders po
  WHERE po.projeto_id = p.id
    AND po.capitulo_orcamento = oc.nome
    AND po.estado NOT IN ('cancelada', 'rascunho')
) po_agg ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(CASE WHEN pf.estado IN ('verificada', 'aprovada', 'em_pagamento', 'paga') THEN pf.total ELSE 0 END), 0) as total_facturado,
    COALESCE(SUM(CASE WHEN pf.estado = 'paga' THEN pf.total ELSE 0 END), 0) as total_pago,
    COUNT(*) FILTER (WHERE pf.estado IN ('verificada', 'aprovada', 'em_pagamento', 'paga')) as num_facturas
  FROM procurement_facturas pf
  JOIN purchase_orders po2 ON pf.po_id = po2.id
  WHERE po2.projeto_id = p.id
    AND po2.capitulo_orcamento = oc.nome
) fat_agg ON true;

-- ──────────────────────────────────────────────────
-- 6. VIEW: Portfolio multi-projecto (administração)
-- ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_financeiro_portfolio AS
SELECT
  p.id as projeto_id,
  p.codigo,
  p.nome,
  p.fase,

  COALESCE(SUM(vfc.orcamento_cliente), 0) as orcamento_total,
  COALESCE(SUM(vfc.comprometido), 0) as total_comprometido,
  COALESCE(SUM(vfc.facturado), 0) as total_facturado,
  COALESCE(SUM(vfc.pago), 0) as total_pago,

  ROUND(
    (COALESCE(SUM(vfc.orcamento_cliente), 0) - COALESCE(SUM(vfc.comprometido), 0)) /
    NULLIF(COALESCE(SUM(vfc.orcamento_cliente), 0), 0) * 100,
    1
  ) as margem_percentagem,

  COALESCE(ext_agg.total_extras, 0) as extras_aprovados,
  COALESCE(alert_agg.alertas_activos, 0) as alertas_activos

FROM projetos p
LEFT JOIN v_financeiro_capitulo vfc ON vfc.projeto_id = p.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(preco_cliente), 0) as total_extras
  FROM extras WHERE projeto_id = p.id AND estado = 'aprovado'
) ext_agg ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as alertas_activos
  FROM alertas_financeiros WHERE projeto_id = p.id AND estado = 'activo'
) alert_agg ON true
WHERE p.estado IN ('em_curso', 'em_projecto', 'em_construcao')
GROUP BY p.id, p.codigo, p.nome, p.fase, ext_agg.total_extras, alert_agg.alertas_activos;

-- ──────────────────────────────────────────────────
-- 7. UPDATED_AT TRIGGERS
-- ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facturacao_cliente_updated ON facturacao_cliente;
CREATE TRIGGER trg_facturacao_cliente_updated
  BEFORE UPDATE ON facturacao_cliente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_extras_updated ON extras;
CREATE TRIGGER trg_extras_updated
  BEFORE UPDATE ON extras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
