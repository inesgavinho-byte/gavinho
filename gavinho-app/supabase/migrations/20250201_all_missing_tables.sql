-- =====================================================
-- MIGRAÇÃO COMPLETA: Todas as tabelas em falta
-- Gavinho Platform - Criado em 2025-02-01
-- =====================================================

-- =====================================================
-- 1. PROJETO - Tabelas relacionadas
-- =====================================================

-- projeto_pagamentos
CREATE TABLE IF NOT EXISTS projeto_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  prestacao_numero INTEGER,
  descricao TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendente', -- pendente, pago, atrasado, cancelado
  data_limite DATE,
  data_pagamento DATE,
  metodo_pagamento TEXT,
  comprovativo_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_projeto_id ON projeto_pagamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_estado ON projeto_pagamentos(estado);

-- projeto_servicos
CREATE TABLE IF NOT EXISTS projeto_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  fase TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_servicos_projeto_id ON projeto_servicos(projeto_id);

-- projeto_equipa
CREATE TABLE IF NOT EXISTS projeto_equipa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  utilizador_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  funcao TEXT,
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_equipa_projeto_id ON projeto_equipa(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_equipa_utilizador_id ON projeto_equipa(utilizador_id);

-- projeto_intervenientes
CREATE TABLE IF NOT EXISTS projeto_intervenientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- Dono de Obra, Arquitecto, Engenheiro, etc.
  entidade TEXT,
  contacto_geral TEXT,
  responsavel_nome TEXT,
  responsavel_email TEXT,
  responsavel_secundario_nome TEXT,
  responsavel_secundario_email TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_intervenientes_projeto_id ON projeto_intervenientes(projeto_id);

-- projeto_fases_contratuais
CREATE TABLE IF NOT EXISTS projeto_fases_contratuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  numero TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  estado TEXT DEFAULT 'pendente', -- pendente, em_curso, concluido
  avaliacao INTEGER, -- 1-5 stars
  data_inicio DATE,
  data_fim DATE,
  valor DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_fases_contratuais_projeto_id ON projeto_fases_contratuais(projeto_id);

-- faturas
CREATE TABLE IF NOT EXISTS faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  codigo TEXT,
  numero TEXT,
  descricao TEXT,
  referencia_cliente TEXT,
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  valor_base DECIMAL(12,2) DEFAULT 0,
  iva_percentagem DECIMAL(5,2) DEFAULT 23,
  iva_valor DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'emitida', -- rascunho, emitida, paga, anulada
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faturas_projeto_id ON faturas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_faturas_estado ON faturas(estado);

-- =====================================================
-- 2. ORÇAMENTOS
-- =====================================================

-- orcamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  projeto_codigo TEXT,
  projeto_nome TEXT,
  cliente_nome TEXT,
  titulo TEXT,
  versao INTEGER DEFAULT 1,
  status TEXT DEFAULT 'rascunho', -- rascunho, enviado, aprovado, rejeitado
  margem_percentagem DECIMAL(5,2) DEFAULT 28,
  validade DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  desconto_percentagem DECIMAL(5,2) DEFAULT 0,
  desconto_valor DECIMAL(12,2) DEFAULT 0,
  total_sem_iva DECIMAL(12,2) DEFAULT 0,
  iva_percentagem DECIMAL(5,2) DEFAULT 23,
  iva_valor DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notas_internas TEXT,
  notas_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_projeto_id ON orcamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);

-- orcamento_capitulos
CREATE TABLE IF NOT EXISTS orcamento_capitulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  valor DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_capitulos_orcamento_id ON orcamento_capitulos(orcamento_id);

-- orcamento_itens
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capitulo_id UUID NOT NULL REFERENCES orcamento_capitulos(id) ON DELETE CASCADE,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'un',
  quantidade DECIMAL(10,2) DEFAULT 1,
  custo_unitario DECIMAL(12,2) DEFAULT 0,
  custo_total DECIMAL(12,2) DEFAULT 0,
  margem_percentagem DECIMAL(5,2) DEFAULT 28,
  preco_unitario DECIMAL(12,2) DEFAULT 0,
  preco_total DECIMAL(12,2) DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_capitulo_id ON orcamento_itens(capitulo_id);

-- =====================================================
-- 3. OBRAS
-- =====================================================

-- obra_autos (autos de medição)
CREATE TABLE IF NOT EXISTS obra_autos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero INTEGER,
  mes_referencia DATE,
  status TEXT DEFAULT 'rascunho', -- rascunho, submetido, aprovado
  is_final BOOLEAN DEFAULT FALSE,
  notas TEXT,
  valor_acumulado_anterior DECIMAL(12,2) DEFAULT 0,
  valor_acumulado_atual DECIMAL(12,2) DEFAULT 0,
  valor_periodo DECIMAL(12,2) DEFAULT 0,
  deducao_adiantamento DECIMAL(12,2) DEFAULT 0,
  retencao_garantia DECIMAL(12,2) DEFAULT 0,
  valor_a_faturar DECIMAL(12,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_autos_obra_id ON obra_autos(obra_id);

-- obra_auto_items
CREATE TABLE IF NOT EXISTS obra_auto_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_id UUID NOT NULL REFERENCES obra_autos(id) ON DELETE CASCADE,
  orcamento_item_id UUID,
  percentagem_anterior DECIMAL(5,2) DEFAULT 0,
  percentagem_atual DECIMAL(5,2) DEFAULT 0,
  quantidade_medida DECIMAL(10,2) DEFAULT 0,
  valor_acumulado_anterior DECIMAL(12,2) DEFAULT 0,
  valor_acumulado_atual DECIMAL(12,2) DEFAULT 0,
  valor_periodo DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_auto_items_auto_id ON obra_auto_items(auto_id);

-- obra_orcamento_items
CREATE TABLE IF NOT EXISTS obra_orcamento_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  capitulo TEXT,
  codigo TEXT,
  descricao TEXT,
  unidade TEXT DEFAULT 'un',
  quantidade_total DECIMAL(10,2) DEFAULT 0,
  quantidade_executada DECIMAL(10,2) DEFAULT 0,
  percentagem_execucao DECIMAL(5,2) DEFAULT 0,
  preco_venda_unit DECIMAL(12,2) DEFAULT 0,
  valor_total DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_orcamento_items_obra_id ON obra_orcamento_items(obra_id);

-- obra_diario
CREATE TABLE IF NOT EXISTS obra_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data DATE DEFAULT CURRENT_DATE,
  tipo TEXT DEFAULT 'geral', -- geral, mao_obra, materiais, equipamentos, ocorrencias
  descricao TEXT,
  condicoes_meteorologicas TEXT,
  temperatura_min DECIMAL(4,1),
  temperatura_max DECIMAL(4,1),
  mao_obra_propria INTEGER DEFAULT 0,
  mao_obra_subempreiteiro INTEGER DEFAULT 0,
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_diario_obra_id ON obra_diario(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_diario_data ON obra_diario(data);

-- obra_especialidades
CREATE TABLE IF NOT EXISTS obra_especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  fornecedor_id UUID,
  fornecedor_nome TEXT,
  valor_adjudicado DECIMAL(12,2),
  valor_executado DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  data_inicio DATE,
  data_fim DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_especialidades_obra_id ON obra_especialidades(obra_id);

-- obra_items (lista de trabalhos)
CREATE TABLE IF NOT EXISTS obra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  especialidade_id UUID REFERENCES obra_especialidades(id) ON DELETE SET NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'un',
  quantidade DECIMAL(10,2) DEFAULT 1,
  preco_unitario DECIMAL(12,2) DEFAULT 0,
  preco_total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_items_obra_id ON obra_items(obra_id);

-- obra_mensagens
CREATE TABLE IF NOT EXISTS obra_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  autor_id UUID,
  autor_nome TEXT,
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'mensagem', -- mensagem, alerta, notificacao
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_mensagens_obra_id ON obra_mensagens(obra_id);

-- obra_propostas
CREATE TABLE IF NOT EXISTS obra_propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fornecedor_id UUID,
  fornecedor_nome TEXT,
  especialidade TEXT,
  descricao TEXT,
  valor DECIMAL(12,2),
  prazo_execucao INTEGER, -- dias
  validade DATE,
  status TEXT DEFAULT 'pendente', -- pendente, aceite, rejeitada
  documento_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_propostas_obra_id ON obra_propostas(obra_id);

-- =====================================================
-- 4. CALENDÁRIO E EQUIPA
-- =====================================================

-- calendario_eventos
CREATE TABLE IF NOT EXISTS calendario_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'reuniao', -- reuniao, entrega, visita, deadline, outro
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  dia_inteiro BOOLEAN DEFAULT FALSE,
  local TEXT,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  cor TEXT,
  recorrencia TEXT, -- null, diario, semanal, mensal
  criado_por UUID,
  participantes JSONB DEFAULT '[]',
  notificar BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendario_eventos_data ON calendario_eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_calendario_eventos_projeto ON calendario_eventos(projeto_id);

-- eventos (eventos gerais/feriados)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  tipo TEXT DEFAULT 'feriado', -- feriado, evento_empresa, outro
  recorrente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);

-- ausencias
CREATE TABLE IF NOT EXISTS ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID REFERENCES utilizadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- ferias, doenca, outro
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_uteis INTEGER,
  motivo TEXT,
  estado TEXT DEFAULT 'pendente', -- pendente, aprovada, rejeitada
  aprovado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ausencias_utilizador ON ausencias(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_datas ON ausencias(data_inicio, data_fim);

-- trabalhadores (para obras)
CREATE TABLE IF NOT EXISTS trabalhadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  especialidade TEXT,
  empresa TEXT,
  contacto TEXT,
  email TEXT,
  documento_id TEXT,
  taxa_hora DECIMAL(8,2),
  ativo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- requisicoes_materiais
CREATE TABLE IF NOT EXISTS requisicoes_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10,2) DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  urgencia TEXT DEFAULT 'normal', -- baixa, normal, alta, urgente
  estado TEXT DEFAULT 'pendente', -- pendente, aprovada, encomendada, entregue, cancelada
  data_necessaria DATE,
  fornecedor_sugerido TEXT,
  valor_estimado DECIMAL(12,2),
  solicitado_por UUID,
  solicitado_por_nome TEXT,
  aprovado_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisicoes_obra ON requisicoes_materiais(obra_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_estado ON requisicoes_materiais(estado);

-- =====================================================
-- 5. ENCERRAMENTOS
-- =====================================================

-- encerramentos_empresa (feriados/pontes da empresa)
CREATE TABLE IF NOT EXISTS encerramentos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  tipo TEXT DEFAULT 'encerramento', -- encerramento, ponte, feriado
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. FORNECEDORES
-- =====================================================

-- fornecedor_especialidades
CREATE TABLE IF NOT EXISTS fornecedor_especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE CASCADE,
  especialidade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedor_especialidades_fornecedor ON fornecedor_especialidades(fornecedor_id);

-- =====================================================
-- ENABLE RLS FOR ALL TABLES
-- =====================================================

ALTER TABLE projeto_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_equipa ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_intervenientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_fases_contratuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_capitulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_autos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_auto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_orcamento_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabalhadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE encerramentos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_especialidades ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (permissive for now)
-- =====================================================

-- Macro to create policies for a table
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'projeto_pagamentos', 'projeto_servicos', 'projeto_equipa',
    'projeto_intervenientes', 'projeto_fases_contratuais', 'faturas',
    'orcamentos', 'orcamento_capitulos', 'orcamento_itens',
    'obra_autos', 'obra_auto_items', 'obra_orcamento_items',
    'obra_diario', 'obra_especialidades', 'obra_items',
    'obra_mensagens', 'obra_propostas', 'calendario_eventos',
    'eventos', 'ausencias', 'trabalhadores', 'requisicoes_materiais',
    'encerramentos_empresa', 'fornecedor_especialidades'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all select on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow all select on %I" ON %I FOR SELECT USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Allow all insert on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow all insert on %I" ON %I FOR INSERT WITH CHECK (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Allow all update on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow all update on %I" ON %I FOR UPDATE USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Allow all delete on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow all delete on %I" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
  tables_with_updated_at TEXT[] := ARRAY[
    'projeto_pagamentos', 'faturas', 'orcamentos',
    'obra_autos', 'calendario_eventos'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_updated_at
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_updated_at_%I ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trigger_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;
