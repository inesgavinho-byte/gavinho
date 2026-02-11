-- ══════════════════════════════════════════════════════════════
-- GAVINHO Platform — Portal Cliente
-- Data: 2025-02-08
-- Descrição: Portal read-only para clientes acompanharem projectos.
--            Magic link auth, curadoria por PM, bilingue PT/EN.
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. CONFIGURAÇÃO DO PORTAL POR PROJECTO
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID UNIQUE NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  activo BOOLEAN DEFAULT false,
  activado_em TIMESTAMPTZ,
  activado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,

  cliente_email TEXT NOT NULL,
  cliente_nome TEXT,
  idioma_preferido TEXT DEFAULT 'pt' CHECK (idioma_preferido IN ('pt', 'en')),

  mensagem_boas_vindas TEXT,
  mostrar_timeline BOOLEAN DEFAULT true,
  mostrar_entregas_material BOOLEAN DEFAULT true,
  mostrar_documentos BOOLEAN DEFAULT true,
  mostrar_mensagens BOOLEAN DEFAULT true,

  notificar_novo_relatorio BOOLEAN DEFAULT true,
  notificar_nova_decisao BOOLEAN DEFAULT true,
  notificar_novas_fotos BOOLEAN DEFAULT false,
  notificar_marco_concluido BOOLEAN DEFAULT true,

  ultimo_acesso TIMESTAMPTZ,
  total_acessos INTEGER DEFAULT 0,
  pin_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_portal_config_projeto ON portal_config(projeto_id);
CREATE INDEX IF NOT EXISTS idx_portal_config_email ON portal_config(cliente_email);

ALTER TABLE portal_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_config_all" ON portal_config;
CREATE POLICY "portal_config_all" ON portal_config FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 2. FLAGS publicar_no_portal EM TABELAS EXISTENTES
-- ══════════════════════════════════════════════════

-- Fotografias
ALTER TABLE obra_fotografias ADD COLUMN IF NOT EXISTS publicar_no_portal BOOLEAN DEFAULT false;
ALTER TABLE obra_fotografias ADD COLUMN IF NOT EXISTS legenda_portal TEXT;
ALTER TABLE obra_fotografias ADD COLUMN IF NOT EXISTS portal_tipo TEXT CHECK (portal_tipo IN ('normal', 'antes', 'depois', 'destaque'));
ALTER TABLE obra_fotografias ADD COLUMN IF NOT EXISTS publicado_em TIMESTAMPTZ;
ALTER TABLE obra_fotografias ADD COLUMN IF NOT EXISTS publicado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL;

-- Relatórios
ALTER TABLE obra_relatorios ADD COLUMN IF NOT EXISTS publicar_no_portal BOOLEAN DEFAULT false;
ALTER TABLE obra_relatorios ADD COLUMN IF NOT EXISTS resumo_portal TEXT;

-- Decisões
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS publicar_no_portal BOOLEAN DEFAULT false;
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS requer_resposta_cliente BOOLEAN DEFAULT false;
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS prazo_resposta_cliente DATE;
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS resposta_cliente TEXT;
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS resposta_cliente_em TIMESTAMPTZ;
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS opcoes_cliente JSONB;

-- Purchase Orders (timeline de entregas)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS publicar_no_portal BOOLEAN DEFAULT false;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS descricao_portal TEXT;

-- ══════════════════════════════════════════════════
-- 3. DOCUMENTOS PARTILHADOS
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portal_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (
    categoria IN ('projecto', 'render', 'proposta', 'contrato', 'especificacao', 'outro')
  ),

  titulo TEXT NOT NULL,
  descricao TEXT,
  ficheiro_url TEXT NOT NULL,
  ficheiro_tipo TEXT,
  versao TEXT,

  publicado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  ordem INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_portal_docs_projeto ON portal_documentos(projeto_id);

ALTER TABLE portal_documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_docs_all" ON portal_documentos;
CREATE POLICY "portal_docs_all" ON portal_documentos FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 4. MENSAGENS PORTAL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portal_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('cliente', 'equipa')),
  autor_nome TEXT NOT NULL,
  autor_email TEXT,
  autor_utilizador_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,

  mensagem TEXT NOT NULL,

  lida_por_equipa BOOLEAN DEFAULT false,
  lida_por_equipa_em TIMESTAMPTZ,
  lida_por_cliente BOOLEAN DEFAULT false,
  lida_por_cliente_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_msgs_projeto ON portal_mensagens(projeto_id, created_at DESC);

ALTER TABLE portal_mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_msgs_all" ON portal_mensagens;
CREATE POLICY "portal_msgs_all" ON portal_mensagens FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 5. LOG DE ACESSOS
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portal_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  cliente_email TEXT NOT NULL,

  ip_address TEXT,
  user_agent TEXT,
  seccao_visitada TEXT,
  duracao_segundos INTEGER
);

CREATE INDEX IF NOT EXISTS idx_portal_acessos_projeto ON portal_acessos(projeto_id, created_at DESC);

ALTER TABLE portal_acessos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_acessos_all" ON portal_acessos;
CREATE POLICY "portal_acessos_all" ON portal_acessos FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 6. MARCOS DO PROJECTO (para timeline)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projeto_marcos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  titulo_en TEXT,
  descricao TEXT,
  descricao_en TEXT,

  data_prevista DATE,
  data_real DATE,

  estado TEXT DEFAULT 'pendente' CHECK (
    estado IN ('pendente', 'em_progresso', 'concluido', 'atrasado')
  ),

  publicar_no_portal BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,

  fase_id UUID,
  po_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_portal_marcos ON projeto_marcos(projeto_id, ordem);

ALTER TABLE projeto_marcos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marcos_all" ON projeto_marcos;
CREATE POLICY "marcos_all" ON projeto_marcos FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 7. VIEWS PARA O PORTAL (dados filtrados)
-- ══════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_portal_fotografias AS
SELECT
  f.id, f.obra_id, f.url, f.titulo,
  COALESCE(f.legenda_portal, f.descricao) as legenda,
  f.data_fotografia, f.portal_tipo, f.created_at,
  f.zona_id, f.especialidade_id
FROM obra_fotografias f
WHERE f.publicar_no_portal = true;

CREATE OR REPLACE VIEW v_portal_decisoes AS
SELECT
  d.id, d.projeto_id, d.titulo, d.descricao,
  d.tipo, d.impacto, d.estado,
  d.decidido_por, d.data_decisao,
  d.requer_resposta_cliente,
  d.prazo_resposta_cliente,
  d.resposta_cliente,
  d.resposta_cliente_em,
  d.opcoes_cliente,
  d.divisao, d.created_at
FROM decisoes d
WHERE d.publicar_no_portal = true;

CREATE OR REPLACE VIEW v_portal_timeline AS
SELECT
  m.id, m.projeto_id, m.titulo, m.titulo_en,
  m.descricao, m.descricao_en,
  m.data_prevista, m.data_real, m.estado, m.ordem
FROM projeto_marcos m
WHERE m.publicar_no_portal = true
ORDER BY m.ordem, m.data_prevista;

-- CORRIGIDO: purchase_orders não tem coluna 'codigo' — o PK 'id' É o código (ex: PO-2025-0001)
CREATE OR REPLACE VIEW v_portal_entregas AS
SELECT
  po.id, po.id as codigo, po.projeto_id, po.obra_id,
  COALESCE(po.descricao_portal, po.id) as descricao,
  po.data_entrega_prevista, po.data_entrega_real, po.estado
FROM purchase_orders po
WHERE po.publicar_no_portal = true
  AND po.estado NOT IN ('cancelada', 'rascunho');

-- ══════════════════════════════════════════════════
-- 8. TRIGGERS
-- ══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_portal_config_updated ON portal_config;
CREATE TRIGGER trg_portal_config_updated BEFORE UPDATE ON portal_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Docs: portal_config, portal_documentos, portal_mensagens, portal_acessos, projeto_marcos
