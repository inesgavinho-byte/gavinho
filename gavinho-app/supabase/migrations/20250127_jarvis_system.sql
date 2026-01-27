-- ============================================
-- J.A.R.V.I.S. - Sistema IA Integrado
-- Assistente de Obra com Chat e Checklist Viva
-- ============================================

-- ============================================
-- 1. CHAT - MENSAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS chat_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('pessoa', 'jarvis')),
  autor_id UUID REFERENCES auth.users(id),  -- NULL se jarvis
  autor_nome TEXT,  -- Nome para exibição
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'texto' CHECK (tipo IN ('texto', 'audio', 'sistema', 'acao')),
  metadata JSONB DEFAULT '{}',  -- dados extraídos, ações sugeridas, etc.
  reply_to UUID REFERENCES chat_mensagens(id),  -- para threads
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_mensagens_obra ON chat_mensagens(obra_id, created_at DESC);
CREATE INDEX idx_chat_mensagens_autor ON chat_mensagens(autor_id);

-- ============================================
-- 2. CHAT - ANEXOS
-- ============================================

CREATE TABLE IF NOT EXISTS chat_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'documento', 'audio')),
  ficheiro_url TEXT NOT NULL,
  nome TEXT,
  tamanho INTEGER,  -- bytes
  transcricao TEXT,  -- para áudios
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_anexos_mensagem ON chat_anexos(mensagem_id);

-- ============================================
-- 3. CHAT - REAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS chat_reacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES auth.users(id),
  reacao TEXT NOT NULL,  -- '✓', '👀', '👍', '❤️', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mensagem_id, pessoa_id, reacao)
);

CREATE INDEX idx_chat_reacoes_mensagem ON chat_reacoes(mensagem_id);

-- ============================================
-- 4. CHAT - MENÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS chat_mencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES auth.users(id),
  notificado BOOLEAN DEFAULT FALSE,
  lido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_mencoes_pessoa ON chat_mencoes(pessoa_id, notificado);

-- ============================================
-- 5. CHECKLIST VIVA
-- ============================================

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'nc', 'aguarda_resposta', 'encomenda', 'decisao',
    'lead_time', 'documento', 'auto', 'followup', 'entrega', 'outro'
  )),
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN (
    'urgente', 'esta_semana', 'proximas_semanas', 'monitorizacao'
  )),
  data_limite DATE,
  data_alerta DATE,  -- quando alertar
  responsavel_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT,

  -- Referências opcionais (para navegar para o item original)
  nc_id UUID,
  email_id UUID,
  encomenda_ref TEXT,
  documento_id UUID,
  auto_id TEXT,
  pop_linha_id UUID,

  -- Estado
  estado TEXT DEFAULT 'aberto' CHECK (estado IN ('aberto', 'concluido', 'cancelado')),
  concluido_em TIMESTAMPTZ,
  concluido_por UUID REFERENCES auth.users(id),

  -- Metadata
  criado_por TEXT DEFAULT 'jarvis' CHECK (criado_por IN ('jarvis', 'manual')),
  fonte_mensagem_id UUID REFERENCES chat_mensagens(id),
  notas TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_obra_estado ON checklist_items(obra_id, estado);
CREATE INDEX idx_checklist_prioridade ON checklist_items(prioridade, data_limite);
CREATE INDEX idx_checklist_responsavel ON checklist_items(responsavel_id, estado);

-- ============================================
-- 6. CHECKLIST - HISTÓRICO
-- ============================================

CREATE TABLE IF NOT EXISTS checklist_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('criado', 'atualizado', 'concluido', 'reaberto', 'cancelado')),
  detalhes JSONB,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('pessoa', 'jarvis')),
  autor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_historico_item ON checklist_historico(item_id);

-- ============================================
-- 7. J.A.R.V.I.S. - PROCESSAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS jarvis_processamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id),
  obra_id UUID NOT NULL REFERENCES obras(id),
  input_original TEXT NOT NULL,
  analise JSONB NOT NULL,  -- categorias, entidades extraídas
  acoes_executadas JSONB NOT NULL,  -- o que J.A.R.V.I.S. fez
  resposta_gerada TEXT,
  modelo_usado TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_input INTEGER,
  tokens_output INTEGER,
  tempo_processamento_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jarvis_processamento_obra ON jarvis_processamento(obra_id);
CREATE INDEX idx_jarvis_processamento_mensagem ON jarvis_processamento(mensagem_id);

-- ============================================
-- 8. J.A.R.V.I.S. - EMAILS PREPARADOS
-- ============================================

CREATE TABLE IF NOT EXISTS jarvis_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  mensagem_origem_id UUID REFERENCES chat_mensagens(id),

  -- Conteúdo do email
  para TEXT NOT NULL,
  cc TEXT,
  assunto TEXT NOT NULL,
  corpo TEXT NOT NULL,

  -- Estado
  estado TEXT DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'aprovado', 'enviado', 'cancelado')),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  outlook_message_id TEXT,  -- ID do email no Outlook após envio

  -- Follow-up
  aguarda_resposta BOOLEAN DEFAULT FALSE,
  resposta_recebida BOOLEAN DEFAULT FALSE,
  resposta_recebida_em TIMESTAMPTZ,
  checklist_item_id UUID REFERENCES checklist_items(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jarvis_emails_obra ON jarvis_emails(obra_id, estado);
CREATE INDEX idx_jarvis_emails_aguarda ON jarvis_emails(aguarda_resposta, resposta_recebida);

-- ============================================
-- 9. J.A.R.V.I.S. - RASTREABILIDADE
-- ============================================

CREATE TABLE IF NOT EXISTS jarvis_rastreabilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- O que foi criado
  tipo_registo TEXT NOT NULL CHECK (tipo_registo IN (
    'diario', 'nc', 'alerta', 'checklist', 'foto', 'email', 'execucao'
  )),
  registo_id TEXT NOT NULL,
  registo_tabela TEXT NOT NULL,

  -- Origem
  mensagem_origem_id UUID REFERENCES chat_mensagens(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jarvis_rastreabilidade_registo ON jarvis_rastreabilidade(tipo_registo, registo_id);
CREATE INDEX idx_jarvis_rastreabilidade_obra ON jarvis_rastreabilidade(obra_id);

-- ============================================
-- 10. J.A.R.V.I.S. - CONFIGURAÇÕES POR OBRA
-- ============================================

CREATE TABLE IF NOT EXISTS jarvis_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- Notificações
  resumo_diario_ativo BOOLEAN DEFAULT TRUE,
  hora_resumo_diario TIME DEFAULT '08:00',
  alertas_push_ativos BOOLEAN DEFAULT TRUE,

  -- Follow-ups
  followup_horas INTEGER DEFAULT 48,
  followup_urgente_horas INTEGER DEFAULT 96,

  -- Processamento
  criar_nc_automatico BOOLEAN DEFAULT TRUE,
  atualizar_execucao_automatico BOOLEAN DEFAULT TRUE,
  criar_diario_automatico BOOLEAN DEFAULT TRUE,

  -- Personalização
  tom_comunicacao TEXT DEFAULT 'profissional' CHECK (tom_comunicacao IN ('profissional', 'casual', 'formal')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(obra_id)
);

-- ============================================
-- 11. DIÁRIO DE OBRA (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS obra_diario_entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'execucao', 'entrega', 'encomenda', 'comunicacao',
    'decisao', 'ocorrencia', 'visita', 'reuniao', 'outro'
  )),
  titulo TEXT NOT NULL,
  descricao TEXT,

  -- Associações
  zona TEXT,
  subempreiteiro TEXT,
  fornecedor TEXT,
  pessoa_contactada TEXT,

  -- Metadata
  criado_por TEXT DEFAULT 'manual' CHECK (criado_por IN ('manual', 'jarvis')),
  fonte_mensagem_id UUID REFERENCES chat_mensagens(id),
  autor_id UUID REFERENCES auth.users(id),
  autor_nome TEXT,

  -- Fotos associadas
  fotos JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diario_obra_data ON obra_diario_entradas(obra_id, data DESC);
CREATE INDEX idx_diario_tipo ON obra_diario_entradas(tipo);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jarvis_emails_updated_at
  BEFORE UPDATE ON jarvis_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jarvis_config_updated_at
  BEFORE UPDATE ON jarvis_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_obra_diario_entradas_updated_at
  BEFORE UPDATE ON obra_diario_entradas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_processamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_rastreabilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_entradas ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajustar conforme necessário)
CREATE POLICY "allow_all_chat_mensagens" ON chat_mensagens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chat_anexos" ON chat_anexos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chat_reacoes" ON chat_reacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chat_mencoes" ON chat_mencoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_checklist_items" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_checklist_historico" ON checklist_historico FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jarvis_processamento" ON jarvis_processamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jarvis_emails" ON jarvis_emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jarvis_rastreabilidade" ON jarvis_rastreabilidade FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jarvis_config" ON jarvis_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_obra_diario_entradas" ON obra_diario_entradas FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEW: CHECKLIST COM CONTAGEM POR PRIORIDADE
-- ============================================

CREATE OR REPLACE VIEW v_checklist_resumo AS
SELECT
  obra_id,
  COUNT(*) FILTER (WHERE estado = 'aberto') as total_abertos,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'urgente') as urgentes,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'esta_semana') as esta_semana,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'proximas_semanas') as proximas_semanas,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'monitorizacao') as monitorizacao,
  COUNT(*) FILTER (WHERE estado = 'concluido' AND concluido_em > NOW() - INTERVAL '7 days') as concluidos_semana
FROM checklist_items
GROUP BY obra_id;

-- ============================================
-- VIEW: ÚLTIMAS MENSAGENS DO CHAT
-- ============================================

CREATE OR REPLACE VIEW v_chat_ultimas_mensagens AS
SELECT DISTINCT ON (obra_id)
  obra_id,
  id as ultima_mensagem_id,
  conteudo as ultima_mensagem,
  autor_tipo,
  autor_nome,
  created_at as ultima_mensagem_em
FROM chat_mensagens
ORDER BY obra_id, created_at DESC;
