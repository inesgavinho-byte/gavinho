-- =====================================================
-- MIGRAÇÃO: Fornecedores + G.A.R.V.I.S. Procurement
-- Gavinho Platform - Fevereiro 2025
-- Tabelas base + inteligência + procurement
-- CORRIGIDO: Removido precos_referencia (usa versão de procurement_pipeline)
--            Renomeado orcamento_linhas → orcamento_recebido_linhas (conflito com obras_module_v2)
-- =====================================================

-- ============================================
-- FASE 1: Expandir fornecedores existente
-- ============================================

ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS nome_fiscal TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS morada TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS localidade TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Portugal';
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS prazo_pagamento INTEGER DEFAULT 30;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS desconto_acordado DECIMAL(5,2) DEFAULT 0;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS lead_time_medio INTEGER;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS valor_minimo_encomenda DECIMAL(10,2);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS is_preferencial BOOLEAN DEFAULT FALSE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- ============================================
-- FASE 1: Contactos múltiplos
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedor_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  is_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forn_contactos ON fornecedor_contactos(fornecedor_id);

-- ============================================
-- FASE 1: Certificações
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedor_certificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  numero TEXT,
  data_emissao DATE,
  data_validade DATE,
  documento_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forn_cert_validade ON fornecedor_certificacoes(data_validade);

-- ============================================
-- FASE 2: Avaliações
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedor_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  rating_qualidade INTEGER CHECK (rating_qualidade BETWEEN 1 AND 5),
  rating_prazo INTEGER CHECK (rating_prazo BETWEEN 1 AND 5),
  rating_preco INTEGER CHECK (rating_preco BETWEEN 1 AND 5),
  rating_comunicacao INTEGER CHECK (rating_comunicacao BETWEEN 1 AND 5),
  comentario TEXT,
  avaliador_id UUID REFERENCES utilizadores(id),
  data_avaliacao DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forn_avaliacoes ON fornecedor_avaliacoes(fornecedor_id);

-- ============================================
-- FASE 2: Histórico de fornecimentos
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedor_fornecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  especialidade TEXT,
  valor_total DECIMAL(12,2),
  data_inicio DATE,
  data_conclusao DATE,
  status TEXT DEFAULT 'em_curso' CHECK (status IN ('em_curso', 'concluido', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forn_fornecimentos ON fornecedor_fornecimentos(fornecedor_id);

-- ============================================
-- FASE 3: Perfis de inteligência
-- ============================================

CREATE TABLE IF NOT EXISTS projeto_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE UNIQUE,
  segmento TEXT CHECK (segmento IN ('ultra_luxo', 'luxo', 'standard')),
  estilo TEXT CHECK (estilo IN ('contemporaneo', 'classico', 'misto', 'minimalista')),
  prioridade_1 TEXT CHECK (prioridade_1 IN ('qualidade', 'prazo', 'preco')),
  prioridade_2 TEXT CHECK (prioridade_2 IN ('qualidade', 'prazo', 'preco')),
  prioridade_3 TEXT CHECK (prioridade_3 IN ('qualidade', 'prazo', 'preco')),
  restricoes JSONB DEFAULT '{}',
  orcamento_por_capitulo JSONB DEFAULT '{}',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedor_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE UNIQUE,
  segmento_habitual TEXT[] DEFAULT '{}',
  pontos_fortes TEXT[] DEFAULT '{}',
  capacidade_mensal DECIMAL(12,2),
  materiais_especialidade TEXT[] DEFAULT '{}',
  zona_atuacao TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FASE 3: Deal Rooms
-- ============================================

CREATE TABLE IF NOT EXISTS deal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),
  titulo TEXT NOT NULL,
  especialidade TEXT,
  descricao TEXT,
  especificacoes JSONB,
  orcamento_disponivel DECIMAL(12,2),
  prazo_necessario DATE,
  status TEXT DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_analise', 'negociacao', 'decidido', 'cancelado')),
  fornecedor_selecionado_id UUID REFERENCES fornecedores(id),
  justificacao_decisao TEXT,
  recomendacao_ia JSONB,
  criado_por UUID REFERENCES utilizadores(id),
  decidido_por UUID REFERENCES utilizadores(id),
  data_decisao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_room_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  status TEXT DEFAULT 'convidado'
    CHECK (status IN ('convidado', 'contactado', 'orcamento_recebido', 'rejeitado')),
  data_convite TIMESTAMPTZ DEFAULT NOW(),
  data_orcamento TIMESTAMPTZ,
  notas TEXT,
  UNIQUE(deal_room_id, fornecedor_id)
);

-- ============================================
-- FASE 3: Orçamentos recebidos (de fornecedores)
-- ============================================

CREATE TABLE IF NOT EXISTS orcamentos_recebidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),
  deal_room_id UUID REFERENCES deal_rooms(id),
  referencia_fornecedor TEXT,
  data_rececao DATE DEFAULT CURRENT_DATE,
  data_validade DATE,
  valor_total DECIMAL(12,2),
  moeda TEXT DEFAULT 'EUR',
  ficheiro_url TEXT,
  ficheiro_extraido JSONB,
  status TEXT DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado', 'expirado')),
  analise_ia JSONB,
  notas TEXT,
  aprovado_por UUID REFERENCES utilizadores(id),
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RENOMEADO: orcamento_linhas → orcamento_recebido_linhas
-- (evita conflito com orcamento_linhas de obras_module_v2 que referencia orcamentos_internos)
CREATE TABLE IF NOT EXISTS orcamento_recebido_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos_recebidos(id) ON DELETE CASCADE,
  linha_numero INTEGER,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(12,3),
  unidade TEXT,
  preco_unitario DECIMAL(12,2),
  preco_total DECIMAL(12,2),
  referencia_produto TEXT,
  notas TEXT,
  preco_referencia DECIMAL(12,2),
  desvio_percentual DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTA: precos_referencia REMOVIDO daqui
-- Usar a versão mais avançada em 20250208_procurement_pipeline.sql
-- (tem trend tracking, UNIQUE constraint, precisão DECIMAL(12,4))
-- ============================================

-- ============================================
-- FASE 4: Alertas inteligentes
-- ============================================

CREATE TABLE IF NOT EXISTS alertas_garvis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('critico', 'importante', 'normal', 'info')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  entidade_tipo TEXT,
  entidade_id UUID,
  acao_sugerida TEXT,
  acao_label TEXT,
  destinatario_id UUID REFERENCES utilizadores(id),
  lido BOOLEAN DEFAULT FALSE,
  arquivado BOOLEAN DEFAULT FALSE,
  data_leitura TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_destinatario ON alertas_garvis(destinatario_id, lido, arquivado);
CREATE INDEX IF NOT EXISTS idx_alertas_entidade ON alertas_garvis(entidade_tipo, entidade_id);

-- ============================================
-- FASE 4: Matching scores (cache)
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedor_projeto_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  especialidade TEXT,
  score_total DECIMAL(5,2),
  score_breakdown JSONB DEFAULT '{}',
  justificacao JSONB,
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fornecedor_id, projeto_id, especialidade)
);

-- ============================================
-- RLS - Todas as novas tabelas
-- ============================================

ALTER TABLE fornecedor_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_certificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_fornecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_recebidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_recebido_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_garvis ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedor_projeto_scores ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para authenticated (drop first to allow re-run)
DROP POLICY IF EXISTS "all_fornecedor_contactos" ON fornecedor_contactos;
CREATE POLICY "all_fornecedor_contactos" ON fornecedor_contactos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_certificacoes" ON fornecedor_certificacoes;
CREATE POLICY "all_fornecedor_certificacoes" ON fornecedor_certificacoes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_avaliacoes" ON fornecedor_avaliacoes;
CREATE POLICY "all_fornecedor_avaliacoes" ON fornecedor_avaliacoes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_fornecimentos" ON fornecedor_fornecimentos;
CREATE POLICY "all_fornecedor_fornecimentos" ON fornecedor_fornecimentos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_projeto_perfil" ON projeto_perfil;
CREATE POLICY "all_projeto_perfil" ON projeto_perfil FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_perfil" ON fornecedor_perfil;
CREATE POLICY "all_fornecedor_perfil" ON fornecedor_perfil FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_deal_rooms" ON deal_rooms;
CREATE POLICY "all_deal_rooms" ON deal_rooms FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_deal_room_fornecedores" ON deal_room_fornecedores;
CREATE POLICY "all_deal_room_fornecedores" ON deal_room_fornecedores FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_orcamentos_recebidos" ON orcamentos_recebidos;
CREATE POLICY "all_orcamentos_recebidos" ON orcamentos_recebidos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_orcamento_recebido_linhas" ON orcamento_recebido_linhas;
CREATE POLICY "all_orcamento_recebido_linhas" ON orcamento_recebido_linhas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_alertas_garvis" ON alertas_garvis;
CREATE POLICY "all_alertas_garvis" ON alertas_garvis FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_projeto_scores" ON fornecedor_projeto_scores;
CREATE POLICY "all_fornecedor_projeto_scores" ON fornecedor_projeto_scores FOR ALL USING (true) WITH CHECK (true);
