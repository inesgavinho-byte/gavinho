-- =====================================================
-- DESIGN REVIEW - Sistema de Revisão de Desenhos Técnicos
-- Permite revisão colaborativa de PDFs com anotações
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: DESIGN REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS design_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  entregavel_id UUID REFERENCES projeto_entregaveis(id) ON DELETE SET NULL,

  -- Informação do documento
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo_documento TEXT, -- Ex: "01.01.01"
  tipo_documento TEXT DEFAULT 'planta', -- planta, corte, alcado, detalhe, mapa

  -- Estado de aprovação: em_revisao, alteracoes_pedidas, aprovado, rejeitado
  status TEXT NOT NULL DEFAULT 'em_revisao' CHECK (status IN ('em_revisao', 'alteracoes_pedidas', 'aprovado', 'rejeitado')),

  -- Versão atual
  versao_atual INTEGER DEFAULT 1,

  -- Criação
  criado_por UUID REFERENCES utilizadores(id),
  criado_por_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_design_reviews_projeto ON design_reviews(projeto_id);
CREATE INDEX IF NOT EXISTS idx_design_reviews_entregavel ON design_reviews(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_design_reviews_status ON design_reviews(status);

-- =====================================================
-- 2. TABELA DE VERSÕES DO DOCUMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS design_review_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES design_reviews(id) ON DELETE CASCADE,

  -- Versão
  numero_versao INTEGER NOT NULL,

  -- Ficheiro
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  num_paginas INTEGER DEFAULT 1,

  -- Notas da versão
  notas TEXT,

  -- Upload
  uploaded_by UUID REFERENCES utilizadores(id),
  uploaded_by_nome TEXT,
  uploaded_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(review_id, numero_versao)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_design_versions_review ON design_review_versions(review_id);
CREATE INDEX IF NOT EXISTS idx_design_versions_numero ON design_review_versions(numero_versao DESC);

-- =====================================================
-- 3. TABELA DE ANOTAÇÕES/COMENTÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS design_review_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_review_versions(id) ON DELETE CASCADE,

  -- Posição (percentagem para ser responsivo)
  pagina INTEGER NOT NULL DEFAULT 1,
  pos_x DECIMAL(5,2) NOT NULL, -- 0-100%
  pos_y DECIMAL(5,2) NOT NULL, -- 0-100%

  -- Conteúdo
  comentario TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral', -- geral, erro, duvida, sugestao, cota_falta, material
  prioridade TEXT DEFAULT 'normal', -- baixa, normal, alta, urgente

  -- Estado: aberto, em_discussao, resolvido
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_discussao', 'resolvido')),

  -- Resolução
  resolucao TEXT,
  resolvido_por UUID REFERENCES utilizadores(id),
  resolvido_por_nome TEXT,
  resolvido_em TIMESTAMPTZ,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_annotations_version ON design_review_annotations(version_id);
CREATE INDEX IF NOT EXISTS idx_annotations_pagina ON design_review_annotations(pagina);
CREATE INDEX IF NOT EXISTS idx_annotations_status ON design_review_annotations(status);
CREATE INDEX IF NOT EXISTS idx_annotations_categoria ON design_review_annotations(categoria);

-- =====================================================
-- 4. TABELA DE RESPOSTAS ÀS ANOTAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS design_review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES design_review_annotations(id) ON DELETE CASCADE,

  -- Conteúdo
  comentario TEXT NOT NULL,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_replies_annotation ON design_review_replies(annotation_id);

-- =====================================================
-- 5. TABELA DE MENÇÕES (@utilizador)
-- =====================================================
CREATE TABLE IF NOT EXISTS design_review_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES design_review_annotations(id) ON DELETE CASCADE,

  -- Utilizador mencionado
  user_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  user_nome TEXT NOT NULL,

  -- Se foi notificado
  notificado BOOLEAN DEFAULT FALSE,
  lido BOOLEAN DEFAULT FALSE,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mentions_annotation ON design_review_mentions(annotation_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON design_review_mentions(user_id);

-- =====================================================
-- 6. TABELA DE DECISÕES DE REVISÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS design_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES design_reviews(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES design_review_versions(id) ON DELETE CASCADE,

  -- Decisão: aprovado, alteracoes_pedidas, rejeitado
  decisao TEXT NOT NULL CHECK (decisao IN ('aprovado', 'alteracoes_pedidas', 'rejeitado')),

  -- Comentários
  comentarios TEXT,

  -- Quem decidiu
  decidido_por UUID REFERENCES utilizadores(id),
  decidido_por_nome TEXT NOT NULL,
  decidido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_decisions_review ON design_review_decisions(review_id);
CREATE INDEX IF NOT EXISTS idx_decisions_version ON design_review_decisions(version_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE design_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_review_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_review_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_review_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_review_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON design_reviews FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON design_review_versions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON design_review_annotations FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON design_review_replies FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON design_review_mentions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON design_review_decisions FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para updated_at em design_reviews
CREATE OR REPLACE FUNCTION update_design_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_design_reviews_updated_at
  BEFORE UPDATE ON design_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_design_reviews_updated_at();

-- Trigger para updated_at em annotations
CREATE OR REPLACE FUNCTION update_design_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_design_annotations_updated_at
  BEFORE UPDATE ON design_review_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_design_annotations_updated_at();

-- Trigger: Quando uma anotação recebe resposta, mudar status para em_discussao
CREATE OR REPLACE FUNCTION on_annotation_reply()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE design_review_annotations
  SET status = 'em_discussao', updated_at = NOW()
  WHERE id = NEW.annotation_id AND status = 'aberto';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annotation_reply
  AFTER INSERT ON design_review_replies
  FOR EACH ROW
  EXECUTE FUNCTION on_annotation_reply();

-- Trigger: Atualizar versao_atual quando nova versão é adicionada
CREATE OR REPLACE FUNCTION on_new_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE design_reviews
  SET versao_atual = NEW.numero_versao, updated_at = NOW()
  WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_version
  AFTER INSERT ON design_review_versions
  FOR EACH ROW
  EXECUTE FUNCTION on_new_version();

-- Trigger: Atualizar status do review quando há decisão
CREATE OR REPLACE FUNCTION on_review_decision()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE design_reviews
  SET status = NEW.decisao, updated_at = NOW()
  WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_decision
  AFTER INSERT ON design_review_decisions
  FOR EACH ROW
  EXECUTE FUNCTION on_review_decision();

-- =====================================================
-- CATEGORIAS DE ANOTAÇÃO (constantes)
-- =====================================================
-- Categorias disponíveis para anotações:
-- 'geral' - Comentário geral
-- 'erro' - Erro identificado
-- 'duvida' - Dúvida/Questão
-- 'sugestao' - Sugestão de alteração
-- 'cota_falta' - Cota em falta
-- 'material' - Questão sobre material
-- 'dimensao' - Questão sobre dimensões
-- 'alinhamento' - Problema de alinhamento
