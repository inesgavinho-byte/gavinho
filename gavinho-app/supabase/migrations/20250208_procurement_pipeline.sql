-- ══════════════════════════════════════════════════════════════
-- GAVINHO Platform — Pipeline de Procurement Inteligente
-- Data: 2025-02-08
-- Descrição: Requisições, cotações, purchase orders, facturas,
--            preços de referência, scoring de fornecedores
-- ══════════════════════════════════════════════════════════════

-- Sequências para códigos legíveis
CREATE SEQUENCE IF NOT EXISTS req_seq START 1;
CREATE SEQUENCE IF NOT EXISTS cot_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE SEQUENCE IF NOT EXISTS fat_proc_seq START 1;

-- ══════════════════════════════════════════════════
-- 1. REQUISIÇÕES DE MATERIAL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS requisicoes (
  id TEXT PRIMARY KEY DEFAULT 'REQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('req_seq')::text, 4, '0'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  capitulo_orcamento TEXT,
  zona_obra TEXT,

  titulo TEXT NOT NULL,
  descricao TEXT,
  materiais_descricao TEXT[],
  quantidade_estimada DECIMAL(12,2),
  unidade TEXT,

  estado TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    estado IN ('rascunho', 'cotacao_pedida', 'cotacoes_recebidas',
               'em_comparacao', 'decisao_pendente', 'aprovada',
               'encomendada', 'entregue', 'facturada', 'concluida', 'cancelada')
  ),

  data_necessidade DATE,
  data_limite_cotacao DATE,
  urgencia TEXT DEFAULT 'normal' CHECK (urgencia IN ('baixa', 'normal', 'alta', 'critica')),

  cotacao_aprovada_id TEXT,
  aprovado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  justificacao_escolha TEXT,

  criado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  fonte TEXT DEFAULT 'manual',
  fonte_referencia TEXT
);

CREATE INDEX IF NOT EXISTS idx_req_projeto ON requisicoes(projeto_id, estado);
CREATE INDEX IF NOT EXISTS idx_req_obra ON requisicoes(obra_id, estado);
CREATE INDEX IF NOT EXISTS idx_req_estado ON requisicoes(estado);

ALTER TABLE requisicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_all" ON requisicoes FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 2. COTAÇÕES RECEBIDAS
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cotacoes (
  id TEXT PRIMARY KEY DEFAULT 'COT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('cot_seq')::text, 4, '0'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  requisicao_id TEXT REFERENCES requisicoes(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,

  referencia_fornecedor TEXT,
  data_proposta DATE,
  validade_dias INTEGER,
  condicoes_pagamento TEXT,
  prazo_entrega_dias INTEGER,
  prazo_entrega_texto TEXT,
  garantia_anos INTEGER,
  garantia_texto TEXT,

  subtotal DECIMAL(12,2),
  iva_percentagem DECIMAL(5,2) DEFAULT 23,
  iva_valor DECIMAL(12,2),
  total DECIMAL(12,2),
  moeda TEXT DEFAULT 'EUR',
  inclui_transporte BOOLEAN,
  custo_transporte DECIMAL(12,2),

  observacoes TEXT,
  exclusoes TEXT,

  ficheiro_original_url TEXT,
  ficheiro_tipo TEXT,

  confianca_extracao DECIMAL(5,4),
  dados_brutos_ia JSONB,
  revisto_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  revisto_em TIMESTAMPTZ,

  estado TEXT DEFAULT 'pendente' CHECK (
    estado IN ('pendente', 'revista', 'aprovada', 'rejeitada', 'expirada')
  )
);

CREATE INDEX IF NOT EXISTS idx_cot_requisicao ON cotacoes(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_cot_fornecedor ON cotacoes(fornecedor_id);

ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cot_all" ON cotacoes FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 3. LINHAS DE COTAÇÃO
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cotacao_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id TEXT REFERENCES cotacoes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,

  descricao TEXT NOT NULL,
  referencia_fabricante TEXT,
  marca TEXT,
  modelo TEXT,

  quantidade DECIMAL(12,3),
  unidade TEXT,

  preco_unitario DECIMAL(12,4),
  preco_total DECIMAL(12,2),
  desconto_percentagem DECIMAL(5,2),

  preco_referencia DECIMAL(12,4),
  desvio_percentual DECIMAL(8,2),
  preco_orcamento_gavinho DECIMAL(12,4),
  desvio_orcamento_percentual DECIMAL(8,2),

  notas TEXT,
  prazo_especifico_dias INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cl_cotacao ON cotacao_linhas(cotacao_id);

ALTER TABLE cotacao_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_all" ON cotacao_linhas FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 4. PURCHASE ORDERS
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('po_seq')::text, 4, '0'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  requisicao_id TEXT REFERENCES requisicoes(id) ON DELETE SET NULL,
  cotacao_id TEXT REFERENCES cotacoes(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  capitulo_orcamento TEXT,

  data_emissao DATE DEFAULT CURRENT_DATE,
  referencia_cotacao TEXT,

  subtotal DECIMAL(12,2) NOT NULL,
  iva_percentagem DECIMAL(5,2) DEFAULT 23,
  iva_valor DECIMAL(12,2),
  total DECIMAL(12,2) NOT NULL,
  condicoes_pagamento TEXT,

  prazo_entrega_dias INTEGER,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  local_entrega TEXT DEFAULT 'Obra',
  morada_entrega TEXT,

  estado TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    estado IN ('rascunho', 'aprovada', 'enviada', 'confirmada',
               'em_producao', 'expedida', 'entregue_parcial',
               'entregue', 'concluida', 'cancelada')
  ),

  aprovada_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  aprovada_em TIMESTAMPTZ,
  enviada_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  enviada_em TIMESTAMPTZ,

  confirmada_em TIMESTAMPTZ,
  confirmacao_email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,

  documento_url TEXT,

  valor_facturado DECIMAL(12,2) DEFAULT 0,
  valor_pago DECIMAL(12,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_projeto ON purchase_orders(projeto_id, estado);
CREATE INDEX IF NOT EXISTS idx_po_obra ON purchase_orders(obra_id, estado);
CREATE INDEX IF NOT EXISTS idx_po_fornecedor ON purchase_orders(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_po_estado ON purchase_orders(estado);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- Trigger: proteger PO aprovada contra alteração de valores
CREATE OR REPLACE FUNCTION proteger_po_aprovada()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IN ('aprovada', 'enviada', 'confirmada', 'em_producao', 'expedida', 'entregue', 'concluida')
     AND NEW.estado NOT IN ('cancelada')
     AND (NEW.subtotal != OLD.subtotal OR NEW.total != OLD.total) THEN
    RAISE EXCEPTION 'Não é possível alterar valores de uma PO aprovada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_po ON purchase_orders;
CREATE TRIGGER trg_proteger_po
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION proteger_po_aprovada();

-- ══════════════════════════════════════════════════
-- 5. LINHAS DA PURCHASE ORDER
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS po_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  cotacao_linha_id UUID REFERENCES cotacao_linhas(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL,

  descricao TEXT NOT NULL,
  referencia TEXT,
  quantidade DECIMAL(12,3),
  unidade TEXT,
  preco_unitario DECIMAL(12,4),
  preco_total DECIMAL(12,2),

  quantidade_entregue DECIMAL(12,3) DEFAULT 0,
  quantidade_facturada DECIMAL(12,3) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pol_po ON po_linhas(po_id);

ALTER TABLE po_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pol_all" ON po_linhas FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 6. FACTURAS DE PROCUREMENT
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS procurement_facturas (
  id TEXT PRIMARY KEY DEFAULT 'PFAT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('fat_proc_seq')::text, 4, '0'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  po_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,

  numero_fatura TEXT NOT NULL,
  data_emissao DATE,
  data_vencimento DATE,

  subtotal DECIMAL(12,2),
  iva_percentagem DECIMAL(5,2),
  iva_valor DECIMAL(12,2),
  total DECIMAL(12,2) NOT NULL,

  desvio_valor DECIMAL(12,2),
  desvio_percentual DECIMAL(8,2),
  motivo_desvio TEXT,

  estado TEXT DEFAULT 'pendente' CHECK (
    estado IN ('pendente', 'verificada', 'aprovada',
               'em_pagamento', 'paga', 'contestada')
  ),

  ficheiro_url TEXT,

  confianca_match DECIMAL(5,4),
  dados_brutos_ia JSONB
);

CREATE INDEX IF NOT EXISTS idx_pfat_po ON procurement_facturas(po_id);
CREATE INDEX IF NOT EXISTS idx_pfat_fornecedor ON procurement_facturas(fornecedor_id);

ALTER TABLE procurement_facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pfat_all" ON procurement_facturas FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 7. PREÇOS DE REFERÊNCIA
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS precos_referencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  descricao_normalizada TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  unidade TEXT NOT NULL,

  preco_medio DECIMAL(12,4),
  preco_minimo DECIMAL(12,4),
  preco_maximo DECIMAL(12,4),
  num_cotacoes INTEGER DEFAULT 0,
  ultima_cotacao TIMESTAMPTZ,

  variacao_6_meses DECIMAL(8,2),
  tendencia TEXT CHECK (tendencia IN ('subir', 'estavel', 'descer')),

  UNIQUE(descricao_normalizada, unidade)
);

CREATE INDEX IF NOT EXISTS idx_preco_categoria ON precos_referencia(categoria, subcategoria);

ALTER TABLE precos_referencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_all" ON precos_referencia FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 8. SCORE DO FORNECEDOR (histórico automático)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fornecedor_score_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,

  score_preco INTEGER,
  score_prazo INTEGER,
  score_qualidade INTEGER,
  score_comunicacao INTEGER,
  score_global INTEGER,

  entregas_total INTEGER DEFAULT 0,
  entregas_atrasadas INTEGER DEFAULT 0,
  ncs_total INTEGER DEFAULT 0,
  tempo_medio_resposta_horas DECIMAL(8,1),
  desvio_medio_preco_percentual DECIMAL(8,2),

  periodo_inicio DATE,
  periodo_fim DATE
);

CREATE INDEX IF NOT EXISTS idx_fsh_fornecedor ON fornecedor_score_historico(fornecedor_id);

ALTER TABLE fornecedor_score_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fsh_all" ON fornecedor_score_historico FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 9. TRIGGERS UPDATED_AT
-- ══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_req_updated ON requisicoes;
CREATE TRIGGER trg_req_updated BEFORE UPDATE ON requisicoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_po_updated ON purchase_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pr_updated ON precos_referencia;
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON precos_referencia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════
-- 10. VIEWS AGREGADAS
-- ══════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_procurement_projeto AS
SELECT
  p.id as projeto_id,
  p.codigo as projeto_codigo,
  p.nome as projeto_nome,
  COUNT(DISTINCT r.id) as total_requisicoes,
  COUNT(DISTINCT r.id) FILTER (WHERE r.estado IN ('rascunho', 'cotacao_pedida', 'cotacoes_recebidas', 'em_comparacao', 'decisao_pendente')) as requisicoes_abertas,
  COUNT(DISTINCT po.id) as total_pos,
  COUNT(DISTINCT po.id) FILTER (WHERE po.estado NOT IN ('concluida', 'cancelada', 'rascunho')) as pos_activas,
  COALESCE(SUM(po.total) FILTER (WHERE po.estado NOT IN ('cancelada', 'rascunho')), 0) as valor_comprometido,
  COALESCE(SUM(pf.total) FILTER (WHERE pf.estado = 'paga'), 0) as valor_pago,
  COALESCE(SUM(po.total) FILTER (WHERE po.estado NOT IN ('cancelada', 'rascunho')), 0) -
    COALESCE(SUM(pf.total) FILTER (WHERE pf.estado = 'paga'), 0) as valor_pendente
FROM projetos p
LEFT JOIN requisicoes r ON r.projeto_id = p.id
LEFT JOIN purchase_orders po ON po.projeto_id = p.id
LEFT JOIN procurement_facturas pf ON pf.projeto_id = p.id
GROUP BY p.id, p.codigo, p.nome;

CREATE OR REPLACE VIEW v_fornecedor_scorecard AS
SELECT
  f.id,
  f.nome,
  COALESCE(AVG(fsh.score_global), 0)::INTEGER as score_automatico,
  COUNT(DISTINCT po.id) as total_encomendas,
  COALESCE(AVG(fsh.score_preco), 0)::INTEGER as score_preco,
  COALESCE(AVG(fsh.score_prazo), 0)::INTEGER as score_prazo,
  COALESCE(AVG(fsh.score_qualidade), 0)::INTEGER as score_qualidade,
  COALESCE(AVG(fsh.score_comunicacao), 0)::INTEGER as score_comunicacao,
  COALESCE(SUM(fsh.ncs_total), 0)::INTEGER as total_ncs,
  COALESCE(SUM(po.total) FILTER (WHERE po.estado NOT IN ('cancelada', 'rascunho')), 0) as valor_total_pos
FROM fornecedores f
LEFT JOIN fornecedor_score_historico fsh ON fsh.fornecedor_id = f.id
LEFT JOIN purchase_orders po ON po.fornecedor_id = f.id
GROUP BY f.id, f.nome;

-- ══════════════════════════════════════════════════
-- COMENTÁRIOS
-- ══════════════════════════════════════════════════

COMMENT ON TABLE requisicoes IS 'Requisições de material/serviço — início do ciclo de procurement';
COMMENT ON TABLE cotacoes IS 'Cotações recebidas de fornecedores, com extracção IA';
COMMENT ON TABLE cotacao_linhas IS 'Linhas individuais de cada cotação com preços unitários';
COMMENT ON TABLE purchase_orders IS 'Notas de encomenda geradas a partir de cotações aprovadas';
COMMENT ON TABLE po_linhas IS 'Linhas da purchase order com rastreio de entrega';
COMMENT ON TABLE procurement_facturas IS 'Facturas associadas a purchase orders';
COMMENT ON TABLE precos_referencia IS 'Base de preços de referência construída automaticamente';
COMMENT ON TABLE fornecedor_score_historico IS 'Score automático de fornecedores por projecto';
