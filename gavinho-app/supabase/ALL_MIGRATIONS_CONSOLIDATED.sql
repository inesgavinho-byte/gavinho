-- Migração: Sistema de Comunicações Unificadas por Obra
-- Data: 2025-01-18
-- Descrição: Implementa sistema centralizado de comunicações (WhatsApp + Email)
--            com timeline unificada, canais por obra e ações operacionais

-- =====================================================
-- 1. ALTERAÇÃO DA TABELA OBRAS - Código Canónico
-- =====================================================

-- Adicionar coluna para código canónico interno (OBR-XXXXX)
ALTER TABLE obras ADD COLUMN IF NOT EXISTS codigo_canonico VARCHAR(20);

-- Função para extrair número do código GA/GB e gerar código canónico
CREATE OR REPLACE FUNCTION gerar_codigo_canonico(codigo_original VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  numero VARCHAR;
BEGIN
  -- Extrai os dígitos do código (ex: GA00402 -> 00402, GB00402 -> 00402)
  numero := REGEXP_REPLACE(codigo_original, '^[A-Za-z]+', '');
  -- Retorna formato canónico OBR-XXXXX
  RETURN 'OBR-' || numero;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para gerar código canónico automaticamente
CREATE OR REPLACE FUNCTION trigger_gerar_codigo_canonico()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NOT NULL AND (NEW.codigo_canonico IS NULL OR NEW.codigo != OLD.codigo) THEN
    NEW.codigo_canonico := gerar_codigo_canonico(NEW.codigo);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_codigo_canonico ON obras;
CREATE TRIGGER trg_gerar_codigo_canonico
  BEFORE INSERT OR UPDATE ON obras
  FOR EACH ROW EXECUTE FUNCTION trigger_gerar_codigo_canonico();

-- Atualizar obras existentes com código canónico
UPDATE obras SET codigo_canonico = gerar_codigo_canonico(codigo)
WHERE codigo IS NOT NULL AND codigo_canonico IS NULL;

-- Índice para busca rápida por código canónico
CREATE INDEX IF NOT EXISTS idx_obras_codigo_canonico ON obras(codigo_canonico);

-- =====================================================
-- 2. CANAIS DE COMUNICAÇÃO POR OBRA
-- =====================================================

-- Tabela de canais de comunicação
CREATE TABLE IF NOT EXISTS obra_canais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'coordenacao_geral',
    'estruturas',
    'avac',
    'carpintarias',
    'fornecimentos',
    'entregas',
    'qualidade',
    'seguranca',
    'financeiro',
    'outro'
  )),
  -- Configuração Twilio Conversations
  twilio_conversation_sid VARCHAR(50),
  twilio_friendly_name VARCHAR(255),
  -- Estado
  ativo BOOLEAN DEFAULT true,
  arquivado BOOLEAN DEFAULT false,
  -- Metadados
  cor VARCHAR(7) DEFAULT '#3B82F6', -- Hex color para UI
  icone VARCHAR(50) DEFAULT 'message-circle', -- Lucide icon name
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID,
  UNIQUE(obra_id, nome)
);

-- Participantes do canal
CREATE TABLE IF NOT EXISTS obra_canal_participantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_id UUID NOT NULL REFERENCES obra_canais(id) ON DELETE CASCADE,
  contacto_id UUID REFERENCES whatsapp_contactos(id) ON DELETE CASCADE,
  telefone VARCHAR(20), -- Pode não estar em contactos ainda
  nome VARCHAR(255),
  papel VARCHAR(50) DEFAULT 'participante' CHECK (papel IN (
    'admin',
    'moderador',
    'participante'
  )),
  notificacoes_ativas BOOLEAN DEFAULT true,
  adicionado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  adicionado_por UUID,
  UNIQUE(canal_id, telefone)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_canais_obra ON obra_canais(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_canais_tipo ON obra_canais(tipo);
CREATE INDEX IF NOT EXISTS idx_obra_canais_ativo ON obra_canais(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_canal_participantes_canal ON obra_canal_participantes(canal_id);
CREATE INDEX IF NOT EXISTS idx_canal_participantes_contacto ON obra_canal_participantes(contacto_id);

-- =====================================================
-- 3. SISTEMA DE EMAIL POR OBRA
-- =====================================================

-- Configuração de email
CREATE TABLE IF NOT EXISTS email_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_principal VARCHAR(255) NOT NULL, -- Ex: obras@empresa.pt
  servidor_smtp VARCHAR(255),
  porta_smtp INTEGER DEFAULT 587,
  servidor_imap VARCHAR(255),
  porta_imap INTEGER DEFAULT 993,
  usuario VARCHAR(255),
  password_encrypted TEXT,
  usar_tls BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de emails recebidos/enviados
CREATE TABLE IF NOT EXISTS obra_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE, -- Message-ID do email (para evitar duplicados)
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  canal_id UUID REFERENCES obra_canais(id) ON DELETE SET NULL,
  -- Dados do email
  assunto VARCHAR(500) NOT NULL,
  de_email VARCHAR(255) NOT NULL,
  de_nome VARCHAR(255),
  para_emails JSONB NOT NULL, -- Array de {email, nome}
  cc_emails JSONB, -- Array de {email, nome}
  corpo_texto TEXT,
  corpo_html TEXT,
  -- Anexos
  anexos JSONB, -- Array de {nome, tipo, tamanho, url_storage}
  -- Classificação
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recebido', 'enviado')),
  codigo_obra_detectado VARCHAR(20), -- Código extraído do assunto (GA00402, GB00402)
  classificacao_automatica BOOLEAN DEFAULT false,
  -- Estado
  lido BOOLEAN DEFAULT false,
  arquivado BOOLEAN DEFAULT false,
  importante BOOLEAN DEFAULT false,
  processado_ia BOOLEAN DEFAULT false,
  -- Threading
  in_reply_to VARCHAR(255), -- Referência ao email anterior
  thread_id UUID, -- ID da thread/conversa
  -- Timestamps
  data_envio TIMESTAMP WITH TIME ZONE,
  data_recebido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para emails
CREATE INDEX IF NOT EXISTS idx_obra_emails_obra ON obra_emails(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_emails_canal ON obra_emails(canal_id);
CREATE INDEX IF NOT EXISTS idx_obra_emails_thread ON obra_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_obra_emails_data ON obra_emails(data_envio DESC);
CREATE INDEX IF NOT EXISTS idx_obra_emails_tipo ON obra_emails(tipo);
CREATE INDEX IF NOT EXISTS idx_obra_emails_lido ON obra_emails(lido) WHERE lido = false;
CREATE INDEX IF NOT EXISTS idx_obra_emails_codigo ON obra_emails(codigo_obra_detectado);

-- Função para extrair código da obra do assunto do email
CREATE OR REPLACE FUNCTION extrair_codigo_obra_email(assunto VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  match_result VARCHAR;
BEGIN
  -- Procura padrões GA00000, GB00000, OBR-00000
  match_result := SUBSTRING(assunto FROM '(G[AB]\d{5})');
  IF match_result IS NOT NULL THEN
    RETURN match_result;
  END IF;

  match_result := SUBSTRING(assunto FROM '(OBR-\d{5})');
  IF match_result IS NOT NULL THEN
    RETURN match_result;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para classificar email automaticamente
CREATE OR REPLACE FUNCTION trigger_classificar_email()
RETURNS TRIGGER AS $$
DECLARE
  codigo_detectado VARCHAR;
  obra_encontrada_id UUID;
BEGIN
  -- Extrai código do assunto
  codigo_detectado := extrair_codigo_obra_email(NEW.assunto);
  NEW.codigo_obra_detectado := codigo_detectado;

  -- Se encontrou código, tenta associar à obra
  IF codigo_detectado IS NOT NULL AND NEW.obra_id IS NULL THEN
    -- Procura por código original ou canónico
    SELECT id INTO obra_encontrada_id FROM obras
    WHERE codigo = codigo_detectado
       OR codigo_canonico = codigo_detectado
       OR codigo_canonico = gerar_codigo_canonico(codigo_detectado)
    LIMIT 1;

    IF obra_encontrada_id IS NOT NULL THEN
      NEW.obra_id := obra_encontrada_id;
      NEW.classificacao_automatica := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classificar_email ON obra_emails;
CREATE TRIGGER trg_classificar_email
  BEFORE INSERT ON obra_emails
  FOR EACH ROW EXECUTE FUNCTION trigger_classificar_email();

-- =====================================================
-- 4. TIMELINE UNIFICADA
-- =====================================================

-- Tabela de eventos da timeline (agregação de todas as comunicações)
CREATE TABLE IF NOT EXISTS obra_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  canal_id UUID REFERENCES obra_canais(id) ON DELETE SET NULL,
  -- Referência ao item original
  tipo_item VARCHAR(50) NOT NULL CHECK (tipo_item IN (
    'whatsapp_mensagem',
    'email',
    'acao_tarefa',
    'acao_incidente',
    'acao_confirmacao',
    'acao_evento',
    'acao_evidencia',
    'nota_interna',
    'sistema'
  )),
  item_id UUID, -- ID da entidade original (mensagem, email, ação, etc.)
  -- Dados resumidos para display rápido
  titulo VARCHAR(500),
  resumo TEXT,
  autor_nome VARCHAR(255),
  autor_contacto VARCHAR(255), -- Email ou telefone
  autor_avatar_url VARCHAR(500),
  -- Metadados
  metadados JSONB, -- Dados adicionais específicos do tipo
  anexos_count INTEGER DEFAULT 0,
  tem_anexos BOOLEAN DEFAULT false,
  -- Estado
  lido BOOLEAN DEFAULT false,
  importante BOOLEAN DEFAULT false,
  arquivado BOOLEAN DEFAULT false,
  -- Acções associadas
  tem_accoes BOOLEAN DEFAULT false,
  accoes_count INTEGER DEFAULT 0,
  -- Timestamps
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para timeline
CREATE INDEX IF NOT EXISTS idx_obra_timeline_obra ON obra_timeline(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_timeline_canal ON obra_timeline(canal_id);
CREATE INDEX IF NOT EXISTS idx_obra_timeline_tipo ON obra_timeline(tipo_item);
CREATE INDEX IF NOT EXISTS idx_obra_timeline_data ON obra_timeline(data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_obra_timeline_item ON obra_timeline(tipo_item, item_id);
CREATE INDEX IF NOT EXISTS idx_obra_timeline_lido ON obra_timeline(obra_id, lido) WHERE lido = false;

-- =====================================================
-- 5. SISTEMA DE AÇÕES OPERACIONAIS
-- =====================================================

-- Tabela principal de ações
CREATE TABLE IF NOT EXISTS obra_acoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  canal_id UUID REFERENCES obra_canais(id) ON DELETE SET NULL,
  -- Origem da ação
  origem_tipo VARCHAR(50) NOT NULL CHECK (origem_tipo IN (
    'whatsapp',
    'email',
    'manual',
    'ia_sugestao',
    'sistema'
  )),
  origem_mensagem_id UUID, -- whatsapp_mensagens ou obra_emails
  origem_sugestao_id UUID REFERENCES ia_sugestoes(id) ON DELETE SET NULL,
  -- Tipo de ação
  tipo_acao VARCHAR(50) NOT NULL CHECK (tipo_acao IN (
    'tarefa',
    'incidente',
    'confirmacao',
    'evento',
    'evidencia'
  )),
  -- Dados da ação
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  -- Responsável e prazos
  responsavel_id UUID,
  responsavel_nome VARCHAR(255),
  responsavel_contacto VARCHAR(255),
  prazo TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  -- Estado
  estado VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (estado IN (
    'pendente',
    'em_progresso',
    'aguarda_validacao',
    'concluida',
    'cancelada',
    'adiada'
  )),
  prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN (
    'baixa',
    'media',
    'alta',
    'urgente'
  )),
  -- Para incidentes
  severidade VARCHAR(20) CHECK (severidade IN (
    'menor',
    'maior',
    'critica'
  )),
  -- Para confirmações
  confirmado_por UUID,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  -- Anexos e evidências
  anexos JSONB, -- Array de {nome, tipo, url}
  -- Metadados
  tags JSONB, -- Array de strings
  metadados JSONB,
  -- Auditoria
  criado_por UUID,
  atualizado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de alterações das ações
CREATE TABLE IF NOT EXISTS obra_acoes_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  acao_id UUID NOT NULL REFERENCES obra_acoes(id) ON DELETE CASCADE,
  campo_alterado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_por UUID,
  alterado_por_nome VARCHAR(255),
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários nas ações
CREATE TABLE IF NOT EXISTS obra_acoes_comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  acao_id UUID NOT NULL REFERENCES obra_acoes(id) ON DELETE CASCADE,
  autor_id UUID,
  autor_nome VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  anexos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ações
CREATE INDEX IF NOT EXISTS idx_obra_acoes_obra ON obra_acoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_acoes_canal ON obra_acoes(canal_id);
CREATE INDEX IF NOT EXISTS idx_obra_acoes_tipo ON obra_acoes(tipo_acao);
CREATE INDEX IF NOT EXISTS idx_obra_acoes_estado ON obra_acoes(estado);
CREATE INDEX IF NOT EXISTS idx_obra_acoes_responsavel ON obra_acoes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_obra_acoes_prazo ON obra_acoes(prazo) WHERE estado NOT IN ('concluida', 'cancelada');
CREATE INDEX IF NOT EXISTS idx_obra_acoes_prioridade ON obra_acoes(prioridade);
CREATE INDEX IF NOT EXISTS idx_acoes_historico_acao ON obra_acoes_historico(acao_id);
CREATE INDEX IF NOT EXISTS idx_acoes_comentarios_acao ON obra_acoes_comentarios(acao_id);

-- Trigger para histórico de ações
CREATE OR REPLACE FUNCTION trigger_acao_historico()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado != NEW.estado THEN
    INSERT INTO obra_acoes_historico (acao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'estado', OLD.estado, NEW.estado, NEW.atualizado_por);
  END IF;

  IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
    INSERT INTO obra_acoes_historico (acao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'responsavel_id', OLD.responsavel_id::text, NEW.responsavel_id::text, NEW.atualizado_por);
  END IF;

  IF OLD.prazo IS DISTINCT FROM NEW.prazo THEN
    INSERT INTO obra_acoes_historico (acao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'prazo', OLD.prazo::text, NEW.prazo::text, NEW.atualizado_por);
  END IF;

  IF OLD.prioridade != NEW.prioridade THEN
    INSERT INTO obra_acoes_historico (acao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'prioridade', OLD.prioridade, NEW.prioridade, NEW.atualizado_por);
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acao_historico ON obra_acoes;
CREATE TRIGGER trg_acao_historico
  BEFORE UPDATE ON obra_acoes
  FOR EACH ROW EXECUTE FUNCTION trigger_acao_historico();

-- =====================================================
-- 6. ATUALIZAÇÃO DA TABELA whatsapp_mensagens
-- =====================================================

-- Adicionar referência ao canal
ALTER TABLE whatsapp_mensagens ADD COLUMN IF NOT EXISTS canal_id UUID REFERENCES obra_canais(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_canal ON whatsapp_mensagens(canal_id);

-- =====================================================
-- 7. VIEWS ÚTEIS
-- =====================================================

-- View: Timeline completa por obra
CREATE OR REPLACE VIEW v_obra_timeline_completa AS
SELECT
  t.id,
  t.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  t.canal_id,
  c.nome as canal_nome,
  c.tipo as canal_tipo,
  t.tipo_item,
  t.item_id,
  t.titulo,
  t.resumo,
  t.autor_nome,
  t.autor_contacto,
  t.metadados,
  t.tem_anexos,
  t.anexos_count,
  t.lido,
  t.importante,
  t.tem_accoes,
  t.accoes_count,
  t.data_evento,
  t.created_at
FROM obra_timeline t
JOIN obras o ON t.obra_id = o.id
LEFT JOIN obra_canais c ON t.canal_id = c.id
ORDER BY t.data_evento DESC;

-- View: Ações pendentes por obra
CREATE OR REPLACE VIEW v_obra_acoes_pendentes AS
SELECT
  a.id,
  a.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  a.canal_id,
  c.nome as canal_nome,
  a.tipo_acao,
  a.titulo,
  a.descricao,
  a.responsavel_nome,
  a.prazo,
  a.estado,
  a.prioridade,
  a.severidade,
  a.created_at,
  CASE
    WHEN a.prazo < NOW() THEN 'atrasada'
    WHEN a.prazo < NOW() + INTERVAL '1 day' THEN 'urgente'
    WHEN a.prazo < NOW() + INTERVAL '3 days' THEN 'proxima'
    ELSE 'normal'
  END as urgencia
FROM obra_acoes a
JOIN obras o ON a.obra_id = o.id
LEFT JOIN obra_canais c ON a.canal_id = c.id
WHERE a.estado NOT IN ('concluida', 'cancelada')
ORDER BY
  CASE a.prioridade
    WHEN 'urgente' THEN 1
    WHEN 'alta' THEN 2
    WHEN 'media' THEN 3
    ELSE 4
  END,
  a.prazo ASC NULLS LAST;

-- View: Estatísticas de comunicação por obra
CREATE OR REPLACE VIEW v_obra_comunicacoes_stats AS
SELECT
  o.id as obra_id,
  o.codigo,
  o.codigo_canonico,
  o.nome,
  COUNT(DISTINCT wm.id) as total_whatsapp,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'recebida') as whatsapp_recebidas,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'enviada') as whatsapp_enviadas,
  COUNT(DISTINCT e.id) as total_emails,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'recebido') as emails_recebidos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'enviado') as emails_enviados,
  COUNT(DISTINCT a.id) as total_acoes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'pendente') as acoes_pendentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'concluida') as acoes_concluidas,
  COUNT(DISTINCT c.id) as total_canais
FROM obras o
LEFT JOIN whatsapp_mensagens wm ON o.id = wm.obra_id
LEFT JOIN obra_emails e ON o.id = e.obra_id
LEFT JOIN obra_acoes a ON o.id = a.obra_id
LEFT JOIN obra_canais c ON o.id = c.id AND c.ativo = true
GROUP BY o.id, o.codigo, o.codigo_canonico, o.nome;

-- =====================================================
-- 8. FUNÇÕES AUXILIARES
-- =====================================================

-- Função: Criar canais padrão para uma obra
CREATE OR REPLACE FUNCTION criar_canais_padrao_obra(p_obra_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO obra_canais (obra_id, nome, tipo, descricao, cor, icone, ordem)
  VALUES
    (p_obra_id, 'Coordenação Geral', 'coordenacao_geral', 'Canal principal de coordenação da obra', '#3B82F6', 'users', 1),
    (p_obra_id, 'Estruturas', 'estruturas', 'Comunicações sobre trabalhos estruturais', '#EF4444', 'building', 2),
    (p_obra_id, 'AVAC', 'avac', 'Ar condicionado, ventilação e aquecimento', '#10B981', 'wind', 3),
    (p_obra_id, 'Carpintarias', 'carpintarias', 'Trabalhos de carpintaria', '#F59E0B', 'hammer', 4),
    (p_obra_id, 'Fornecimentos', 'fornecimentos', 'Gestão de fornecimentos e materiais', '#8B5CF6', 'package', 5),
    (p_obra_id, 'Entregas', 'entregas', 'Coordenação de entregas em obra', '#EC4899', 'truck', 6)
  ON CONFLICT (obra_id, nome) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Função: Adicionar entrada à timeline
CREATE OR REPLACE FUNCTION adicionar_timeline_entry(
  p_obra_id UUID,
  p_tipo_item VARCHAR,
  p_item_id UUID,
  p_titulo VARCHAR,
  p_resumo TEXT,
  p_autor_nome VARCHAR,
  p_autor_contacto VARCHAR DEFAULT NULL,
  p_canal_id UUID DEFAULT NULL,
  p_metadados JSONB DEFAULT NULL,
  p_data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO obra_timeline (
    obra_id, canal_id, tipo_item, item_id, titulo, resumo,
    autor_nome, autor_contacto, metadados, data_evento
  )
  VALUES (
    p_obra_id, p_canal_id, p_tipo_item, p_item_id, p_titulo, p_resumo,
    p_autor_nome, p_autor_contacto, p_metadados, p_data_evento
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Função: Criar ação a partir de mensagem
CREATE OR REPLACE FUNCTION criar_acao_de_mensagem(
  p_obra_id UUID,
  p_tipo_acao VARCHAR,
  p_titulo VARCHAR,
  p_descricao TEXT,
  p_origem_tipo VARCHAR,
  p_mensagem_id UUID,
  p_responsavel_nome VARCHAR DEFAULT NULL,
  p_prazo TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_prioridade VARCHAR DEFAULT 'media',
  p_canal_id UUID DEFAULT NULL,
  p_criado_por UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_acao_id UUID;
BEGIN
  INSERT INTO obra_acoes (
    obra_id, canal_id, origem_tipo, origem_mensagem_id, tipo_acao,
    titulo, descricao, responsavel_nome, prazo, prioridade, criado_por
  )
  VALUES (
    p_obra_id, p_canal_id, p_origem_tipo, p_mensagem_id, p_tipo_acao,
    p_titulo, p_descricao, p_responsavel_nome, p_prazo, p_prioridade, p_criado_por
  )
  RETURNING id INTO v_acao_id;

  -- Adicionar à timeline
  PERFORM adicionar_timeline_entry(
    p_obra_id,
    'acao_' || p_tipo_acao,
    v_acao_id,
    p_titulo,
    p_descricao,
    COALESCE(p_responsavel_nome, 'Sistema'),
    NULL,
    p_canal_id,
    jsonb_build_object('tipo_acao', p_tipo_acao, 'prioridade', p_prioridade),
    NOW()
  );

  RETURN v_acao_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS PARA TIMELINE AUTOMÁTICA
-- =====================================================

-- Trigger: Adicionar mensagens WhatsApp à timeline
CREATE OR REPLACE FUNCTION trigger_whatsapp_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    PERFORM adicionar_timeline_entry(
      NEW.obra_id,
      'whatsapp_mensagem',
      NEW.id,
      CASE WHEN NEW.tipo = 'recebida' THEN 'Mensagem recebida' ELSE 'Mensagem enviada' END,
      LEFT(NEW.conteudo, 200),
      COALESCE(NEW.autor_nome, NEW.telefone_origem),
      NEW.telefone_origem,
      NEW.canal_id,
      jsonb_build_object(
        'tipo', NEW.tipo,
        'telefone', NEW.telefone_origem,
        'tem_anexos', NEW.anexos IS NOT NULL
      ),
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_to_timeline ON whatsapp_mensagens;
CREATE TRIGGER trg_whatsapp_to_timeline
  AFTER INSERT ON whatsapp_mensagens
  FOR EACH ROW EXECUTE FUNCTION trigger_whatsapp_to_timeline();

-- Trigger: Adicionar emails à timeline
CREATE OR REPLACE FUNCTION trigger_email_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    PERFORM adicionar_timeline_entry(
      NEW.obra_id,
      'email',
      NEW.id,
      NEW.assunto,
      LEFT(COALESCE(NEW.corpo_texto, ''), 200),
      COALESCE(NEW.de_nome, NEW.de_email),
      NEW.de_email,
      NEW.canal_id,
      jsonb_build_object(
        'tipo', NEW.tipo,
        'de_email', NEW.de_email,
        'tem_anexos', NEW.anexos IS NOT NULL
      ),
      COALESCE(NEW.data_envio, NEW.created_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_to_timeline ON obra_emails;
CREATE TRIGGER trg_email_to_timeline
  AFTER INSERT ON obra_emails
  FOR EACH ROW EXECUTE FUNCTION trigger_email_to_timeline();

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE obra_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_canal_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_acoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_acoes_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir tudo para utilizadores autenticados)
CREATE POLICY "obra_canais_all" ON obra_canais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_canal_participantes_all" ON obra_canal_participantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "email_config_all" ON email_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_emails_all" ON obra_emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_timeline_all" ON obra_timeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_acoes_all" ON obra_acoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_acoes_historico_all" ON obra_acoes_historico FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "obra_acoes_comentarios_all" ON obra_acoes_comentarios FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 11. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE obra_canais IS 'Canais de comunicação por obra (ex: Coordenação Geral, AVAC, Estruturas)';
COMMENT ON TABLE obra_canal_participantes IS 'Participantes de cada canal de comunicação';
COMMENT ON TABLE email_config IS 'Configuração do servidor de email para receber/enviar emails';
COMMENT ON TABLE obra_emails IS 'Emails recebidos e enviados associados a obras';
COMMENT ON TABLE obra_timeline IS 'Timeline unificada de todas as comunicações por obra';
COMMENT ON TABLE obra_acoes IS 'Ações operacionais geradas a partir de comunicações (tarefas, incidentes, etc.)';
COMMENT ON TABLE obra_acoes_historico IS 'Histórico de alterações das ações para auditoria';
COMMENT ON TABLE obra_acoes_comentarios IS 'Comentários e discussões nas ações';
COMMENT ON COLUMN obras.codigo_canonico IS 'Código canónico interno (OBR-XXXXX) gerado a partir do código GA/GB';
-- Migração: Tabelas para integração WhatsApp + IA
-- Data: 2025-01-18

-- Tabela de contactos WhatsApp (associa números de telefone a obras)
CREATE TABLE IF NOT EXISTS whatsapp_contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  cargo VARCHAR(100), -- Ex: Encarregado, Subempreiteiro, etc.
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para contactos
CREATE INDEX IF NOT EXISTS idx_whatsapp_contactos_telefone ON whatsapp_contactos(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contactos_obra ON whatsapp_contactos(obra_id);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_sid VARCHAR(50) UNIQUE, -- SID único do Twilio
  telefone_origem VARCHAR(20) NOT NULL,
  telefone_destino VARCHAR(20) NOT NULL,
  conteudo TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recebida', 'enviada')),
  contacto_id UUID REFERENCES whatsapp_contactos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  autor_nome VARCHAR(255),
  anexos JSONB, -- Array de {url, tipo, nome}
  lida BOOLEAN DEFAULT false,
  processada_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_obra ON whatsapp_mensagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_contacto ON whatsapp_mensagens(contacto_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_created ON whatsapp_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_processada ON whatsapp_mensagens(processada_ia) WHERE processada_ia = false;

-- Tabela de sugestões da IA
CREATE TABLE IF NOT EXISTS ia_sugestoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID REFERENCES whatsapp_mensagens(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'requisicao_material',
    'registo_horas',
    'trabalho_executado',
    'nova_tarefa',
    'nao_conformidade'
  )),
  dados JSONB NOT NULL, -- Dados extraídos pela IA (material, quantidade, etc.)
  texto_original TEXT, -- Texto da mensagem que originou a sugestão
  confianca DECIMAL(3,2), -- 0.00 a 1.00 - nível de confiança da IA
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceite', 'rejeitada')),
  processado_por UUID, -- ID do utilizador que processou
  processado_em TIMESTAMP WITH TIME ZONE,
  entidade_criada_id UUID, -- ID da entidade criada (requisição, tarefa, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sugestões IA
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_obra ON ia_sugestoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_status ON ia_sugestoes(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_tipo ON ia_sugestoes(tipo);

-- Tabela de configuração WhatsApp por empresa/utilizador
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_account_sid VARCHAR(50),
  twilio_auth_token_encrypted VARCHAR(255), -- Token encriptado
  twilio_phone_number VARCHAR(20),
  webhook_url VARCHAR(255),
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_whatsapp_contactos_updated_at ON whatsapp_contactos;
CREATE TRIGGER update_whatsapp_contactos_updated_at
  BEFORE UPDATE ON whatsapp_contactos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Ativar
ALTER TABLE whatsapp_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_sugestoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir tudo para utilizadores autenticados)
-- Nota: Ajustar conforme necessidades de segurança

CREATE POLICY "whatsapp_contactos_all" ON whatsapp_contactos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_mensagens_all" ON whatsapp_mensagens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "ia_sugestoes_all" ON ia_sugestoes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_config_all" ON whatsapp_config
  FOR ALL USING (true) WITH CHECK (true);

-- Comentários nas tabelas
COMMENT ON TABLE whatsapp_contactos IS 'Contactos WhatsApp associados a obras';
COMMENT ON TABLE whatsapp_mensagens IS 'Mensagens WhatsApp recebidas e enviadas via Twilio';
COMMENT ON TABLE ia_sugestoes IS 'Sugestões geradas pela IA a partir das mensagens';
COMMENT ON TABLE whatsapp_config IS 'Configuração da integração Twilio WhatsApp';
-- =====================================================
-- DIÁRIO DE BORDO - Schema
-- =====================================================

-- Categorias do Diário de Bordo
CREATE TABLE IF NOT EXISTS diario_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#5F5C59',
  icone VARCHAR(50) DEFAULT 'FileText',
  ordem INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO diario_categorias (nome, cor, icone, ordem) VALUES
  ('Tarefa', '#7A9E7A', 'CheckSquare', 1),
  ('Desenhos', '#8A9EB8', 'PenTool', 2),
  ('3D / Renders', '#C9A882', 'Box', 3),
  ('Cliente', '#B88A8A', 'User', 4),
  ('Fornecedor', '#9B8AB8', 'Truck', 5),
  ('Email', '#6B8E9B', 'Mail', 6),
  ('Reunião', '#8B8A7A', 'Users', 7),
  ('Nota', '#A0A0A0', 'StickyNote', 8)
ON CONFLICT DO NOTHING;

-- Tags para filtrar entradas
CREATE TABLE IF NOT EXISTS diario_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  cor VARCHAR(20) DEFAULT '#C3BAAF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tags padrão
INSERT INTO diario_tags (nome, cor) VALUES
  ('Urgente', '#B88A8A'),
  ('Aguarda Resposta', '#C9A882'),
  ('Concluído', '#7A9E7A'),
  ('Em Revisão', '#8A9EB8'),
  ('Pendente Cliente', '#9B8AB8')
ON CONFLICT DO NOTHING;

-- Entradas do Diário de Bordo
CREATE TABLE IF NOT EXISTS projeto_diario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES diario_categorias(id),

  -- Conteúdo
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,

  -- Metadados
  tipo VARCHAR(50) DEFAULT 'manual', -- 'manual', 'email', 'auto'
  fonte VARCHAR(100), -- 'outlook', 'manual', 'sistema'

  -- Relacionamentos opcionais
  utilizador_id UUID REFERENCES utilizadores(id),
  entregavel_id UUID REFERENCES projeto_entregaveis(id),

  -- Email específico (quando tipo = 'email')
  email_de VARCHAR(255),
  email_para VARCHAR(255),
  email_assunto VARCHAR(500),
  email_message_id VARCHAR(255), -- ID único do email para evitar duplicados

  -- Anexos (URLs do Supabase Storage)
  anexos JSONB DEFAULT '[]',

  -- Timestamps
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES utilizadores(id)
);

-- Relação muitos-para-muitos entre entradas e tags
CREATE TABLE IF NOT EXISTS projeto_diario_tags (
  diario_id UUID REFERENCES projeto_diario(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES diario_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (diario_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projeto_diario_projeto ON projeto_diario(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_categoria ON projeto_diario(categoria_id);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_data ON projeto_diario(data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_tipo ON projeto_diario(tipo);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_email_id ON projeto_diario(email_message_id);

-- RLS Policies
ALTER TABLE diario_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_diario_tags ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para utilizadores autenticados
CREATE POLICY "Allow all for authenticated users" ON diario_categorias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON diario_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_diario FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_diario_tags FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_diario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_diario_updated_at
  BEFORE UPDATE ON projeto_diario
  FOR EACH ROW
  EXECUTE FUNCTION update_diario_updated_at();
-- Migração: Sistema de Processamento Automático de IA
-- Data: 2025-01-19
-- Descrição: Adiciona suporte para processamento automático de mensagens com IA,
--            incluindo logging, colunas adicionais e configuração de pg_cron

-- =====================================================
-- 1. ATUALIZAÇÃO DA TABELA ia_sugestoes
-- =====================================================

-- Adicionar colunas para suportar emails e fonte
ALTER TABLE ia_sugestoes ADD COLUMN IF NOT EXISTS email_id UUID REFERENCES obra_emails(id) ON DELETE CASCADE;
ALTER TABLE ia_sugestoes ADD COLUMN IF NOT EXISTS fonte VARCHAR(20) DEFAULT 'whatsapp' CHECK (fonte IN ('whatsapp', 'email', 'manual'));

-- Índices para novas colunas
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_email ON ia_sugestoes(email_id);
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_fonte ON ia_sugestoes(fonte);
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_status ON ia_sugestoes(status);

-- =====================================================
-- 2. TABELA DE LOG DE PROCESSAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS ia_processamento_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'cron_automatico',
    'manual',
    'webhook'
  )),
  -- Estatísticas WhatsApp
  whatsapp_processadas INTEGER DEFAULT 0,
  whatsapp_sugestoes INTEGER DEFAULT 0,
  whatsapp_erros INTEGER DEFAULT 0,
  -- Estatísticas Email
  email_processadas INTEGER DEFAULT 0,
  email_sugestoes INTEGER DEFAULT 0,
  email_erros INTEGER DEFAULT 0,
  -- Metadados
  duracao_ms INTEGER,
  sucesso BOOLEAN DEFAULT true,
  erro_mensagem TEXT,
  metadados JSONB,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas de monitorização
CREATE INDEX IF NOT EXISTS idx_ia_log_created ON ia_processamento_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_log_sucesso ON ia_processamento_log(sucesso);
CREATE INDEX IF NOT EXISTS idx_ia_log_tipo ON ia_processamento_log(tipo);

-- RLS para tabela de log
ALTER TABLE ia_processamento_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_processamento_log_all" ON ia_processamento_log FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 3. TABELA DE CONFIGURAÇÃO DO CRON
-- =====================================================

CREATE TABLE IF NOT EXISTS ia_cron_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Configuração do cron
  ativo BOOLEAN DEFAULT true,
  intervalo_minutos INTEGER DEFAULT 5 CHECK (intervalo_minutos >= 1 AND intervalo_minutos <= 60),
  -- Limites de processamento
  batch_size_whatsapp INTEGER DEFAULT 20,
  batch_size_email INTEGER DEFAULT 10,
  -- Estado
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  proxima_execucao TIMESTAMP WITH TIME ZONE,
  execucoes_consecutivas_falhadas INTEGER DEFAULT 0,
  -- Configuração de retry
  max_retries INTEGER DEFAULT 3,
  pausar_apos_falhas INTEGER DEFAULT 5, -- Pausar após N falhas consecutivas
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO ia_cron_config (ativo, intervalo_minutos, batch_size_whatsapp, batch_size_email)
VALUES (true, 5, 20, 10)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE ia_cron_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_cron_config_all" ON ia_cron_config FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. FUNÇÃO PARA VERIFICAR SE DEVE PROCESSAR
-- =====================================================

CREATE OR REPLACE FUNCTION ia_deve_processar()
RETURNS BOOLEAN AS $$
DECLARE
  config_record RECORD;
BEGIN
  SELECT * INTO config_record FROM ia_cron_config LIMIT 1;

  -- Se não há configuração, criar uma
  IF config_record IS NULL THEN
    INSERT INTO ia_cron_config DEFAULT VALUES RETURNING * INTO config_record;
  END IF;

  -- Verificar se está ativo
  IF NOT config_record.ativo THEN
    RETURN FALSE;
  END IF;

  -- Verificar se passou tempo suficiente desde última execução
  IF config_record.ultima_execucao IS NOT NULL THEN
    IF config_record.ultima_execucao + (config_record.intervalo_minutos * INTERVAL '1 minute') > NOW() THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar se não está pausado por muitas falhas
  IF config_record.execucoes_consecutivas_falhadas >= config_record.pausar_apos_falhas THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNÇÃO PARA ATUALIZAR ESTADO DO CRON
-- =====================================================

CREATE OR REPLACE FUNCTION ia_atualizar_estado_cron(p_sucesso BOOLEAN)
RETURNS void AS $$
BEGIN
  UPDATE ia_cron_config SET
    ultima_execucao = NOW(),
    proxima_execucao = NOW() + (intervalo_minutos * INTERVAL '1 minute'),
    execucoes_consecutivas_falhadas = CASE
      WHEN p_sucesso THEN 0
      ELSE execucoes_consecutivas_falhadas + 1
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VIEW PARA MONITORIZAÇÃO
-- =====================================================

-- View: Estatísticas de processamento das últimas 24 horas
CREATE OR REPLACE VIEW v_ia_processamento_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as execucoes,
  SUM(whatsapp_processadas) as whatsapp_total,
  SUM(whatsapp_sugestoes) as whatsapp_sugestoes_total,
  SUM(email_processadas) as email_total,
  SUM(email_sugestoes) as email_sugestoes_total,
  AVG(duracao_ms)::INTEGER as duracao_media_ms,
  COUNT(*) FILTER (WHERE sucesso = false) as falhas
FROM ia_processamento_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- View: Mensagens pendentes de processamento
CREATE OR REPLACE VIEW v_ia_mensagens_pendentes AS
SELECT
  'whatsapp' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM whatsapp_mensagens
WHERE processada_ia = false AND tipo = 'recebida' AND conteudo IS NOT NULL

UNION ALL

SELECT
  'email' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM obra_emails
WHERE processado_ia = false AND tipo = 'recebido' AND corpo_texto IS NOT NULL;

-- =====================================================
-- 7. CONFIGURAÇÃO DE pg_cron (SE DISPONÍVEL)
-- =====================================================

-- NOTA: pg_cron precisa estar habilitado no Supabase Dashboard
-- Settings > Database > Extensions > pg_cron

-- Criar função wrapper para ser chamada pelo cron
CREATE OR REPLACE FUNCTION ia_processar_mensagens_cron()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Esta função pode ser usada para chamar a Edge Function via HTTP
  -- ou processar diretamente no PostgreSQL

  -- Opção 1: Log que cron foi executado (a Edge Function faz o processamento)
  INSERT INTO ia_processamento_log (tipo, metadados)
  VALUES ('cron_automatico', jsonb_build_object('trigger', 'pg_cron', 'timestamp', NOW()));

  -- Atualizar estado
  PERFORM ia_atualizar_estado_cron(true);

  -- NOTA: Para chamar a Edge Function, usar pg_net ou trigger externo
  -- A Edge Function deve ser chamada via:
  -- 1. Serviço externo de cron (cron-job.org, etc.)
  -- 2. GitHub Actions scheduled workflow
  -- 3. Supabase Database Webhooks
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tentar criar o job de cron (ignora erro se pg_cron não estiver disponível)
DO $$
BEGIN
  -- Cron: executar a cada 5 minutos
  PERFORM cron.schedule(
    'ia-processar-mensagens',           -- nome do job
    '*/5 * * * *',                       -- a cada 5 minutos
    'SELECT ia_processar_mensagens_cron()'
  );
  RAISE NOTICE 'pg_cron job criado com sucesso';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não disponível ou já existe: %', SQLERRM;
END $$;

-- =====================================================
-- 8. WEBHOOK DE DATABASE PARA TRIGGER AUTOMÁTICO
-- =====================================================

-- Função para notificar quando há mensagens pendentes
CREATE OR REPLACE FUNCTION notify_mensagens_pendentes()
RETURNS TRIGGER AS $$
DECLARE
  pendentes_count INTEGER;
BEGIN
  -- Contar mensagens pendentes
  SELECT COUNT(*) INTO pendentes_count
  FROM whatsapp_mensagens
  WHERE processada_ia = false AND tipo = 'recebida';

  -- Se há mais de 10 pendentes, notificar
  IF pendentes_count >= 10 THEN
    PERFORM pg_notify('mensagens_pendentes', json_build_object(
      'count', pendentes_count,
      'timestamp', NOW()
    )::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger opcional para notificar acumulação de mensagens
DROP TRIGGER IF EXISTS trg_notify_mensagens_pendentes ON whatsapp_mensagens;
CREATE TRIGGER trg_notify_mensagens_pendentes
  AFTER INSERT ON whatsapp_mensagens
  FOR EACH ROW
  WHEN (NEW.processada_ia = false AND NEW.tipo = 'recebida')
  EXECUTE FUNCTION notify_mensagens_pendentes();

-- =====================================================
-- 9. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE ia_processamento_log IS 'Log de execuções do processamento automático de IA';
COMMENT ON TABLE ia_cron_config IS 'Configuração do processamento automático (intervalo, limites, estado)';
COMMENT ON COLUMN ia_sugestoes.fonte IS 'Origem da mensagem analisada: whatsapp, email ou manual';
COMMENT ON COLUMN ia_sugestoes.email_id IS 'Referência ao email que gerou esta sugestão (se aplicável)';
COMMENT ON VIEW v_ia_processamento_stats IS 'Estatísticas de processamento de IA das últimas 24 horas';
COMMENT ON VIEW v_ia_mensagens_pendentes IS 'Contagem de mensagens aguardando processamento de IA';
-- =====================================================
-- DECISION LOG - Sistema de Comentários/Respostas
-- Permite múltiplas respostas numa mesma dúvida
-- =====================================================

-- Tabela de comentários/respostas
CREATE TABLE IF NOT EXISTS decision_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT NOT NULL REFERENCES project_decisions(id) ON DELETE CASCADE,

  -- Conteúdo
  comentario TEXT NOT NULL,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_decision_comments_decision ON decision_comments(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_comments_criado ON decision_comments(criado_em DESC);

-- RLS
ALTER TABLE decision_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON decision_comments FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_decision_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_comments_updated_at
  BEFORE UPDATE ON decision_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_comments_updated_at();

-- Trigger: Quando há novo comentário, mudar status para 'discussion' se estava 'pending'
CREATE OR REPLACE FUNCTION on_decision_comment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a decisão está pendente, mudar para em discussão
  UPDATE project_decisions
  SET status = 'discussion', updated_at = NOW()
  WHERE id = NEW.decision_id AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_comment_insert
  AFTER INSERT ON decision_comments
  FOR EACH ROW
  EXECUTE FUNCTION on_decision_comment_insert();

-- Adicionar coluna para resolução final (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolucao_final') THEN
    ALTER TABLE project_decisions ADD COLUMN resolucao_final TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_em') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_em TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_por') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_por UUID REFERENCES utilizadores(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_por_nome') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_por_nome TEXT;
  END IF;
END $$;
-- =====================================================
-- DECISION LOG - Schema
-- Registo de dúvidas e decisões do projeto
-- =====================================================

-- Sequência para IDs
CREATE SEQUENCE IF NOT EXISTS decision_seq START 1;

-- Tabela principal de decisões
CREATE TABLE IF NOT EXISTS project_decisions (
  id TEXT PRIMARY KEY DEFAULT ('DEC-' || LPAD(nextval('decision_seq')::TEXT, 5, '0')),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  entregavel_id UUID REFERENCES projeto_entregaveis(id) ON DELETE SET NULL,

  -- Dúvida
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  imagem_url TEXT,

  -- Estado: 'pending', 'discussion', 'resolved'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'discussion', 'resolved')),

  -- Submissão
  submetido_por UUID REFERENCES utilizadores(id),
  submetido_por_nome TEXT,
  submetido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Resposta
  resposta TEXT,
  respondido_por UUID REFERENCES utilizadores(id),
  respondido_por_nome TEXT,
  respondido_em TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_decisions_projeto ON project_decisions(projeto_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON project_decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_entregavel ON project_decisions(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_decisions_submetido_em ON project_decisions(submetido_em DESC);

-- RLS Policies
ALTER TABLE project_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON project_decisions FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisions_updated_at
  BEFORE UPDATE ON project_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_decisions_updated_at();

-- Trigger: Registar submissão no diário de bordo
CREATE OR REPLACE FUNCTION log_decision_submission()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  -- Buscar categoria "Tarefa" ou criar entrada sem categoria
  SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

  INSERT INTO projeto_diario (
    projeto_id,
    categoria_id,
    titulo,
    descricao,
    tipo,
    fonte,
    data_evento
  ) VALUES (
    NEW.projeto_id,
    categoria_id,
    'Nova dúvida: ' || NEW.titulo,
    'Dúvida submetida para análise por ' || COALESCE(NEW.submetido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.descricao, 200),
    'auto',
    'decision_log',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_decision_submitted
  AFTER INSERT ON project_decisions
  FOR EACH ROW EXECUTE FUNCTION log_decision_submission();

-- Trigger: Registar resposta no diário de bordo
CREATE OR REPLACE FUNCTION log_decision_response()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  IF NEW.resposta IS NOT NULL AND (OLD.resposta IS NULL OR OLD.resposta != NEW.resposta) THEN
    -- Buscar categoria "Tarefa"
    SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

    INSERT INTO projeto_diario (
      projeto_id,
      categoria_id,
      titulo,
      descricao,
      tipo,
      fonte,
      data_evento
    ) VALUES (
      NEW.projeto_id,
      categoria_id,
      'Decisão: ' || NEW.titulo,
      'Resposta de ' || COALESCE(NEW.respondido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.resposta, 200),
      'auto',
      'decision_log',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_decision_responded
  AFTER UPDATE ON project_decisions
  FOR EACH ROW EXECUTE FUNCTION log_decision_response();
-- =====================================================
-- CENTRAL DE ENTREGAS - Ficheiros de Entrega
-- Upload de ficheiros com versionamento e aprovação
-- =====================================================

-- Sequência para IDs dos ficheiros
CREATE SEQUENCE IF NOT EXISTS delivery_file_seq START 1;

-- Tabela principal de ficheiros de entrega
CREATE TABLE IF NOT EXISTS entrega_ficheiros (
  id TEXT PRIMARY KEY DEFAULT ('FILE-' || LPAD(nextval('delivery_file_seq')::TEXT, 6, '0')),
  entregavel_id UUID NOT NULL REFERENCES projeto_entregaveis(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Ficheiro
  nome_ficheiro TEXT NOT NULL,
  tipo_ficheiro TEXT NOT NULL CHECK (tipo_ficheiro IN ('pdf', 'jpeg', 'jpg', 'png', 'dwg', 'dwf')),
  ficheiro_url TEXT NOT NULL,
  tamanho_bytes BIGINT,

  -- Versão
  versao INTEGER NOT NULL DEFAULT 1,
  versao_atual BOOLEAN NOT NULL DEFAULT true,

  -- Bom para Construção
  aprovado_construcao BOOLEAN NOT NULL DEFAULT false,
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES utilizadores(id),
  aprovado_por_nome TEXT,

  -- Upload
  carregado_por UUID REFERENCES utilizadores(id),
  carregado_por_nome TEXT,
  carregado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_entregavel ON entrega_ficheiros(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_projeto ON entrega_ficheiros(projeto_id);
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_atual ON entrega_ficheiros(entregavel_id, versao_atual) WHERE versao_atual = true;
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_aprovado ON entrega_ficheiros(projeto_id, aprovado_construcao) WHERE aprovado_construcao = true;
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_carregado ON entrega_ficheiros(carregado_em DESC);

-- RLS Policies
ALTER TABLE entrega_ficheiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON entrega_ficheiros FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_entrega_ficheiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entrega_ficheiros_updated_at
  BEFORE UPDATE ON entrega_ficheiros
  FOR EACH ROW
  EXECUTE FUNCTION update_entrega_ficheiros_updated_at();

-- Trigger: Arquivar versão anterior ao fazer upload
CREATE OR REPLACE FUNCTION archive_previous_file_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- Obter versão máxima atual para este entregável
  SELECT COALESCE(MAX(versao), 0) INTO max_version
  FROM entrega_ficheiros
  WHERE entregavel_id = NEW.entregavel_id;

  -- Definir nova versão
  NEW.versao := max_version + 1;

  -- Marcar versões anteriores como não-atual
  UPDATE entrega_ficheiros
  SET versao_atual = false,
      updated_at = NOW()
  WHERE entregavel_id = NEW.entregavel_id
    AND versao_atual = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_entrega_ficheiro_insert
  BEFORE INSERT ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION archive_previous_file_version();

-- Trigger: Registar no Diário quando marcado "Bom para Construção"
CREATE OR REPLACE FUNCTION log_construction_approval()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
  entregavel_codigo TEXT;
BEGIN
  IF NEW.aprovado_construcao = true AND (OLD.aprovado_construcao IS NULL OR OLD.aprovado_construcao = false) THEN
    -- Buscar categoria "Tarefa"
    SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

    -- Buscar código do entregável
    SELECT codigo INTO entregavel_codigo FROM projeto_entregaveis WHERE id = NEW.entregavel_id;

    INSERT INTO projeto_diario (
      projeto_id,
      categoria_id,
      titulo,
      descricao,
      tipo,
      fonte,
      data_evento
    ) VALUES (
      NEW.projeto_id,
      categoria_id,
      'Documento aprovado para Construção',
      'Ficheiro "' || NEW.nome_ficheiro || '" (' || COALESCE(entregavel_codigo, '') || ') marcado como Bom para Construção (v' || NEW.versao || ') por ' || COALESCE(NEW.aprovado_por_nome, 'Utilizador'),
      'auto',
      'central_entregas',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_construction_approval
  AFTER UPDATE ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION log_construction_approval();

-- Trigger: Registar upload no Diário
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
  entregavel_codigo TEXT;
BEGIN
  -- Buscar categoria "Desenhos"
  SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Desenhos' LIMIT 1;

  -- Buscar código do entregável
  SELECT codigo INTO entregavel_codigo FROM projeto_entregaveis WHERE id = NEW.entregavel_id;

  INSERT INTO projeto_diario (
    projeto_id,
    categoria_id,
    titulo,
    descricao,
    tipo,
    fonte,
    data_evento
  ) VALUES (
    NEW.projeto_id,
    categoria_id,
    CASE WHEN NEW.versao = 1 THEN 'Novo ficheiro carregado' ELSE 'Nova versão carregada' END,
    'Ficheiro "' || NEW.nome_ficheiro || '" (' || COALESCE(entregavel_codigo, '') || ') versão ' || NEW.versao || ' carregado por ' || COALESCE(NEW.carregado_por_nome, 'Utilizador'),
    'auto',
    'central_entregas',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_file_upload
  AFTER INSERT ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION log_file_upload();

-- View: Documentos aprovados para Execução na Obra
CREATE OR REPLACE VIEW obra_documentos_execucao AS
SELECT
  ef.id,
  ef.nome_ficheiro,
  ef.tipo_ficheiro,
  ef.ficheiro_url,
  ef.versao,
  ef.tamanho_bytes,
  ef.aprovado_em,
  ef.aprovado_por,
  ef.aprovado_por_nome,
  ef.notas,
  pe.codigo AS entregavel_codigo,
  pe.nome AS entregavel_descricao,
  pe.escala,
  pe.fase,
  p.id AS projeto_id,
  p.nome AS projeto_nome,
  o.id AS obra_id
FROM entrega_ficheiros ef
JOIN projeto_entregaveis pe ON ef.entregavel_id = pe.id
JOIN projetos p ON ef.projeto_id = p.id
LEFT JOIN obras o ON o.projeto_id = p.id
WHERE ef.aprovado_construcao = true
  AND ef.versao_atual = true
ORDER BY ef.aprovado_em DESC;

-- Storage Bucket para ficheiros de entrega (executar no Supabase Dashboard se necessário)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('delivery-files', 'delivery-files', true, 104857600)
-- ON CONFLICT (id) DO NOTHING;
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
-- =====================================================
-- DESIGN REVIEW DRAWINGS - Desenhos sobre PDFs
-- =====================================================

CREATE TABLE IF NOT EXISTS design_review_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_review_versions(id) ON DELETE CASCADE,

  -- Página e tipo
  pagina INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('pencil', 'rectangle', 'arrow', 'circle', 'line')),

  -- Dados do desenho (JSON com pontos/coordenadas)
  -- Para pencil: { points: [{x, y}, ...] }
  -- Para rectangle: { x, y, width, height }
  -- Para arrow/line: { x1, y1, x2, y2 }
  -- Para circle: { cx, cy, radius }
  data JSONB NOT NULL,

  -- Estilo
  cor TEXT DEFAULT '#EF4444',
  espessura INTEGER DEFAULT 2,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_drawings_version ON design_review_drawings(version_id);
CREATE INDEX IF NOT EXISTS idx_drawings_pagina ON design_review_drawings(pagina);

-- RLS
ALTER TABLE design_review_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON design_review_drawings FOR ALL USING (true);
-- Add data_saida column to utilizadores table if it doesn't exist
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS data_saida DATE;

-- Update employee start dates (data_entrada)
-- Luciana Ortega - 14/02/2025
UPDATE utilizadores SET data_entrada = '2025-02-14' WHERE nome ILIKE '%Luciana Ortega%';

-- Leonardo Ribeiro - 10/03/2025
UPDATE utilizadores SET data_entrada = '2025-03-10' WHERE nome ILIKE '%Leonardo Ribeiro%';

-- Caroline Roda - 24/03/2025
UPDATE utilizadores SET data_entrada = '2025-03-24' WHERE nome ILIKE '%Caroline Roda%';

-- Giovana Martins - 01/04/2025
UPDATE utilizadores SET data_entrada = '2025-04-01' WHERE nome ILIKE '%Giovana Martins%';

-- Carolina Cipriano - 23/06/2025
UPDATE utilizadores SET data_entrada = '2025-06-23' WHERE nome ILIKE '%Carolina Cipriano%';

-- Laís Silva - 14/07/2025
UPDATE utilizadores SET data_entrada = '2025-07-14' WHERE nome ILIKE '%La%s Silva%';

-- Alana Oliveira - 22/09/2025
UPDATE utilizadores SET data_entrada = '2025-09-22' WHERE nome ILIKE '%Alana Oliveira%';

-- Ana Miranda - 10/11/2025
UPDATE utilizadores SET data_entrada = '2025-11-10' WHERE nome ILIKE '%Ana Miranda%';

-- Patrícia Morais - 17/11/2025
UPDATE utilizadores SET data_entrada = '2025-11-17' WHERE nome ILIKE '%Patr%cia Morais%';

-- Add comment explaining the column
COMMENT ON COLUMN utilizadores.data_saida IS 'Data de término da colaboração na empresa. NULL se ainda está em atividade.';
-- =====================================================
-- ESCOPO DE TRABALHO - Campo para guardar escopo do projeto
-- =====================================================

-- Adicionar coluna escopo_trabalho à tabela projetos
ALTER TABLE projetos
ADD COLUMN IF NOT EXISTS escopo_trabalho TEXT;

-- Comentário para documentação
COMMENT ON COLUMN projetos.escopo_trabalho IS 'Escopo detalhado do trabalho do projeto, incluindo fases, entregáveis e condições contratuais';
-- =====================================================
-- FIX: projeto_entregas status constraint
-- Atualizar constraint para corresponder aos valores do frontend
-- =====================================================

-- Remover constraint antiga
ALTER TABLE projeto_entregas
DROP CONSTRAINT IF EXISTS projeto_entregas_status_check;

-- Adicionar constraint com os valores corretos
ALTER TABLE projeto_entregas
ADD CONSTRAINT projeto_entregas_status_check
CHECK (status IN ('pendente', 'em_preparacao', 'enviado', 'entregue', 'aprovado', 'rejeitado'));

-- Nota: Se a tabela não existir, criar com estrutura correta
-- CREATE TABLE IF NOT EXISTS projeto_entregas (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
--   tipo TEXT NOT NULL DEFAULT 'interna' CHECK (tipo IN ('interna', 'cliente')),
--   titulo TEXT NOT NULL,
--   descricao TEXT,
--   destinatario TEXT,
--   data_prevista DATE,
--   data_entrega DATE,
--   status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_preparacao', 'enviado', 'entregue', 'aprovado', 'rejeitado')),
--   documentos TEXT,
--   observacoes TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- ============================================================================
-- GAVINHO Platform — Bíblia de Licenciamentos
-- Seed Data: Concelho de Sintra
-- ============================================================================
-- Este ficheiro contém todos os dados necessários para o módulo de
-- licenciamento urbanístico do concelho de Sintra.
--
-- Executar após criar as tabelas definidas na arquitectura técnica.
-- ============================================================================

-- ============================================================================
-- 1. CONCELHO
-- ============================================================================

INSERT INTO concelhos (id, codigo, nome, activo, data_referencia_normativa, versao_pdm, config, notas)
VALUES (
    'concelho_sintra_001',
    'sintra',
    'Sintra',
    true,
    '2024-01-01',
    'PDM 1999 (com alterações)',
    '{
        "instrumentos_aplicaveis": [
            "Plano Diretor Municipal de Sintra",
            "Regulamento Municipal de Urbanização e Edificação",
            "RJUE",
            "RJIGT"
        ],
        "entidades_externas": [
            {"codigo": "ICNF", "nome": "Instituto da Conservação da Natureza e das Florestas"},
            {"codigo": "APA", "nome": "Agência Portuguesa do Ambiente"},
            {"codigo": "DGADR", "nome": "Direção-Geral de Agricultura e Desenvolvimento Rural"},
            {"codigo": "DGPC", "nome": "Direção-Geral do Património Cultural"}
        ],
        "regimes_especificos": ["PNSC", "REN", "RAN", "Natura2000"]
    }',
    'Dados carregados a partir da Bíblia de Licenciamento GAVINHO v1.0'
);

-- ============================================================================
-- 2. MATRIZES DE DECISÃO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1. Matriz Solo × Uso — Solo Urbano (Matriz 3.1.A)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_solo_uso_urbano',
    'concelho_sintra_001',
    'solo_uso_urbano',
    'Matriz Solo × Uso — Solo Urbano',
    'Admissibilidade de usos por categoria de espaço urbano. Baseada no PDM de Sintra e interpretação técnica GAVINHO.',
    '{
        "espacos_centrais": {
            "uso_dominante": "misto",
            "habitacao": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "turismo": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "atividades_economicas": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "equipamentos": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            }
        },
        "espacos_habitacionais": {
            "uso_dominante": "habitacao",
            "habitacao": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional, tráfego, ruído e inserção urbana"
            },
            "atividades_economicas": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional, tráfego, ruído e inserção urbana"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional"
            }
        },
        "espacos_baixa_densidade": {
            "uso_dominante": "habitacao",
            "habitacao": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            },
            "atividades_economicas": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral não admissível. Apenas exceções fundamentadas e interesse público"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            }
        },
        "espacos_atividades_economicas": {
            "uso_dominante": "economico",
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral não admissível. Apenas exceções fundamentadas e interesse público"
            },
            "turismo": {
                "admissibilidade": "excecional",
                "notas": "Enquadramento excecional apenas"
            },
            "atividades_economicas": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional"
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.2. Matriz Solo × Uso — Solo Rústico (Matriz 3.1.B)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_solo_uso_rustico',
    'concelho_sintra_001',
    'solo_uso_rustico',
    'Matriz Solo × Uso — Solo Rústico',
    'Admissibilidade de usos por categoria de espaço rústico. Edificação funcional = estritamente ligada ao uso dominante.',
    '{
        "espacos_naturais": {
            "uso_dominante": "conservacao_ecologica",
            "edificacao_nova": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral proibida"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "equipamentos": {
                "admissibilidade": "excecional",
                "notas": "Apenas infraestruturas essenciais e valorização ambiental"
            }
        },
        "espacos_florestais": {
            "uso_dominante": "producao_florestal",
            "edificacao_nova": {
                "admissibilidade": "funcional",
                "notas": "Apenas funcional e justificada para exploração florestal"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Apenas turismo compatível com função florestal"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige justificação funcional"
            }
        },
        "espacos_agricolas": {
            "uso_dominante": "producao_agricola",
            "edificacao_nova": {
                "admissibilidade": "funcional",
                "notas": "Estritamente associada à exploração agrícola"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Associado à exploração agrícola (agroturismo)"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige justificação funcional"
            }
        },
        "espacos_ocupacao_turistica": {
            "uso_dominante": "turismo",
            "edificacao_nova": {
                "admissibilidade": "condicionado",
                "notas": "Forte justificação territorial e ambiental exigida"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "admissivel",
                "notas": "Regime próprio aplicável"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Complementares ao uso turístico"
            }
        },
        "aglomerados_rurais": {
            "uso_dominante": "misto_limitado",
            "edificacao_nova": {
                "admissibilidade": "limitado",
                "notas": "Escala muito controlada"
            },
            "habitacao": {
                "admissibilidade": "condicionado",
                "notas": "Escala controlada, integração no aglomerado"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Escala controlada"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "De proximidade apenas"
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.3. Matriz Pareceres Externos (Matriz 3.2)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_pareceres',
    'concelho_sintra_001',
    'pareceres_externos',
    'Matriz Solo × Uso × Necessidade de Parecer Externo',
    'Identificação de pareceres vinculativos e técnicos por regime aplicável.',
    '{
        "regimes": {
            "pnsc": {
                "ICNF": {"necessario": true, "natureza": "vinculativo"},
                "APA": {"necessario": "possivel", "natureza": "tecnico"},
                "DGPC": {"necessario": "se_patrimonio", "natureza": "vinculativo"}
            },
            "natura2000": {
                "ICNF": {"necessario": true, "natureza": "vinculativo"},
                "APA": {"necessario": "possivel", "natureza": "tecnico"},
                "DGPC": {"necessario": "se_patrimonio", "natureza": "vinculativo"}
            },
            "ren": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": true, "natureza": "vinculativo"},
                "DGPC": {"necessario": false}
            },
            "ran": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGADR": {"necessario": true, "natureza": "vinculativo"},
                "DGPC": {"necessario": false}
            },
            "patrimonio_classificado": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGPC": {"necessario": true, "natureza": "vinculativo"}
            },
            "arqueologia": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGPC": {"necessario": true, "natureza": "tecnico"}
            },
            "cheias": {
                "APA": {"necessario": true, "natureza": "tecnico"},
                "CMS": {"necessario": true, "natureza": "tecnico"}
            },
            "incendio": {
                "ICNF": {"necessario": true, "natureza": "tecnico"},
                "ANEPC": {"necessario": true, "natureza": "tecnico"}
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.4. Matriz Preexistências × Ampliação × Legalização (Matriz 3.4)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_preexistencias',
    'concelho_sintra_001',
    'preexistencias',
    'Matriz Preexistências × Ampliação × Legalização',
    'Regras para ampliação e legalização de edificações existentes. CRÍTICO: tema mais sensível do licenciamento em Sintra.',
    '{
        "definicao_preexistencia_valida": {
            "criterios": [
                "Edificação anterior à entrada em vigor do PDM de Sintra (1999)",
                "Possui título válido (licença, autorização, comunicação prévia eficaz)",
                "Dispõe de direito ou expectativa juridicamente protegida (PIP favorável, projeto aprovado)"
            ],
            "nota_critica": "Edificações ilegais posteriores a 1999 NÃO geram direitos"
        },
        "ampliacao": {
            "solo_urbano": {
                "admissibilidade": "admissivel",
                "limite": "20% da área de construção existente",
                "condicoes": ["Integração urbana", "Respeito pelos parâmetros aplicáveis"]
            },
            "solo_rustico_fora_pnsc_natura": {
                "admissibilidade": "condicionado",
                "limite": "20% da área de construção existente",
                "condicoes": ["Não agravar desconformidades existentes"]
            },
            "pnsc_natura2000": {
                "admissibilidade": "inviavel",
                "notas": "Ampliação não admitida como regra geral"
            },
            "orla_costeira_sensivel": {
                "admissibilidade": "inviavel",
                "notas": "Apenas obras de segurança"
            },
            "espacos_naturais": {
                "admissibilidade": "inviavel",
                "notas": "Sem exceções"
            }
        },
        "legalizacao": {
            "construcao_anterior_1999": {
                "admissibilidade": "admissivel",
                "notas": "Sujeita a requisitos técnicos específicos"
            },
            "construcao_ilegal_pos_1999": {
                "admissibilidade": "inviavel",
                "notas": "Sem regime excecional aplicável"
            },
            "regime_dl_165_2014": {
                "admissibilidade": "condicionado",
                "notas": "Apenas nos termos exatos da decisão administrativa"
            },
            "em_ren_ran": {
                "admissibilidade": "condicionado",
                "notas": "Parecer vinculativo obrigatório"
            },
            "em_pnsc_natura": {
                "admissibilidade": "inviavel",
                "notas": "Exceções muito restritas"
            }
        },
        "notas_criticas": [
            "A ampliação nunca pode exaurir edificabilidade futura",
            "Anexos não são ampliáveis",
            "Não somar ampliações sucessivas",
            "Não usar anexos como ampliação encapotada",
            "O que sempre existiu não é automaticamente legal"
        ],
        "erros_recorrentes": [
            "Confundir tolerância administrativa com direito legal",
            "Somar ampliações sucessivas além do limite",
            "Usar anexos como ampliação encapotada",
            "Assumir que o que sempre existiu é automaticamente legal"
        ]
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.5. Matriz Turismo (Matriz 3.5)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_turismo',
    'concelho_sintra_001',
    'turismo',
    'Matriz Turismo — Urbano vs Solo Rústico',
    'ALTO RISCO: Uso turístico é um dos mais fiscalizados e condicionados no concelho de Sintra.',
    '{
        "tipologias": [
            "Estabelecimentos hoteleiros",
            "Turismo de habitação",
            "Turismo em espaço rural",
            "Empreendimentos turísticos complementares"
        ],
        "solo_urbano": {
            "espacos_centrais": {
                "admissibilidade": "admissivel",
                "condicoes_criticas": ["Integração urbana", "Tráfego", "Ruído"]
            },
            "espacos_habitacionais": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Compatibilidade funcional demonstrada"]
            },
            "espacos_baixa_densidade": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Volumetria adequada", "Integração paisagística"]
            },
            "espacos_atividades_economicas": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Enquadramento excecional necessário"]
            }
        },
        "solo_rustico": {
            "espacos_naturais": {
                "admissibilidade": "inviavel",
                "regra_base": "Não admissível"
            },
            "espacos_florestais": {
                "admissibilidade": "condicionado",
                "regra_base": "Apenas turismo compatível com função florestal"
            },
            "espacos_agricolas": {
                "admissibilidade": "condicionado",
                "regra_base": "Associado à exploração agrícola (agroturismo)"
            },
            "espacos_ocupacao_turistica": {
                "admissibilidade": "admissivel",
                "regra_base": "Regime próprio aplicável"
            },
            "aglomerados_rurais": {
                "admissibilidade": "condicionado",
                "regra_base": "Escala controlada"
            }
        },
        "areas_sensiveis": {
            "pnsc": {
                "admissibilidade": "inviavel",
                "observacoes": "Exceções raríssimas"
            },
            "natura2000": {
                "admissibilidade": "condicionado",
                "observacoes": "Avaliação de incidências ambientais obrigatória"
            },
            "ren": {
                "admissibilidade": "condicionado",
                "observacoes": "Apenas usos compatíveis"
            },
            "orla_costeira": {
                "admissibilidade": "inviavel",
                "observacoes": "Forte restrição aplicável"
            }
        },
        "regra_chave": "Turismo em solo rústico NUNCA é automático. Exige sempre demonstração de compatibilidade territorial."
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.6. Matriz Regimes Ambientais Cumulativos (Matriz 3.6)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_regimes_ambientais',
    'concelho_sintra_001',
    'regimes_ambientais',
    'Matriz Cumulativa de Regimes Ambientais',
    'CRÍTICO: Todos os regimes são CUMULATIVOS e nenhum pode ser analisado isoladamente.',
    '{
        "regimes_considerados": [
            "Reserva Ecológica Nacional (REN)",
            "Reserva Agrícola Nacional (RAN)",
            "Rede Natura 2000",
            "Parque Natural de Sintra-Cascais (PNSC)",
            "Zonas ameaçadas por cheias",
            "Perigosidade de incêndio rural"
        ],
        "matriz_operacao": {
            "ren": {
                "construcao_nova": {"admissibilidade": "inviavel", "notas": "Regra geral"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "ran": {
                "construcao_nova": {"admissibilidade": "inviavel", "notas": "Regra geral"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "natura2000": {
                "construcao_nova": {"admissibilidade": "condicionado"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "pnsc": {
                "construcao_nova": {"admissibilidade": "inviavel"},
                "ampliacao": {"admissibilidade": "inviavel"},
                "legalizacao": {"admissibilidade": "inviavel"},
                "turismo": {"admissibilidade": "inviavel"}
            },
            "zonas_cheias": {
                "construcao_nova": {"admissibilidade": "inviavel"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "inviavel"}
            },
            "incendio_elevado": {
                "construcao_nova": {"admissibilidade": "condicionado"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            }
        },
        "pareceres_obrigatorios": {
            "ren": {"entidade": "APA", "natureza": "vinculativo"},
            "ran": {"entidade": "DGADR", "natureza": "vinculativo"},
            "natura2000": {"entidade": "ICNF", "natureza": "vinculativo"},
            "pnsc": {"entidade": "ICNF", "natureza": "vinculativo"},
            "cheias": {"entidades": ["APA", "CMS"], "natureza": "tecnico"},
            "incendio": {"entidades": ["ICNF", "ANEPC"], "natureza": "tecnico"}
        },
        "principios_inferencia": [
            "A ausência de proibição explícita NÃO equivale a permissão",
            "Índices máximos NÃO são direitos adquiridos",
            "TODOS os regimes são cumulativos",
            "O contexto territorial prevalece sobre a conveniência programática"
        ],
        "erros_criticos_evitar": [
            "Analisar REN, RAN ou Natura isoladamente",
            "Assumir que parecer favorável elimina outros regimes",
            "Tratar zonas de cheias como mera condicionante técnica"
        ]
    }',
    true,
    1
);

-- ============================================================================
-- 3. FLUXO GLOBAL DE DECISÃO (Volume IV)
-- ============================================================================

INSERT INTO concelho_fluxo_decisao (id, concelho_id, fluxo, activo, versao)
VALUES (
    'fluxo_sintra_001',
    'concelho_sintra_001',
    '{
        "versao": "1.0",
        "descricao": "Fluxo Global de Decisão — Árvore Lógica para análise de viabilidade urbanística em Sintra",
        "inicio": "n1",
        "nodes": [
            {
                "id": "n1",
                "titulo": "NÓ 1 — Identificação do solo",
                "tipo": "decisao",
                "pergunta": "O terreno está classificado como solo urbano?",
                "opcoes": [
                    {"resposta": "sim", "proximo": "n2a"},
                    {"resposta": "nao", "proximo": "n2b"}
                ]
            },
            {
                "id": "n2a",
                "titulo": "NÓ 2A — Qualificação do solo urbano",
                "tipo": "decisao",
                "pergunta": "Qual a categoria de espaço urbano?",
                "opcoes": [
                    {"resposta": "espacos_centrais", "proximo": "n3"},
                    {"resposta": "espacos_habitacionais", "proximo": "n3"},
                    {"resposta": "espacos_baixa_densidade", "proximo": "n3", "notas": "Aplicar restrições volumétricas"},
                    {"resposta": "espacos_atividades_economicas", "proximo": "n3", "notas": "Uso habitacional condicionado"}
                ]
            },
            {
                "id": "n2b",
                "titulo": "NÓ 2B — Qualificação do solo rústico",
                "tipo": "decisao_com_resultado",
                "pergunta": "Qual a categoria de solo rústico?",
                "opcoes": [
                    {
                        "resposta": "espacos_naturais",
                        "resultado": {
                            "classificacao": "inviavel",
                            "fundamentacao": "Espaços naturais não admitem edificação como regra geral",
                            "matriz_aplicada": "3.1.B"
                        }
                    },
                    {"resposta": "espacos_florestais", "proximo": "n3", "notas": "Uso funcional apenas"},
                    {"resposta": "espacos_agricolas", "proximo": "n3", "notas": "Uso funcional apenas"},
                    {"resposta": "espacos_ocupacao_turistica", "proximo": "n3"},
                    {"resposta": "aglomerados_rurais", "proximo": "n3", "notas": "Escala limitada"}
                ]
            },
            {
                "id": "n3",
                "titulo": "NÓ 3 — Regimes ambientais cumulativos",
                "tipo": "verificacao_multipla",
                "pergunta": "O local está abrangido por algum regime ambiental?",
                "verificacoes": [
                    {"regime": "pnsc", "se_sim": {"resultado": {"classificacao": "inviavel", "fundamentacao": "PNSC não admite edificação nova", "matriz_aplicada": "3.6"}}},
                    {"regime": "ren", "se_sim": {"proximo": "n3_ren"}},
                    {"regime": "ran", "se_sim": {"proximo": "n3_ran"}},
                    {"regime": "natura2000", "se_sim": {"proximo": "n3_natura"}},
                    {"regime": "cheias", "se_sim": {"proximo": "n3_cheias"}},
                    {"regime": "incendio", "se_sim": {"flag": "incendio_elevado"}}
                ],
                "se_nenhum": {"proximo": "n4"}
            },
            {
                "id": "n3_ren",
                "titulo": "NÓ 3 (REN) — Avaliação REN",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova em REN não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_apa_obrigatorio"]
                }
            },
            {
                "id": "n3_ran",
                "titulo": "NÓ 3 (RAN) — Avaliação RAN",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova em RAN não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_dgadr_obrigatorio"]
                }
            },
            {
                "id": "n3_natura",
                "titulo": "NÓ 3 (Natura) — Avaliação Natura 2000",
                "tipo": "passagem",
                "proximo": "n4",
                "flags": ["parecer_icnf_obrigatorio", "avaliacao_incidencias_obrigatoria"]
            },
            {
                "id": "n3_cheias",
                "titulo": "NÓ 3 (Cheias) — Avaliação Zonas de Cheias",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova OR operacao.uso == turismo",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova ou turismo em zonas de cheias não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_apa_tecnico"]
                }
            },
            {
                "id": "n4",
                "titulo": "NÓ 4 — Existência de preexistência válida",
                "tipo": "decisao",
                "pergunta": "Existe edificação legal ou juridicamente protegida?",
                "opcoes": [
                    {"resposta": "nao", "proximo": "n5"},
                    {"resposta": "sim", "proximo": "n6"}
                ]
            },
            {
                "id": "n5",
                "titulo": "NÓ 5 — Construção nova",
                "tipo": "avaliacao_matrizes",
                "descricao": "Verificar cumulativamente matrizes aplicáveis",
                "matrizes_aplicar": [
                    {"matriz": "solo_uso_urbano", "condicao": "solo.classificacao == urbano"},
                    {"matriz": "solo_uso_rustico", "condicao": "solo.classificacao == rustico"},
                    {"matriz": "turismo", "condicao": "operacao.uso == turismo"},
                    {"matriz": "regimes_ambientais", "sempre": true}
                ],
                "regra": "SE algum resultado == inviavel ENTÃO classificacao = inviavel",
                "proximo": "n7"
            },
            {
                "id": "n6",
                "titulo": "NÓ 6 — Preexistências",
                "tipo": "decisao",
                "pergunta": "Tipo de intervenção pretendida?",
                "opcoes": [
                    {
                        "resposta": "ampliacao",
                        "proximo": "n6_ampliacao"
                    },
                    {
                        "resposta": "legalizacao",
                        "proximo": "n6_legalizacao"
                    }
                ]
            },
            {
                "id": "n6_ampliacao",
                "titulo": "NÓ 6 (Ampliação) — Avaliação de Ampliação",
                "tipo": "avaliacao_matriz",
                "matriz": "preexistencias",
                "campo": "ampliacao",
                "verificacoes": [
                    {"condicao": "localizacao IN [pnsc, natura2000, orla_costeira, espacos_naturais]", "resultado": {"classificacao": "inviavel"}},
                    {"condicao": "ampliacao > 20%", "resultado": {"classificacao": "inviavel", "fundamentacao": "Ampliação excede limite de 20%"}},
                    {"default": {"classificacao": "viavel_condicionado", "condicoes": ["Não agravar desconformidades", "Respeitar limite de 20% Ac"]}}
                ],
                "proximo": "n7"
            },
            {
                "id": "n6_legalizacao",
                "titulo": "NÓ 6 (Legalização) — Avaliação de Legalização",
                "tipo": "avaliacao_matriz",
                "matriz": "preexistencias",
                "campo": "legalizacao",
                "verificacoes": [
                    {"condicao": "preexistencia.ano_construcao >= 1999 AND NOT preexistencia.titulo_valido", "resultado": {"classificacao": "inviavel", "fundamentacao": "Construção ilegal posterior a 1999 não admite legalização"}},
                    {"condicao": "localizacao IN [pnsc, natura2000]", "resultado": {"classificacao": "inviavel", "fundamentacao": "Legalização em PNSC/Natura não admissível"}},
                    {"condicao": "preexistencia.ano_construcao < 1999", "resultado": {"classificacao": "viavel_condicionado", "condicoes": ["Requisitos técnicos específicos"]}},
                    {"default": {"classificacao": "viavel_condicionado"}}
                ],
                "proximo": "n7"
            },
            {
                "id": "n7",
                "titulo": "NÓ 7 — Uso turístico",
                "tipo": "verificacao",
                "condicao": "operacao.uso == turismo",
                "verdadeiro": {
                    "descricao": "Aplicar integralmente Matriz de Turismo",
                    "matriz": "turismo",
                    "proximo": "n8"
                },
                "falso": {
                    "proximo": "n8"
                }
            },
            {
                "id": "n8",
                "titulo": "NÓ 8 — Pareceres vinculativos",
                "tipo": "verificacao_pareceres",
                "descricao": "Verificar necessidade e sentido dos pareceres",
                "pareceres_possiveis": ["APA", "ICNF", "DGADR", "DGPC"],
                "regra": "SE algum parecer vinculativo == desfavorável ENTÃO classificacao = inviavel",
                "proximo": "n9"
            },
            {
                "id": "n9",
                "titulo": "NÓ 9 — DECISÃO FINAL",
                "tipo": "resultado_final",
                "descricao": "Classificação obrigatória com fundamentação",
                "classificacoes_possiveis": [
                    {"valor": "viavel", "simbolo": "✔️", "descricao": "VIÁVEL"},
                    {"valor": "viavel_condicionado", "simbolo": "⚠️", "descricao": "VIÁVEL CONDICIONADO"},
                    {"valor": "inviavel", "simbolo": "❌", "descricao": "INVIÁVEL"}
                ],
                "obrigatorios": [
                    "fundamentacao_normativa",
                    "matrizes_aplicadas",
                    "regimes_identificados",
                    "pareceres_necessarios"
                ]
            }
        ]
    }',
    true,
    1
);

-- ============================================================================
-- 4. PROMPTS BASE — ANÁLISE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1. Viabilidade Geral — Modo Interno
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_viabilidade_interno',
    'concelho_sintra_001',
    'viabilidade_geral_interno',
    'Viabilidade Geral (Interno)',
    'interno',
    'analise',
    'Analisa a viabilidade urbanística do imóvel com os seguintes dados:

{{INPUT_NORMALIZADO}}

Segue obrigatoriamente o Fluxo Global de Decisão da GAVINHO e as Matrizes aplicáveis.

Indica:
- classificação final (viável / viável condicionado / inviável)
- fundamentação normativa (com referência às matrizes aplicadas)
- regimes determinantes
- riscos críticos identificados
- pareceres externos necessários

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.2. Viabilidade Geral — Modo Cliente
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_viabilidade_cliente',
    'concelho_sintra_001',
    'viabilidade_geral_cliente',
    'Viabilidade Geral (Cliente)',
    'cliente',
    'analise',
    'Avalia a viabilidade do imóvel descrito abaixo e apresenta uma conclusão clara para cliente final.

{{INPUT_NORMALIZADO}}

Indica apenas:
- se é viável, viável condicionado ou inviável
- principais condicionantes (em linguagem clara)
- próximos passos recomendados

Utiliza linguagem clara, profissional e prudente.
Não utilizes referências internas (matrizes, nós, regras) nem linguagem jurídica excessiva.

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.3. Posso Construir Aqui?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_construir',
    'concelho_sintra_001',
    'posso_construir',
    'Posso Construir Aqui?',
    'interno',
    'analise',
    'Com base no PDM de Sintra, indica se o uso pretendido é admissível no local descrito.

{{INPUT_NORMALIZADO}}

Aplica a Matriz Solo × Uso (3.1.A ou 3.1.B conforme classificação) e identifica exclusões imediatas.

Responde de forma directa:
- O uso é admissível, condicionado ou não admissível?
- Qual a fundamentação normativa?
- Existem exclusões imediatas (ex: espaços naturais)?

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.4. Uso Turístico
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_turismo',
    'concelho_sintra_001',
    'uso_turistico',
    'Avaliação de Uso Turístico',
    'interno',
    'analise',
    'Avalia a admissibilidade do uso turístico no local descrito.

{{INPUT_NORMALIZADO}}

Aplica integralmente a Matriz de Turismo (3.5) e os regimes ambientais cumulativos (3.6).

ATENÇÃO: O uso turístico é um dos mais fiscalizados e condicionados no concelho de Sintra.

Indica:
- se o turismo é admissível, condicionado ou não admissível
- tipologia turística mais adequada (se aplicável)
- condicionantes territoriais específicas
- pareceres obrigatórios

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.5. Posso Ampliar?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_ampliar',
    'concelho_sintra_001',
    'posso_ampliar',
    'Posso Ampliar?',
    'interno',
    'analise',
    'Verifica se a edificação existente pode ser ampliada.

{{INPUT_NORMALIZADO}}

Aplica a Matriz de Preexistências × Ampliação (3.4).

Verifica obrigatoriamente:
1. A preexistência é válida? (anterior a 1999 OU com título válido)
2. A localização permite ampliação? (excluir PNSC, Natura, orla costeira, espaços naturais)
3. Qual o limite máximo de ampliação? (regra geral: 20% Ac)

Indica:
- se a ampliação é admissível
- limite máximo aplicável
- condições obrigatórias (ex: não agravar desconformidades)

NOTAS CRÍTICAS:
- Anexos não são ampliáveis
- Não somar ampliações sucessivas
- A ampliação nunca pode exaurir edificabilidade futura

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.6. Posso Legalizar?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_legalizar',
    'concelho_sintra_001',
    'posso_legalizar',
    'Posso Legalizar?',
    'interno',
    'analise',
    'Avalia a possibilidade de legalização da edificação existente.

{{INPUT_NORMALIZADO}}

Aplica a Matriz de Preexistências × Legalização (3.4).

Considera obrigatoriamente:
1. Data de construção (anterior ou posterior a 1999)
2. Existência de título ou regime excecional (DL 165/2014)
3. Regimes aplicáveis (REN, RAN, PNSC, Natura)
4. Exclusões absolutas

REGRAS CRÍTICAS:
- Construção ilegal posterior a 1999 = NÃO LEGALIZÁVEL
- PNSC/Natura = exceções muito restritas
- REN/RAN = parecer vinculativo obrigatório

Indica:
- se a legalização é possível
- regime aplicável
- requisitos específicos
- pareceres necessários

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.7. Impacto Ambiental
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_impacto_ambiental',
    'concelho_sintra_001',
    'impacto_ambiental',
    'Impacto dos Regimes Ambientais',
    'interno',
    'analise',
    'Identifica todos os regimes ambientais aplicáveis ao local.

{{INPUT_NORMALIZADO}}

Aplica cumulativamente a Matriz de Regimes Ambientais (3.6).

REGIMES A VERIFICAR:
- REN (Reserva Ecológica Nacional)
- RAN (Reserva Agrícola Nacional)
- Natura 2000
- PNSC (Parque Natural Sintra-Cascais)
- Zonas ameaçadas por cheias
- Perigosidade de incêndio rural

Para cada regime aplicável, indica:
- Impacto na operação pretendida (impede / condiciona / permite)
- Pareceres obrigatórios (entidade + natureza: vinculativo/técnico)

PRINCÍPIOS OBRIGATÓRIOS:
- Todos os regimes são CUMULATIVOS
- Ausência de proibição ≠ permissão
- Parecer favorável de um não elimina outros regimes

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.8. Texto para Relatório
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_texto_relatorio',
    'concelho_sintra_001',
    'texto_relatorio',
    'Texto para Relatório de Viabilidade',
    'cliente',
    'geracao',
    'Redige o texto da conclusão de um Relatório de Viabilidade Urbanística para cliente, com base na análise abaixo:

{{ANALISE_INTERNA}}

Utiliza linguagem clara, profissional e prudente.

REGRAS:
- Não utilizes referências internas (matrizes, nós, regras)
- Não utilizes linguagem jurídica excessiva
- Privilegia frases como:
  - "À luz do enquadramento urbanístico aplicável em Sintra…"
  - "A viabilidade encontra-se condicionada a…"
  - "O enquadramento territorial não permite…"

Estrutura o texto em:
1. Síntese da conclusão (viável / viável condicionado / inviável)
2. Principais condicionantes
3. Próximos passos recomendados

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ============================================================================
-- 5. PROMPTS DE VALIDAÇÃO CRUZADA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. Auditoria Técnica Completa (VC-1)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc1_auditoria',
    'concelho_sintra_001',
    'vc1_auditoria_completa',
    'Auditoria Técnica Completa',
    'interno',
    'validacao',
    'Audita criticamente a seguinte análise urbanística:

{{RESPOSTA_IA}}

Verifica obrigatoriamente:
- se o Fluxo Global de Decisão foi seguido sem saltos
- se existem regimes ambientais ou patrimoniais não considerados
- se a classificação do solo está corretamente aplicada
- se a conclusão é excessivamente otimista

Identifica:
- erros
- omissões
- pontos de risco
- aspetos que exigem validação humana

A IA não pode confirmar a resposta sem a questionar.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.2. Validação de Solo e Uso (VC-2)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc2_solo_uso',
    'concelho_sintra_001',
    'vc2_validacao_solo_uso',
    'Validação de Solo e Uso',
    'interno',
    'validacao',
    'Reavalia a compatibilidade entre solo e uso na análise seguinte:

{{RESPOSTA_IA}}

Confirma:
- correta identificação da classificação e qualificação do solo
- aplicação da Matriz Solo × Uso correta (3.1.A ou 3.1.B)
- inexistência de exceções indevidamente assumidas

Indica se a análise está correcta ou se existem erros/omissões.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.3. Validação de Regimes Ambientais (VC-3)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc3_regimes',
    'concelho_sintra_001',
    'vc3_validacao_regimes',
    'Validação de Regimes Ambientais',
    'interno',
    'validacao',
    'Analisa se todos os regimes ambientais aplicáveis foram considerados na resposta seguinte:

{{RESPOSTA_IA}}

Verifica cumulatividade de:
- REN
- RAN
- Natura 2000
- PNSC
- cheias
- incêndio

Indica se algum regime deveria conduzir a inviabilidade ou maior condicionamento do que o indicado na análise.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.4. Validação de Preexistências (VC-4)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc4_preexistencias',
    'concelho_sintra_001',
    'vc4_validacao_preexistencias',
    'Validação de Preexistências',
    'interno',
    'validacao',
    'Audita a análise relativa a preexistências e ampliações:

{{RESPOSTA_IA}}

Confirma:
- validade temporal e legal da preexistência
- respeito pelo limite máximo de ampliação (20% Ac)
- inexistência de anexos considerados como ampliação
- não agravamento de desconformidades

Indica se a análise está correcta ou se existem erros/omissões.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.5. Validação de Turismo (VC-5)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc5_turismo',
    'concelho_sintra_001',
    'vc5_validacao_turismo',
    'Validação de Turismo',
    'interno',
    'validacao',
    'Reavalia criticamente a admissibilidade do uso turístico indicada abaixo:

{{RESPOSTA_IA}}

Confirma:
- compatibilidade com a categoria de solo
- respeito pelos regimes ambientais (especialmente PNSC)
- inexistência de pressupostos não garantidos

LEMBRETE: O uso turístico é um dos mais fiscalizados em Sintra.

Indica se a análise está correcta ou se é demasiado optimista.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.6. Nível de Confiança (VC-6)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc6_confianca',
    'concelho_sintra_001',
    'vc6_nivel_confianca',
    'Classificação de Nível de Confiança',
    'interno',
    'validacao',
    'Classifica o nível de confiança da conclusão seguinte:

{{RESPOSTA_IA}}

Utiliza exclusivamente uma das categorias:
- ALTA — decisão clara e pouco controvertida
- MÉDIA — decisão plausível mas dependente de pareceres
- BAIXA — decisão frágil ou altamente condicionada

Justifica brevemente a classificação.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.7. Reforço de Prudência (VC-7)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc7_prudencia',
    'concelho_sintra_001',
    'vc7_reforco_prudencia',
    'Reforço de Prudência',
    'interno',
    'validacao',
    'Reformula a conclusão seguinte de forma mais conservadora e defensável:

{{RESPOSTA_IA}}

Objectivos:
- Reduzir afirmações categóricas
- Reforçar condicionantes
- Enfatizar dependência de validação administrativa
- Usar linguagem mais prudente

A reformulação deve ser utilizável em contexto de relatório para cliente.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.8. Extracção de Dados (Chat Conversacional)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_extracao_dados',
    'concelho_sintra_001',
    'extracao_dados_chat',
    'Extracção de Dados do Chat',
    'interno',
    'analise',
    'O utilizador descreveu o seguinte caso:

"{{DESCRICAO_LIVRE}}"

Extrai os dados no formato INPUT normalizado:

localizacao:
  concelho: Sintra (confirmar)
  freguesia: (identificar ou perguntar)
  morada: (identificar ou perguntar)

solo:
  classificacao: urbano | rustico (identificar ou perguntar)
  qualificacao: (identificar ou perguntar)
  categoria_espaco: (identificar ou perguntar)

regimes:
  REN: sim | nao | desconhecido
  RAN: sim | nao | desconhecido
  Natura2000: sim | nao | desconhecido
  PNSC: sim | nao | desconhecido
  cheias: sim | nao | desconhecido
  incendio: sim | nao | desconhecido

preexistencia:
  existe: sim | nao
  valida: sim | nao | desconhecido
  ano_construcao: (se aplicável)
  area_construcao: (se conhecida)

operacao:
  tipo: construcao_nova | ampliacao | legalizacao
  uso: habitacao | turismo | equipamento | atividades_economicas
  programa: (descrição breve)

Para campos marcados como "desconhecido" ou que não conseguiste identificar,
formula perguntas claras e específicas para obter a informação em falta.

Responde em formato estruturado indicando:
1. Dados extraídos
2. Perguntas necessárias para completar o INPUT',
    true,
    1
);

-- ============================================================================
-- 6. ÍNDICES ADICIONAIS (Performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matrizes_concelho_tipo_activo
ON concelho_matrizes(concelho_id, tipo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_prompts_concelho_codigo_activo
ON concelho_prompts(concelho_id, codigo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_fluxo_concelho_activo
ON concelho_fluxo_decisao(concelho_id) WHERE activo = true;

-- ============================================================================
-- FIM DO FICHEIRO
-- ============================================================================
-- =====================================================
-- GAVINHO Platform - Licenciamentos Module
-- Database Schema Migration
-- =====================================================

-- 1. Tabela: concelhos
-- Armazena a configuração de cada concelho suportado
CREATE TABLE IF NOT EXISTS concelhos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    codigo TEXT UNIQUE NOT NULL,           -- 'sintra', 'lisboa'
    nome TEXT NOT NULL,                    -- 'Sintra', 'Lisboa'
    activo BOOLEAN DEFAULT true,

    -- Configuração específica do concelho
    config JSONB NOT NULL DEFAULT '{}',

    -- Metadados
    data_referencia_normativa DATE,        -- Data de referência do PDM
    versao_pdm TEXT,
    notas TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO concelhos (codigo, nome, data_referencia_normativa, versao_pdm, activo) VALUES
('sintra', 'Sintra', '2024-01-01', 'PDM 1999 (alterado)', true),
('lisboa', 'Lisboa', NULL, NULL, false)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Tabela: analises_viabilidade
-- Armazena cada análise de viabilidade urbanística
CREATE TABLE IF NOT EXISTS analises_viabilidade (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    codigo TEXT UNIQUE,                    -- 'VU-2025-001'

    -- Associação (uma das duas obrigatória)
    projeto_id TEXT REFERENCES projetos(id) ON DELETE SET NULL,
    lead_id TEXT,                          -- Para prospecção (sem FK por enquanto)

    -- Contexto territorial
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    -- Identificação do imóvel
    localizacao JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "morada": "...",
        "freguesia": "...",
        "artigo_matricial": "...",
        "descricao_predial": "..."
    }
    */

    -- Classificação do solo (INPUT normalizado)
    solo JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "classificacao": "urbano" | "rustico",
        "qualificacao": "...",
        "categoria_espaco": "..."
    }
    */

    -- Regimes aplicáveis
    regimes JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "ren": true/false,
        "ran": true/false,
        "natura2000": true/false,
        "pnsc": true/false,
        "cheias": true/false,
        "incendio": true/false,
        "patrimonio": {
            "classificado": true/false,
            "inventariado": true/false,
            "arqueologia": true/false
        }
    }
    */

    -- Preexistência
    preexistencia JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "existe": true/false,
        "valida": true/false,
        "ano_construcao": 1985,
        "titulo": "...",
        "area_construcao": 120
    }
    */

    -- Operação pretendida
    operacao JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "tipo": "construcao_nova" | "ampliacao" | "legalizacao",
        "uso": "habitacao" | "turismo" | "equipamento" | "atividades_economicas",
        "programa": "...",
        "area_pretendida": 250
    }
    */

    -- Resultado da análise
    resultado JSONB,
    /*
    {
        "classificacao": "viavel" | "viavel_condicionado" | "inviavel",
        "nivel_confianca": "alta" | "media" | "baixa",
        "fundamentacao": [...],
        "condicionantes": [...],
        "pareceres_necessarios": [...],
        "proximos_passos": [...]
    }
    */

    -- Histórico de interacções com IA
    historico_ia JSONB DEFAULT '[]',

    -- Estado do workflow
    estado TEXT DEFAULT 'rascunho',        -- 'rascunho', 'em_analise', 'validado', 'finalizado'
    validado_por TEXT REFERENCES utilizadores(id),
    validado_em TIMESTAMPTZ,

    -- Metadados
    created_by TEXT NOT NULL REFERENCES utilizadores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analises_projeto ON analises_viabilidade(projeto_id);
CREATE INDEX IF NOT EXISTS idx_analises_concelho ON analises_viabilidade(concelho_id);
CREATE INDEX IF NOT EXISTS idx_analises_estado ON analises_viabilidade(estado);
CREATE INDEX IF NOT EXISTS idx_analises_resultado ON analises_viabilidade((resultado->>'classificacao'));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION generate_analise_codigo()
RETURNS TRIGGER AS $$
DECLARE
    ano TEXT;
    seq INTEGER;
BEGIN
    ano := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'VU-' || ano || '-(\d+)') AS INTEGER)), 0) + 1
    INTO seq
    FROM analises_viabilidade
    WHERE codigo LIKE 'VU-' || ano || '-%';

    NEW.codigo := 'VU-' || ano || '-' || LPAD(seq::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_analise_codigo ON analises_viabilidade;
CREATE TRIGGER tr_analise_codigo
    BEFORE INSERT ON analises_viabilidade
    FOR EACH ROW
    WHEN (NEW.codigo IS NULL)
    EXECUTE FUNCTION generate_analise_codigo();

-- 3. Tabela: analise_versoes
-- Versionamento de cada relatório gerado
CREATE TABLE IF NOT EXISTS analise_versoes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    analise_id TEXT NOT NULL REFERENCES analises_viabilidade(id) ON DELETE CASCADE,

    versao INTEGER NOT NULL,               -- 1, 2, 3...

    -- Snapshot dos dados no momento da geração
    snapshot_dados JSONB NOT NULL,

    -- Conteúdo do relatório
    conteudo_relatorio JSONB NOT NULL DEFAULT '{}',

    -- Ficheiro gerado
    ficheiro_url TEXT,                     -- URL no Supabase Storage
    ficheiro_nome TEXT,                    -- 'VU-2025-001_v1.docx'

    -- Modo de geração
    modo TEXT NOT NULL DEFAULT 'interno',  -- 'interno' | 'cliente'

    -- Metadados
    gerado_por TEXT NOT NULL REFERENCES utilizadores(id),
    gerado_em TIMESTAMPTZ DEFAULT NOW(),
    notas TEXT,

    UNIQUE(analise_id, versao)
);

-- Trigger para versão automática
CREATE OR REPLACE FUNCTION generate_versao_numero()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(versao), 0) + 1
    INTO NEW.versao
    FROM analise_versoes
    WHERE analise_id = NEW.analise_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_versao_numero ON analise_versoes;
CREATE TRIGGER tr_versao_numero
    BEFORE INSERT ON analise_versoes
    FOR EACH ROW
    WHEN (NEW.versao IS NULL)
    EXECUTE FUNCTION generate_versao_numero();

-- 4. Tabela: analise_downloads
-- Rastreabilidade de downloads
CREATE TABLE IF NOT EXISTS analise_downloads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    versao_id TEXT NOT NULL REFERENCES analise_versoes(id) ON DELETE CASCADE,

    user_id TEXT NOT NULL REFERENCES utilizadores(id),
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contexto do download
    ip_address TEXT,
    user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_downloads_versao ON analise_downloads(versao_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON analise_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_data ON analise_downloads(downloaded_at);

-- 5. Tabela: concelho_matrizes
-- Base de conhecimento por concelho (matrizes de decisão)
CREATE TABLE IF NOT EXISTS concelho_matrizes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    tipo TEXT NOT NULL,                    -- 'solo_uso', 'preexistencias', 'turismo', 'regimes_ambientais'
    nome TEXT NOT NULL,
    descricao TEXT,

    -- Regras da matriz em formato estruturado
    regras JSONB NOT NULL,

    -- Metadados
    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único por concelho e tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_matrizes_concelho_tipo
ON concelho_matrizes(concelho_id, tipo) WHERE activo = true;

-- 6. Tabela: concelho_fluxo_decisao
-- Árvore de decisão por concelho
CREATE TABLE IF NOT EXISTS concelho_fluxo_decisao (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    -- Estrutura do fluxo
    fluxo JSONB NOT NULL,

    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: concelho_prompts
-- Prompts normalizados por concelho
CREATE TABLE IF NOT EXISTS concelho_prompts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    codigo TEXT NOT NULL,                  -- 'viabilidade_geral_interno', 'turismo_cliente'
    nome TEXT NOT NULL,
    modo TEXT NOT NULL,                    -- 'interno' | 'cliente'
    categoria TEXT NOT NULL,               -- 'analise' | 'validacao' | 'geracao'

    -- Template do prompt (com placeholders)
    template TEXT NOT NULL,

    -- Metadados
    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_concelho_codigo
ON concelho_prompts(concelho_id, codigo) WHERE activo = true;

-- =====================================================
-- Views úteis
-- =====================================================

-- View: Análises com dados completos
CREATE OR REPLACE VIEW v_analises_completas AS
SELECT
    a.*,
    c.nome as concelho_nome,
    c.codigo as concelho_codigo,
    p.codigo as projeto_codigo,
    p.nome as projeto_nome,
    u.nome as criado_por_nome,
    (SELECT COUNT(*) FROM analise_versoes av WHERE av.analise_id = a.id) as total_versoes,
    (SELECT MAX(versao) FROM analise_versoes av WHERE av.analise_id = a.id) as ultima_versao
FROM analises_viabilidade a
LEFT JOIN concelhos c ON a.concelho_id = c.id
LEFT JOIN projetos p ON a.projeto_id = p.id
LEFT JOIN utilizadores u ON a.created_by = u.id;

-- View: Estatísticas por concelho
CREATE OR REPLACE VIEW v_estatisticas_concelho AS
SELECT
    c.id,
    c.nome,
    c.codigo,
    COUNT(a.id) as total_analises,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel' THEN 1 END) as viaveis,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel_condicionado' THEN 1 END) as condicionados,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'inviavel' THEN 1 END) as inviaveis
FROM concelhos c
LEFT JOIN analises_viabilidade a ON c.id = a.concelho_id
GROUP BY c.id, c.nome, c.codigo;

-- =====================================================
-- Row Level Security
-- =====================================================

-- Habilitar RLS
ALTER TABLE analises_viabilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE analise_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analise_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_matrizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_fluxo_decisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas para concelhos (leitura pública para utilizadores autenticados)
CREATE POLICY "Concelhos visíveis para autenticados" ON concelhos
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins editam concelhos" ON concelhos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role = 'admin'
        )
    );

-- Políticas para matrizes e prompts (leitura para GP e admin)
CREATE POLICY "Matrizes visíveis para GP e admin" ON concelho_matrizes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "Prompts visíveis para GP e admin" ON concelho_prompts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "Fluxo visível para GP e admin" ON concelho_fluxo_decisao
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para analises_viabilidade
CREATE POLICY "Analises visíveis para GP e admin" ON analises_viabilidade
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem criar analises" ON analises_viabilidade
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem editar analises" ON analises_viabilidade
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para versões (herda da análise pai)
CREATE POLICY "Versões visíveis para GP e admin" ON analise_versoes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem criar versões" ON analise_versoes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para downloads
CREATE POLICY "Registar próprios downloads" ON analise_downloads
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Ver downloads (admin)" ON analise_downloads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role = 'admin'
        )
    );

-- =====================================================
-- Dados iniciais para Sintra
-- =====================================================

-- Inserir matriz de solo x uso para Sintra
INSERT INTO concelho_matrizes (concelho_id, tipo, nome, descricao, regras)
SELECT
    id,
    'solo_uso',
    'Matriz Solo x Uso',
    'Compatibilidade entre classificação/qualificação do solo e usos pretendidos',
    '{
        "urbano": {
            "espacos_centrais": {
                "habitacao": "admissivel",
                "turismo": "admissivel",
                "atividades_economicas": "admissivel",
                "equipamentos": "admissivel"
            },
            "espacos_habitacionais": {
                "habitacao": "admissivel",
                "turismo": "condicionado",
                "atividades_economicas": "condicionado",
                "equipamentos": "condicionado"
            },
            "espacos_baixa_densidade": {
                "habitacao": "admissivel",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_atividades_economicas": {
                "habitacao": "inviavel",
                "turismo": "condicionado",
                "atividades_economicas": "admissivel",
                "equipamentos": "admissivel"
            }
        },
        "rustico": {
            "espacos_naturais": {
                "habitacao": "inviavel",
                "turismo": "inviavel",
                "atividades_economicas": "inviavel",
                "equipamentos": "excecional"
            },
            "espacos_florestais": {
                "habitacao": "inviavel",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_agricolas": {
                "habitacao": "condicionado",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_ocupacao_turistica": {
                "habitacao": "inviavel",
                "turismo": "admissivel",
                "atividades_economicas": "condicionado",
                "equipamentos": "condicionado"
            },
            "aglomerados_rurais": {
                "habitacao": "admissivel",
                "turismo": "admissivel",
                "atividades_economicas": "condicionado",
                "equipamentos": "admissivel"
            }
        }
    }'::jsonb
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;

-- Inserir prompt base para análise interna
INSERT INTO concelho_prompts (concelho_id, codigo, nome, modo, categoria, template)
SELECT
    id,
    'viabilidade_geral_interno',
    'Análise de Viabilidade Geral (Interno)',
    'interno',
    'analise',
    'Analisa a viabilidade urbanística do imóvel com os seguintes dados:

{{INPUT_NORMALIZADO}}

Segue obrigatoriamente o Fluxo Global de Decisão da GAVINHO e as Matrizes aplicáveis.

PRINCÍPIOS OBRIGATÓRIOS:
1. Hierarquia normativa prevalece sempre (Lei > PDM > Regulamentos > Interpretação)
2. Regime mais restritivo prevalece sempre que existam múltiplos regimes
3. Cumulatividade absoluta — nenhum regime elimina outro
4. Ausência de proibição ≠ permissão
5. Índices máximos não geram direitos adquiridos
6. Contexto territorial > conveniência programática

PIPELINE OBRIGATÓRIO:
1. Identificação do solo
2. Qualificação do solo
3. Identificação de regimes ambientais
4. Verificação de preexistência válida
5. Identificação do uso pretendido
6. Aplicação das matrizes relevantes
7. Verificação de pareceres vinculativos
8. Classificação final da viabilidade

Responde em formato JSON estruturado com:
- classificacao: "viavel" | "viavel_condicionado" | "inviavel"
- fundamentacao: array de objetos com norma_aplicavel, matriz_aplicada, regime_determinante
- condicionantes: array de strings
- pareceres_necessarios: array de objetos com entidade e natureza
- proximos_passos: array de strings
- nivel_confianca: "alta" | "media" | "baixa"

{{INPUT_ADICIONAL}}'
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;

-- Inserir prompt para modo cliente
INSERT INTO concelho_prompts (concelho_id, codigo, nome, modo, categoria, template)
SELECT
    id,
    'viabilidade_geral_cliente',
    'Análise de Viabilidade Geral (Cliente)',
    'cliente',
    'analise',
    'Com base na análise técnica realizada, prepara um resumo executivo para o cliente sobre a viabilidade do projeto:

{{INPUT_NORMALIZADO}}

RESULTADO DA ANÁLISE TÉCNICA:
{{RESULTADO_INTERNO}}

INSTRUÇÕES:
- Usa linguagem clara e acessível, sem jargão técnico excessivo
- Foca nos pontos principais e nas próximas etapas
- Não menciones nomenclatura interna de matrizes ou fluxos
- Sê objetivo mas profissional
- Destaca claramente a conclusão principal

Estrutura a resposta em:
1. Síntese executiva (2-3 frases)
2. Principais condicionantes (se aplicável)
3. Próximos passos recomendados
4. Nota sobre prazos/custos estimados (se relevante)'
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;
-- =====================================================
-- Design Review - Herança de Comentários entre Versões
-- Permite que comentários não resolvidos sejam copiados
-- automaticamente para novas versões do desenho
-- =====================================================

-- Adicionar coluna para rastrear comentários herdados
ALTER TABLE design_review_annotations
ADD COLUMN IF NOT EXISTS herdado_de UUID REFERENCES design_review_annotations(id);

-- Índice para melhor performance em queries de herança
CREATE INDEX IF NOT EXISTS idx_annotations_herdado
ON design_review_annotations(herdado_de)
WHERE herdado_de IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN design_review_annotations.herdado_de IS 'Referência ao comentário original de uma versão anterior. NULL se for um comentário original.';
-- Migration to add origem_entrega_id to design_reviews table
-- This allows tracking which entrega a design review was created from

ALTER TABLE design_reviews
ADD COLUMN IF NOT EXISTS origem_entrega_id UUID REFERENCES projeto_entregas(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_design_reviews_origem_entrega ON design_reviews(origem_entrega_id);

-- Add comment for documentation
COMMENT ON COLUMN design_reviews.origem_entrega_id IS 'Reference to the entrega from which this design review was created (if converted from a PDF)';
-- =====================================================
-- RENDER ANNOTATIONS (Moleskine)
-- Sistema de anotação visual para renders arquitectónicos
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: RENDER_ANNOTATIONS
-- Guarda anotações de desenho em cima de renders
-- =====================================================
CREATE TABLE IF NOT EXISTS render_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relação com projeto e render
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  render_id UUID NOT NULL, -- ID do render na tabela projeto_renders
  render_url TEXT, -- URL da imagem (cache para acesso rápido)

  -- Dados das anotações (JSONB array)
  -- Cada anotação tem: id, type, color, width, points/coords, createdBy, createdAt
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Dimensões do canvas original (para escalar corretamente)
  canvas_width INTEGER DEFAULT 1920,
  canvas_height INTEGER DEFAULT 1080,

  -- Versioning (para histórico se necessário)
  version INTEGER DEFAULT 1,

  -- Audit
  created_by UUID REFERENCES utilizadores(id),
  created_by_name TEXT,
  updated_by UUID REFERENCES utilizadores(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint única para evitar duplicados
  UNIQUE(projeto_id, render_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_render_annotations_projeto ON render_annotations(projeto_id);
CREATE INDEX IF NOT EXISTS idx_render_annotations_render ON render_annotations(render_id);
CREATE INDEX IF NOT EXISTS idx_render_annotations_updated ON render_annotations(updated_at DESC);

-- Índice GIN para queries no JSONB (se precisar filtrar por tipo de anotação, cor, etc.)
CREATE INDEX IF NOT EXISTS idx_render_annotations_jsonb ON render_annotations USING GIN (annotations);

-- =====================================================
-- 2. TABELA DE HISTÓRICO (OPCIONAL)
-- Para guardar versões anteriores das anotações
-- =====================================================
CREATE TABLE IF NOT EXISTS render_annotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES render_annotations(id) ON DELETE CASCADE,

  -- Snapshot das anotações
  annotations JSONB NOT NULL,
  version INTEGER NOT NULL,

  -- Quem fez a alteração
  changed_by UUID REFERENCES utilizadores(id),
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_annotation_history_annotation ON render_annotation_history(annotation_id);
CREATE INDEX IF NOT EXISTS idx_render_annotation_history_version ON render_annotation_history(version DESC);

-- =====================================================
-- 3. TRIGGER PARA UPDATED_AT AUTOMÁTICO
-- =====================================================
CREATE OR REPLACE FUNCTION update_render_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_render_annotations_updated_at ON render_annotations;
CREATE TRIGGER trigger_render_annotations_updated_at
  BEFORE UPDATE ON render_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_render_annotations_updated_at();

-- =====================================================
-- 4. TRIGGER PARA GUARDAR HISTÓRICO AUTOMATICAMENTE
-- Guarda versão anterior quando há alterações significativas
-- =====================================================
CREATE OR REPLACE FUNCTION save_render_annotation_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Só guarda histórico se as anotações mudaram
  IF OLD.annotations IS DISTINCT FROM NEW.annotations THEN
    INSERT INTO render_annotation_history (
      annotation_id,
      annotations,
      version,
      changed_by,
      changed_by_name,
      changed_at
    ) VALUES (
      OLD.id,
      OLD.annotations,
      OLD.version,
      NEW.updated_by,
      (SELECT nome FROM utilizadores WHERE id = NEW.updated_by),
      NOW()
    );

    -- Incrementa versão
    NEW.version = COALESCE(OLD.version, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_render_annotation_history ON render_annotations;
CREATE TRIGGER trigger_render_annotation_history
  BEFORE UPDATE ON render_annotations
  FOR EACH ROW
  EXECUTE FUNCTION save_render_annotation_history();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE render_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_annotation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Todos os utilizadores autenticados podem ver anotações
CREATE POLICY "render_annotations_select_policy" ON render_annotations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Todos os utilizadores autenticados podem criar anotações
CREATE POLICY "render_annotations_insert_policy" ON render_annotations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Todos os utilizadores autenticados podem atualizar anotações
CREATE POLICY "render_annotations_update_policy" ON render_annotations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Só quem criou pode apagar (ou admin)
CREATE POLICY "render_annotations_delete_policy" ON render_annotations
  FOR DELETE
  USING (auth.uid() = created_by OR auth.role() = 'service_role');

-- Políticas para histórico
CREATE POLICY "render_annotation_history_select_policy" ON render_annotation_history
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE render_annotations IS 'Anotações visuais (desenhos, textos, formas) em cima de renders - Moleskine';
COMMENT ON COLUMN render_annotations.annotations IS 'Array JSONB de anotações. Cada item: {id, type, color, width, points/coords, createdBy, createdAt}';
COMMENT ON COLUMN render_annotations.canvas_width IS 'Largura original da imagem para escalar anotações corretamente';
COMMENT ON COLUMN render_annotations.canvas_height IS 'Altura original da imagem para escalar anotações corretamente';
COMMENT ON TABLE render_annotation_history IS 'Histórico automático de versões anteriores das anotações';
-- =====================================================
-- ACOMPANHAMENTO OBRA - Schema completo
-- Fotografias, Relatórios e Não Conformidades
-- =====================================================

-- =====================================================
-- ZONAS DE OBRA (necessária para outras tabelas)
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_zonas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(100) NOT NULL,
    piso VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'Divisão',
    area_m2 DECIMAL(10,2),
    progresso INT DEFAULT 0,
    notas TEXT,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obra_zonas_obra ON obra_zonas(obra_id);

-- =====================================================
-- ESPECIALIDADES (tabela base partilhada)
-- =====================================================
CREATE TABLE IF NOT EXISTS especialidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20) NOT NULL DEFAULT '#8B8670',
    icone VARCHAR(50) DEFAULT 'wrench',
    categoria VARCHAR(50), -- 'estrutura', 'mep', 'acabamentos', 'exteriores'
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir especialidades padrão
INSERT INTO especialidades (nome, cor, icone, categoria, ordem) VALUES
-- Estrutura
('Estrutura', '#8B7355', 'building-2', 'estrutura', 1),
('Alvenarias', '#A0855B', 'brick-wall', 'estrutura', 2),
('Impermeabilização', '#7A6B5A', 'shield-check', 'estrutura', 3),
-- MEP (Mechanical, Electrical, Plumbing)
('AVAC', '#5B8BA0', 'wind', 'mep', 10),
('Elétrico', '#D4A84B', 'zap', 'mep', 11),
('Hidráulica', '#6B8E8E', 'droplets', 'mep', 12),
('Gás', '#E07B54', 'flame', 'mep', 13),
-- Acabamentos
('Carpintaria', '#A67C52', 'layers', 'acabamentos', 20),
('Serralharia', '#7A7A7A', 'wrench', 'acabamentos', 21),
('Pintura', '#9B8B7A', 'paintbrush', 'acabamentos', 22),
('Revestimentos', '#6B7280', 'grid-3x3', 'acabamentos', 23),
('Caixilharia', '#5D6D7E', 'square', 'acabamentos', 24),
('Vidros', '#85C1E9', 'maximize-2', 'acabamentos', 25),
-- Exteriores
('Paisagismo', '#27AE60', 'tree-pine', 'exteriores', 30),
('Piscina', '#3498DB', 'waves', 'exteriores', 31)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FOTOGRAFIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_fotografias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Ficheiro
    url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    tamanho_bytes INTEGER,
    largura INTEGER,
    altura INTEGER,

    -- Metadados
    titulo VARCHAR(255),
    descricao TEXT,
    data_fotografia DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Classificação
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    especialidade_id UUID REFERENCES especialidades(id) ON DELETE SET NULL,
    tags TEXT[], -- Tags livres

    -- Origem
    autor VARCHAR(100), -- Quem tirou a foto
    dispositivo VARCHAR(100), -- EXIF se disponível

    -- Organização
    album_id UUID, -- Para futuro
    destaque BOOLEAN DEFAULT false,
    ordem INT DEFAULT 0,

    -- Metadados sistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_fotos_obra ON obra_fotografias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_data ON obra_fotografias(data_fotografia DESC);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_zona ON obra_fotografias(zona_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_espec ON obra_fotografias(especialidade_id);

-- =====================================================
-- RELATÓRIOS DE OBRA
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_relatorios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL, -- Ex: "REL-001"
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'semanal', -- 'semanal', 'quinzenal', 'mensal', 'milestone'

    -- Período
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    -- Conteúdo
    resumo_executivo TEXT,
    trabalhos_realizados TEXT,
    trabalhos_proxima_semana TEXT,
    problemas_identificados TEXT,
    decisoes_pendentes TEXT,
    observacoes TEXT,

    -- Progresso
    progresso_global INT, -- 0-100
    progresso_por_especialidade JSONB, -- {"esp_id": 45, "esp_id2": 30}

    -- Estado
    estado VARCHAR(50) DEFAULT 'rascunho', -- 'rascunho', 'em_revisao', 'publicado'
    data_publicacao TIMESTAMP WITH TIME ZONE,

    -- Responsável
    autor_id UUID REFERENCES utilizadores(id),
    revisor_id UUID REFERENCES utilizadores(id),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fotografias anexas ao relatório
CREATE TABLE IF NOT EXISTS obra_relatorio_fotos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    relatorio_id UUID NOT NULL REFERENCES obra_relatorios(id) ON DELETE CASCADE,
    fotografia_id UUID NOT NULL REFERENCES obra_fotografias(id) ON DELETE CASCADE,
    legenda TEXT,
    ordem INT DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_relatorios_obra ON obra_relatorios(obra_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_estado ON obra_relatorios(estado);

-- =====================================================
-- NÃO CONFORMIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS nao_conformidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL, -- Ex: "NC-001"
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,

    -- Classificação
    especialidade_id UUID REFERENCES especialidades(id),
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    tipo VARCHAR(50) DEFAULT 'execucao', -- 'execucao', 'material', 'projeto', 'seguranca'
    gravidade VARCHAR(50) DEFAULT 'menor', -- 'menor', 'maior', 'critica'

    -- Datas
    data_identificacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_limite_resolucao DATE,
    data_resolucao DATE,
    data_verificacao DATE,

    -- Estado
    estado VARCHAR(50) DEFAULT 'aberta', -- 'aberta', 'em_resolucao', 'resolvida', 'verificada', 'encerrada'

    -- Responsabilidades
    identificado_por UUID REFERENCES utilizadores(id),
    responsavel_resolucao VARCHAR(255), -- Pode ser externo
    verificado_por UUID REFERENCES utilizadores(id),

    -- Resolução
    acao_corretiva TEXT,
    acao_preventiva TEXT,
    resultado_verificacao TEXT,

    -- Impacto
    impacto_prazo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    impacto_custo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    custo_estimado DECIMAL(10,2),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

-- Fotografias anexas à NC
CREATE TABLE IF NOT EXISTS nc_fotografias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nc_id UUID NOT NULL REFERENCES nao_conformidades(id) ON DELETE CASCADE,
    fotografia_id UUID REFERENCES obra_fotografias(id) ON DELETE CASCADE,
    url TEXT, -- Se upload direto
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'identificacao', -- 'identificacao', 'resolucao', 'verificacao'
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de alterações da NC
CREATE TABLE IF NOT EXISTS nc_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nc_id UUID NOT NULL REFERENCES nao_conformidades(id) ON DELETE CASCADE,

    acao VARCHAR(100) NOT NULL, -- 'criada', 'estado_alterado', 'atribuida', 'comentario', etc.
    descricao TEXT,
    estado_anterior VARCHAR(50),
    estado_novo VARCHAR(50),

    utilizador_id UUID REFERENCES utilizadores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nc_obra ON nao_conformidades(obra_id);
CREATE INDEX IF NOT EXISTS idx_nc_estado ON nao_conformidades(estado);
CREATE INDEX IF NOT EXISTS idx_nc_especialidade ON nao_conformidades(especialidade_id);
CREATE INDEX IF NOT EXISTS idx_nc_data ON nao_conformidades(data_identificacao DESC);

-- =====================================================
-- DIÁRIO DE PROJETO DA OBRA (separado do Diário de Obra)
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_diario_categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20) DEFAULT '#5F5C59',
    icone VARCHAR(50) DEFAULT 'FileText',
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão para diário de projeto de obra
INSERT INTO obra_diario_categorias (nome, cor, icone, ordem) VALUES
  ('Decisão de Design', '#8B5CF6', 'PenTool', 1),
  ('Instrução', '#3B82F6', 'ClipboardList', 2),
  ('Alteração de Âmbito', '#F59E0B', 'AlertTriangle', 3),
  ('Reunião', '#10B981', 'Users', 4),
  ('Comunicação Cliente', '#EC4899', 'Mail', 5),
  ('Pedido de Informação', '#6366F1', 'HelpCircle', 6),
  ('Aprovação', '#059669', 'CheckSquare', 7),
  ('Ocorrência', '#EF4444', 'AlertTriangle', 8)
ON CONFLICT DO NOTHING;

-- Tags para diário de projeto de obra
CREATE TABLE IF NOT EXISTS obra_diario_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(20) DEFAULT '#C3BAAF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tags padrão
INSERT INTO obra_diario_tags (nome, cor) VALUES
  ('Urgente', '#EF4444'),
  ('Aguarda Aprovação', '#F59E0B'),
  ('Impacto Custo', '#8B5CF6'),
  ('Impacto Prazo', '#3B82F6'),
  ('Resolvido', '#10B981'),
  ('Pendente', '#6B7280')
ON CONFLICT DO NOTHING;

-- Entradas do diário de projeto da obra
CREATE TABLE IF NOT EXISTS obra_diario_projeto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50), -- Ex: "DP-001"

    -- Conteúdo
    titulo VARCHAR(500) NOT NULL,
    descricao TEXT,

    -- Classificação
    categoria_id UUID REFERENCES obra_diario_categorias(id),
    tipo VARCHAR(50) DEFAULT 'manual',
    fonte VARCHAR(100) DEFAULT 'manual',

    -- Contexto
    participantes TEXT[], -- Pessoas envolvidas
    referencias TEXT[], -- Docs, emails, NCs referenciados

    -- Impacto
    impacto_prazo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    impacto_custo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    requer_aprovacao BOOLEAN DEFAULT false,

    -- Follow-up
    accoes_requeridas TEXT,
    responsavel_accao VARCHAR(255),
    data_limite DATE,

    -- Estado
    estado VARCHAR(50) DEFAULT 'registado', -- 'registado', 'em_curso', 'concluido'

    -- Anexos
    anexos JSONB DEFAULT '[]',

    -- Timestamps
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

-- Relação muitos-para-muitos entre entradas e tags
CREATE TABLE IF NOT EXISTS obra_diario_projeto_tags (
    diario_id UUID REFERENCES obra_diario_projeto(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES obra_diario_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (diario_id, tag_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_obra ON obra_diario_projeto(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_categoria ON obra_diario_projeto(categoria_id);
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_data ON obra_diario_projeto(data_evento DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE obra_zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_fotografias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_relatorio_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_fotografias ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_projeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_projeto_tags ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para utilizadores autenticados
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_zonas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON especialidades;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_fotografias;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_relatorios;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_relatorio_fotos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON nao_conformidades;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON nc_fotografias;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON nc_historico;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_diario_categorias;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_diario_tags;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_diario_projeto;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_diario_projeto_tags;

CREATE POLICY "Allow all for authenticated users" ON obra_zonas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON especialidades FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_fotografias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_relatorios FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_relatorio_fotos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nao_conformidades FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nc_fotografias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nc_historico FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_categorias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_projeto FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_projeto_tags FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_obra_zonas_updated_at ON obra_zonas;
DROP TRIGGER IF EXISTS trigger_obra_fotografias_updated_at ON obra_fotografias;
DROP TRIGGER IF EXISTS trigger_obra_relatorios_updated_at ON obra_relatorios;
DROP TRIGGER IF EXISTS trigger_nao_conformidades_updated_at ON nao_conformidades;
DROP TRIGGER IF EXISTS trigger_obra_diario_projeto_updated_at ON obra_diario_projeto;

CREATE TRIGGER trigger_obra_zonas_updated_at
  BEFORE UPDATE ON obra_zonas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_obra_fotografias_updated_at
  BEFORE UPDATE ON obra_fotografias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_obra_relatorios_updated_at
  BEFORE UPDATE ON obra_relatorios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_nao_conformidades_updated_at
  BEFORE UPDATE ON nao_conformidades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_obra_diario_projeto_updated_at
  BEFORE UPDATE ON obra_diario_projeto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- Tabela principal de decisões
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS decisoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    codigo TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    justificacao TEXT,
    alternativas_consideradas JSONB,
    tipo TEXT NOT NULL,
    categoria TEXT,
    impacto TEXT NOT NULL DEFAULT 'medio',
    tags TEXT[],
    decidido_por TEXT NOT NULL,
    decidido_por_tipo TEXT DEFAULT 'cliente',
    aprovado_por UUID REFERENCES utilizadores(id),
    data_decisao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    impacto_orcamento DECIMAL(12,2),
    impacto_orcamento_percentagem DECIMAL(5,2),
    categoria_orcamento TEXT,
    impacto_prazo_dias INTEGER,
    fase_afectada TEXT,
    fonte TEXT NOT NULL DEFAULT 'manual',
    fonte_referencia TEXT,
    fonte_url TEXT,
    fonte_excerto TEXT,
    estado TEXT NOT NULL DEFAULT 'sugerida',
    superseded_by UUID REFERENCES decisoes(id),
    supersedes UUID REFERENCES decisoes(id),
    obra_id UUID REFERENCES obras(id),
    divisao TEXT,
    fornecedor_id UUID REFERENCES fornecedores(id),
    texto_pesquisa TEXT GENERATED ALWAYS AS (
        COALESCE(titulo, '') || ' ' ||
        COALESCE(descricao, '') || ' ' ||
        COALESCE(justificacao, '') || ' ' ||
        COALESCE(divisao, '') || ' ' ||
        COALESCE(categoria, '') || ' ' ||
        COALESCE(array_to_string(tags, ' '), '')
    ) STORED,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    CONSTRAINT valid_tipo CHECK (tipo IN ('design', 'material', 'tecnico', 'financeiro', 'prazo', 'fornecedor', 'alteracao')),
    CONSTRAINT valid_impacto CHECK (impacto IN ('critico', 'alto', 'medio', 'baixo')),
    CONSTRAINT valid_estado CHECK (estado IN ('sugerida', 'validada', 'superseded', 'rejeitada')),
    CONSTRAINT valid_fonte CHECK (fonte IN ('email', 'reuniao', 'chat', 'manual')),
    CONSTRAINT valid_decidido_por_tipo CHECK (decidido_por_tipo IN ('cliente', 'gavinho', 'conjunto'))
);

-- Índices
CREATE INDEX idx_decisoes_projeto ON decisoes(projeto_id);
CREATE INDEX idx_decisoes_estado ON decisoes(estado);
CREATE INDEX idx_decisoes_tipo ON decisoes(tipo);
CREATE INDEX idx_decisoes_data ON decisoes(data_decisao DESC);
CREATE INDEX idx_decisoes_pesquisa ON decisoes USING gin(to_tsvector('portuguese', texto_pesquisa));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION generate_decisao_codigo()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE WHEN codigo ~ '^DEC-[0-9]+$'
        THEN CAST(SUBSTRING(codigo FROM 5) AS INTEGER) ELSE 0 END
    ), 0) + 1 INTO next_num
    FROM decisoes WHERE projeto_id = NEW.projeto_id;
    NEW.codigo := 'DEC-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisao_codigo
    BEFORE INSERT ON decisoes
    FOR EACH ROW WHEN (NEW.codigo IS NULL)
    EXECUTE FUNCTION generate_decisao_codigo();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_decisoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_updated
    BEFORE UPDATE ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION update_decisoes_updated_at();
-- Tabela de auditoria de alterações
CREATE TABLE IF NOT EXISTS decisoes_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decisao_id UUID NOT NULL REFERENCES decisoes(id) ON DELETE CASCADE,
    campo_alterado TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    alterado_por UUID REFERENCES utilizadores(id),
    alterado_em TIMESTAMPTZ DEFAULT NOW(),
    motivo TEXT
);

CREATE INDEX idx_decisoes_historico_decisao ON decisoes_historico(decisao_id);
CREATE INDEX idx_decisoes_historico_data ON decisoes_historico(alterado_em DESC);

-- Trigger para logging automático
CREATE OR REPLACE FUNCTION log_decisao_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'estado', OLD.estado, NEW.estado, NEW.aprovado_por);
    END IF;
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'titulo', OLD.titulo, NEW.titulo, NEW.aprovado_por);
    END IF;
    IF OLD.impacto_orcamento IS DISTINCT FROM NEW.impacto_orcamento THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'impacto_orcamento', OLD.impacto_orcamento::TEXT, NEW.impacto_orcamento::TEXT, NEW.aprovado_por);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_log_changes
    AFTER UPDATE ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION log_decisao_changes();

-- Trigger para registar criação
CREATE OR REPLACE FUNCTION log_decisao_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por, motivo)
    VALUES (NEW.id, 'estado', NULL, NEW.estado, NEW.created_by,
        CASE WHEN NEW.fonte = 'manual' THEN 'Criada manualmente' ELSE 'Detectada de ' || NEW.fonte END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_log_created
    AFTER INSERT ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION log_decisao_created();
-- Tabela de anexos
CREATE TABLE IF NOT EXISTS decisoes_anexos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decisao_id UUID NOT NULL REFERENCES decisoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nome_storage TEXT,
    tipo TEXT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'decisoes',
    tamanho_bytes INTEGER,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX idx_decisoes_anexos_decisao ON decisoes_anexos(decisao_id);
-- Activar RLS
ALTER TABLE decisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisoes_anexos ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_has_project_access(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM projeto_equipa
        WHERE projeto_id = p_projeto_id AND utilizador_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para decisoes
CREATE POLICY "decisoes_select_policy" ON decisoes
    FOR SELECT USING (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_insert_policy" ON decisoes
    FOR INSERT WITH CHECK (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_update_policy" ON decisoes
    FOR UPDATE USING (user_has_project_access(projeto_id))
    WITH CHECK (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_delete_policy" ON decisoes
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para histórico
CREATE POLICY "decisoes_historico_select_policy" ON decisoes_historico
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

CREATE POLICY "decisoes_historico_insert_policy" ON decisoes_historico
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

-- Políticas para anexos
CREATE POLICY "decisoes_anexos_select_policy" ON decisoes_anexos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

CREATE POLICY "decisoes_anexos_insert_policy" ON decisoes_anexos
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

-- Grants
GRANT SELECT, INSERT, UPDATE ON decisoes TO anon, authenticated;
GRANT SELECT, INSERT ON decisoes_historico TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON decisoes_anexos TO anon, authenticated;
-- Pesquisa semântica
CREATE OR REPLACE FUNCTION search_decisoes(
    query_embedding VECTOR(1536),
    filter_projeto_id UUID DEFAULT NULL,
    filter_estado TEXT DEFAULT 'validada',
    match_count INTEGER DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID, codigo TEXT, titulo TEXT, descricao TEXT,
    tipo TEXT, impacto TEXT, data_decisao DATE,
    decidido_por TEXT, impacto_orcamento DECIMAL,
    divisao TEXT, fonte TEXT, estado TEXT,
    projeto_id UUID, similarity FLOAT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.descricao, d.tipo, d.impacto,
           d.data_decisao, d.decidido_por, d.impacto_orcamento,
           d.divisao, d.fonte, d.estado, d.projeto_id,
           1 - (d.embedding <=> query_embedding) AS similarity
    FROM decisoes d
    WHERE (filter_projeto_id IS NULL OR d.projeto_id = filter_projeto_id)
      AND (filter_estado IS NULL OR d.estado = filter_estado)
      AND d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Pesquisa full-text
CREATE OR REPLACE FUNCTION search_decisoes_fulltext(
    search_query TEXT,
    filter_projeto_id UUID DEFAULT NULL,
    filter_estado TEXT DEFAULT 'validada',
    filter_tipo TEXT DEFAULT NULL,
    filter_impacto TEXT DEFAULT NULL,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID, codigo TEXT, titulo TEXT, descricao TEXT,
    tipo TEXT, impacto TEXT, data_decisao DATE,
    decidido_por TEXT, impacto_orcamento DECIMAL,
    divisao TEXT, fonte TEXT, estado TEXT,
    projeto_id UUID, rank REAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    tsquery_text TSQUERY;
BEGIN
    tsquery_text := plainto_tsquery('portuguese', search_query);
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.descricao, d.tipo, d.impacto,
           d.data_decisao, d.decidido_por, d.impacto_orcamento,
           d.divisao, d.fonte, d.estado, d.projeto_id,
           ts_rank(to_tsvector('portuguese', d.texto_pesquisa), tsquery_text) AS rank
    FROM decisoes d
    WHERE to_tsvector('portuguese', d.texto_pesquisa) @@ tsquery_text
      AND (filter_projeto_id IS NULL OR d.projeto_id = filter_projeto_id)
      AND (filter_estado IS NULL OR d.estado = filter_estado)
      AND (filter_tipo IS NULL OR d.tipo = filter_tipo)
      AND (filter_impacto IS NULL OR d.impacto = filter_impacto)
    ORDER BY rank DESC, d.data_decisao DESC
    LIMIT max_results;
END;
$$;

-- Estatísticas
CREATE OR REPLACE FUNCTION get_decisoes_stats(p_projeto_id UUID)
RETURNS TABLE (
    total INTEGER, validadas INTEGER, pendentes INTEGER,
    impacto_orcamento_total DECIMAL, impacto_prazo_total INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE estado = 'validada')::INTEGER,
        COUNT(*) FILTER (WHERE estado = 'sugerida')::INTEGER,
        COALESCE(SUM(impacto_orcamento) FILTER (WHERE estado = 'validada'), 0),
        COALESCE(SUM(impacto_prazo_dias) FILTER (WHERE estado = 'validada'), 0)::INTEGER
    FROM decisoes WHERE projeto_id = p_projeto_id;
END;
$$;

-- Decisões relacionadas
CREATE OR REPLACE FUNCTION get_decisoes_relacionadas(
    p_decisao_id UUID,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (id UUID, codigo TEXT, titulo TEXT, tipo TEXT, data_decisao DATE, similarity FLOAT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_embedding VECTOR(1536);
    v_projeto_id UUID;
BEGIN
    SELECT embedding, projeto_id INTO v_embedding, v_projeto_id
    FROM decisoes WHERE decisoes.id = p_decisao_id;
    IF v_embedding IS NULL THEN RETURN; END IF;
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.tipo, d.data_decisao,
           1 - (d.embedding <=> v_embedding) AS similarity
    FROM decisoes d
    WHERE d.id != p_decisao_id AND d.projeto_id = v_projeto_id
      AND d.estado = 'validada' AND d.embedding IS NOT NULL
    ORDER BY d.embedding <=> v_embedding
    LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION search_decisoes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_decisoes_fulltext TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_decisoes_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_decisoes_relacionadas TO anon, authenticated;
-- Seed de exemplo para testes (ajustar projeto_id conforme necessário)
-- Este ficheiro deve ser executado manualmente após ter projectos criados

-- Para inserir decisões de teste, descomenta e ajusta:
/*
INSERT INTO decisoes (projeto_id, titulo, descricao, tipo, impacto, decidido_por, decidido_por_tipo, data_decisao, impacto_orcamento, fonte, estado, divisao)
VALUES
('SEU-PROJETO-ID-AQUI', 'Caixilharia Technal série minimalista', 'Cliente aprovou upgrade para caixilharia Technal série minimalista.', 'material', 'critico', 'Cliente', 'cliente', '2025-01-15', 8500.00, 'email', 'validada', 'Toda a habitação'),
('SEU-PROJETO-ID-AQUI', 'Mármore Calacatta Gold para bancada WC', 'Aprovado mármore Calacatta Gold em substituição do Statuario.', 'material', 'critico', 'Cliente', 'cliente', '2025-01-24', 3200.00, 'email', 'validada', 'WC Suite'),
('SEU-PROJETO-ID-AQUI', 'Cozinha em ilha com zona refeições', 'Layout final aprovado com ilha de 2.4m.', 'design', 'alto', 'Cliente + GAVINHO', 'conjunto', '2025-01-18', NULL, 'reuniao', 'validada', 'Cozinha');
*/
-- Migração: Adiciona projeto_id à tabela obra_emails
-- Data: 2025-01-25
-- Descrição: Permite associar emails a projetos (códigos GA) além de obras (códigos OB)

-- Adicionar coluna projeto_id que referencia a tabela projetos
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL;

-- Índice para melhor performance em queries por projeto
CREATE INDEX IF NOT EXISTS idx_obra_emails_projeto_id ON obra_emails(projeto_id) WHERE projeto_id IS NOT NULL;

-- Atualizar emails existentes que têm codigo_obra_detectado começando com GA
-- e associá-los ao projeto correspondente
UPDATE obra_emails e
SET projeto_id = p.id
FROM projetos p
WHERE e.codigo_obra_detectado LIKE 'GA%'
  AND e.codigo_obra_detectado = p.codigo
  AND e.projeto_id IS NULL;

COMMENT ON COLUMN obra_emails.projeto_id IS 'Referência ao projeto (para códigos GA). Usa obra_id para obras (códigos OB).';
-- =====================================================
-- CHAT IA POR PROJECTO - Schema completo
-- Skills, Contexto, Chats e Mensagens
-- =====================================================

-- =====================================================
-- 1. SKILLS (conhecimento especializado)
-- =====================================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identificacao
    codigo TEXT NOT NULL UNIQUE,           -- 'licenciamento-sintra', 'orcamentacao-luxo'
    nome TEXT NOT NULL,                    -- 'Licenciamento Sintra'
    descricao TEXT,

    -- Classificacao
    tipo TEXT NOT NULL DEFAULT 'global',   -- 'global', 'municipio', 'especialidade', 'tipologia'
    categoria TEXT,                        -- Para agrupamento na UI
    icone TEXT,                            -- Nome do icone lucide-react

    -- Conteudo da skill
    prompt_sistema TEXT NOT NULL,          -- Instrucoes detalhadas para a IA
    exemplos JSONB,                        -- Exemplos de uso [{pergunta, resposta}]

    -- Configuracao
    requer_config BOOLEAN DEFAULT false,   -- Se precisa de parametros por projecto
    config_schema JSONB,                   -- JSON Schema dos parametros

    -- Estado
    activo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_tipo ON skills(tipo);
CREATE INDEX IF NOT EXISTS idx_skills_activo ON skills(activo);

-- =====================================================
-- 2. PROJETO CONTEXTO (instrucoes, documentos, regras)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_contexto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    tipo TEXT NOT NULL,                    -- 'instrucao', 'documento', 'regra', 'briefing'
    titulo TEXT NOT NULL,

    -- Conteudo
    conteudo TEXT NOT NULL,                -- Markdown ou texto

    -- Configuracao
    activo BOOLEAN DEFAULT true,
    incluir_sempre BOOLEAN DEFAULT true,   -- Se deve ser incluido em todos os chats
    ordem INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_contexto_projeto ON projeto_contexto(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_contexto_activo ON projeto_contexto(activo);

-- =====================================================
-- 3. PROJETO SKILLS (skills activadas por projecto)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

    -- Configuracao especifica para este projecto
    config JSONB,                          -- Parametros da skill

    -- Estado
    activo BOOLEAN DEFAULT true,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_by UUID REFERENCES utilizadores(id),

    -- Constraint unica
    UNIQUE(projeto_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_skills_projeto ON projeto_skills(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_skills_skill ON projeto_skills(skill_id);

-- =====================================================
-- 4. PROJETO CHATS (chats por assunto)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    titulo TEXT NOT NULL,                  -- 'Discussao Cozinha', 'Duvidas AVAC'
    descricao TEXT,

    -- Categorizacao
    categoria TEXT,                        -- 'design', 'tecnico', 'cliente', 'obra', 'geral'
    tags TEXT[],

    -- Skills especificas deste chat (opcional, herda do projecto se vazio)
    skills_override UUID[],                -- IDs de skills para usar neste chat especifico

    -- Estado
    estado TEXT DEFAULT 'activo',          -- 'activo', 'arquivado', 'resolvido'
    fixado BOOLEAN DEFAULT false,          -- Para aparecer no topo

    -- Contadores (desnormalizados para performance)
    total_mensagens INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_projeto_chats_projeto ON projeto_chats(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_chats_estado ON projeto_chats(estado);
CREATE INDEX IF NOT EXISTS idx_projeto_chats_last_message ON projeto_chats(last_message_at DESC);

-- =====================================================
-- 5. PROJETO CHAT MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_chat_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES projeto_chats(id) ON DELETE CASCADE,

    -- Conteudo
    role TEXT NOT NULL,                    -- 'user', 'assistant', 'system'
    conteudo TEXT NOT NULL,

    -- Metadados do utilizador
    autor_id UUID REFERENCES utilizadores(id),
    autor_nome TEXT,                       -- Desnormalizado para historico

    -- Metadados da IA (quando role='assistant')
    modelo TEXT,                           -- 'claude-sonnet-4-20250514'
    tokens_input INTEGER,
    tokens_output INTEGER,
    tempo_resposta_ms INTEGER,

    -- Contexto usado (para debugging/auditoria)
    contexto_usado JSONB,                  -- {skills: [...], contexto: [...]}

    -- Anexos
    anexos JSONB,                          -- [{tipo, url, nome, tamanho}]

    -- Feedback
    feedback TEXT,                         -- 'positivo', 'negativo', null
    feedback_comentario TEXT,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_chat ON projeto_chat_mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON projeto_chat_mensagens(created_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para updated_at em skills
DROP TRIGGER IF EXISTS trigger_skills_updated_at ON skills;
CREATE TRIGGER trigger_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at em projeto_contexto
DROP TRIGGER IF EXISTS trigger_projeto_contexto_updated_at ON projeto_contexto;
CREATE TRIGGER trigger_projeto_contexto_updated_at
    BEFORE UPDATE ON projeto_contexto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at em projeto_chats
DROP TRIGGER IF EXISTS trigger_projeto_chats_updated_at ON projeto_chats;
CREATE TRIGGER trigger_projeto_chats_updated_at
    BEFORE UPDATE ON projeto_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar contadores no chat
CREATE OR REPLACE FUNCTION update_chat_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projeto_chats
        SET total_mensagens = total_mensagens + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.chat_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projeto_chats
        SET total_mensagens = GREATEST(total_mensagens - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.chat_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_counters ON projeto_chat_mensagens;
CREATE TRIGGER trigger_update_chat_counters
    AFTER INSERT OR DELETE ON projeto_chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_counters();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_contexto ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Policies para skills
DROP POLICY IF EXISTS "Skills visiveis para autenticados" ON skills;
DROP POLICY IF EXISTS "Skills editaveis por admins" ON skills;
CREATE POLICY "Skills visiveis para autenticados" ON skills FOR SELECT USING (true);
CREATE POLICY "Skills editaveis por admins" ON skills FOR ALL USING (true);

-- Policies para projeto_contexto
DROP POLICY IF EXISTS "Contexto acessivel para autenticados" ON projeto_contexto;
CREATE POLICY "Contexto acessivel para autenticados" ON projeto_contexto FOR ALL USING (true);

-- Policies para projeto_skills
DROP POLICY IF EXISTS "Projeto skills acessivel para autenticados" ON projeto_skills;
CREATE POLICY "Projeto skills acessivel para autenticados" ON projeto_skills FOR ALL USING (true);

-- Policies para projeto_chats
DROP POLICY IF EXISTS "Chats acessiveis para autenticados" ON projeto_chats;
CREATE POLICY "Chats acessiveis para autenticados" ON projeto_chats FOR ALL USING (true);

-- Policies para projeto_chat_mensagens
DROP POLICY IF EXISTS "Mensagens acessiveis para autenticados" ON projeto_chat_mensagens;
CREATE POLICY "Mensagens acessiveis para autenticados" ON projeto_chat_mensagens FOR ALL USING (true);

-- =====================================================
-- SEED: Skills Base
-- =====================================================
INSERT INTO skills (codigo, nome, descricao, tipo, categoria, icone, prompt_sistema, activo, ordem) VALUES

-- LICENCIAMENTOS
('licenciamento-sintra', 'Licenciamento Sintra', 'Conhecimento especializado sobre PDM de Sintra, regulamentos urbanisticos e processos de licenciamento no concelho.', 'municipio', 'Licenciamentos', 'map-pin',
'Es um especialista em licenciamento urbanistico no concelho de Sintra, Portugal.

CONHECIMENTO BASE:
- PDM de Sintra (Revisao 2019)
- RGEU e RJUE actualizados
- Regulamentos municipais especificos
- Processos de licenciamento, comunicacao previa e autorizacao
- Condicionantes (REN, RAN, Patrimonio, Servidoes)

COMPORTAMENTO:
- Responde sempre em portugues de Portugal
- Cita artigos especificos quando relevante
- Alerta para condicionantes que possam afectar o projecto
- Sugere documentacao necessaria para submissoes
- Indica prazos legais quando aplicavel

LIMITACOES:
- Nao tens acesso a processos em curso na camara
- Recomenda sempre confirmacao junto dos servicos municipais para casos especificos',
true, 1),

('licenciamento-lisboa', 'Licenciamento Lisboa', 'Conhecimento sobre PDM de Lisboa e processos de licenciamento no concelho.', 'municipio', 'Licenciamentos', 'map-pin',
'Es um especialista em licenciamento urbanistico no concelho de Lisboa, Portugal.

CONHECIMENTO BASE:
- PDM de Lisboa (2012, com alteracoes)
- Regulamento Municipal de Urbanizacao e Edificacao
- RGEU e RJUE actualizados
- Zonas historicas e proteccao do patrimonio

COMPORTAMENTO:
- Responde sempre em portugues de Portugal
- Considera especificidades das zonas historicas
- Alerta para condicionantes de patrimonio
- Indica documentacao especifica para Lisboa',
true, 2),

-- ORCAMENTACAO
('orcamentacao-luxo', 'Orcamentacao Luxo', 'Especialista em orcamentacao de projectos residenciais de luxo, margens, markups e estrutura de propostas.', 'global', 'Financeiro', 'calculator',
'Es um especialista em orcamentacao de projectos de arquitectura e construcao de luxo.

CONHECIMENTO BASE:
- Estrutura de custos: projecto, licenciamento, construcao, equipamentos, contingencia
- Margens tipicas: 15-25% em Design & Build
- Markups por especialidade
- Custos de referencia do mercado portugues
- Fornecedores premium e suas faixas de preco

COMPORTAMENTO:
- Apresenta valores em Euros (EUR)
- Usa formato portugues: 1.234,56 EUR
- Inclui sempre contingencia (8-12%)
- Alerta para custos frequentemente subestimados
- Sugere alternativas quando budget e limitado

CALCULOS:
- Custo/m2 construcao nova luxo: 2.500-4.000 EUR/m2
- Custo/m2 remodelacao luxo: 1.500-3.000 EUR/m2
- Honorarios arquitectura: 8-12% do valor de construcao
- Fiscalizacao: 3-5% do valor de construcao',
true, 10),

-- ESPECIALIDADES TECNICAS
('avac-residencial', 'AVAC Residencial', 'Conhecimento sobre sistemas de climatizacao para habitacao unifamiliar de luxo.', 'especialidade', 'Tecnico', 'thermometer',
'Es um especialista em sistemas AVAC para habitacao residencial de luxo.

CONHECIMENTO BASE:
- Sistemas VRV/VRF (Daikin, Mitsubishi, LG)
- Piso radiante e tecto radiante
- Ventilacao mecanica com recuperacao de calor
- Desumidificacao para piscinas interiores
- Integracao com domotica (KNX, Loxone)
- Eficiencia energetica e classe A+

DIMENSIONAMENTO:
- Cargas termicas tipicas
- Caudais de ar por divisao
- Potencias de referencia

COMPORTAMENTO:
- Sugere solucoes silenciosas para zonas de dormir
- Considera integracao arquitectonica (grelhas, difusores)
- Alerta para necessidades de espaco tecnico',
true, 20),

('estruturas-residencial', 'Estruturas Residencial', 'Conhecimento sobre solucoes estruturais para habitacao unifamiliar.', 'especialidade', 'Tecnico', 'building',
'Es um engenheiro de estruturas especializado em habitacao unifamiliar.

CONHECIMENTO BASE:
- Betao armado, estruturas metalicas, madeira lamelada
- Vaos e consolas tipicos
- Fundacoes (directas, indirectas, contencoes)
- Lajes (macicas, fungiformes, colaborantes)
- Sismorresistencia (zona sismica portuguesa)

COMPORTAMENTO:
- Valida viabilidade de solucoes arquitectonicas
- Alerta para condicionantes estruturais
- Sugere solucoes para vaos grandes
- Considera integracao de instalacoes',
true, 21),

-- CLIENTE E COMUNICACAO
('comunicacao-cliente-premium', 'Comunicacao Cliente Premium', 'Tom e estilo de comunicacao para clientes de alto valor.', 'global', 'Comunicacao', 'message-circle',
'Adoptas um tom de comunicacao adequado a clientes de alto valor (HNW - High Net Worth).

CARACTERISTICAS:
- Tom profissional mas caloroso
- Nunca uses linguagem tecnica sem explicacao
- Antecipa questoes e preocupacoes
- Demonstra atencao ao detalhe
- Personaliza a comunicacao

ESTRUTURA DE EMAILS:
- Saudacao personalizada
- Contexto breve
- Informacao principal (clara e organizada)
- Proximos passos concretos
- Disponibilidade para esclarecer

EVITAR:
- Jargao tecnico excessivo
- Respostas genericas
- Tom demasiado formal ou distante
- Promessas que nao possam ser cumpridas',
true, 30),

-- GESTAO DE PROJECTO
('gestao-projeto-db', 'Gestao Projeto Design & Build', 'Metodologias e boas praticas para gestao de projectos Design & Build.', 'global', 'Gestao', 'clipboard-list',
'Es um gestor de projectos senior especializado em Design & Build residencial de luxo.

CONHECIMENTO BASE:
- Fases de projecto: Briefing -> Conceito -> Desenvolvimento -> Execucao -> Obra -> Entrega
- Gestao de stakeholders
- Controlo de ambito, prazo e custo
- Gestao de alteracoes e decisoes
- Coordenacao de equipas multidisciplinares

FERRAMENTAS:
- Planning e milestones
- Gestao de riscos
- Reporting ao cliente
- Reunioes de obra

COMPORTAMENTO:
- Foca em solucoes, nao em problemas
- Documenta tudo
- Antecipa conflitos
- Mantem cliente informado',
true, 40)

ON CONFLICT (codigo) DO NOTHING;
-- Migração: Adicionar campos de urgência e classificação IA aos emails
-- Data: 2025-01-25
-- Descrição: Adiciona colunas para classificação de urgência com IA

-- =====================================================
-- 1. ADICIONAR COLUNAS À TABELA obra_emails
-- =====================================================

-- Coluna para urgência classificada
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS urgencia VARCHAR(20)
  CHECK (urgencia IN ('urgente', 'alta', 'normal', 'baixa'))
  DEFAULT 'normal';

-- Coluna para metadados da classificação IA
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS classificacao_ia JSONB;

-- Índices para pesquisa por urgência
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia ON obra_emails(urgencia);
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia_lido ON obra_emails(urgencia, lido)
  WHERE urgencia IN ('urgente', 'alta') AND lido = false;

-- =====================================================
-- 2. COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN obra_emails.urgencia IS 'Nível de urgência do email: urgente, alta, normal, baixa';
COMMENT ON COLUMN obra_emails.classificacao_ia IS 'Metadados da classificação IA: { urgencia, razao, categorias, classificado_em }';

-- =====================================================
-- 3. ATUALIZAR EMAILS EXISTENTES
-- =====================================================

-- Definir urgência padrão para emails existentes sem urgência
UPDATE obra_emails
SET urgencia = 'normal'
WHERE urgencia IS NULL;
-- Migração: Colunas adicionais para sincronização Outlook
-- Data: 2025-01-25
-- Descrição: Adiciona colunas para suportar sincronização com Microsoft Outlook

-- Coluna para ID da mensagem do Outlook (diferente do message_id padrão)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS outlook_message_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_emails_outlook_id ON obra_emails(outlook_message_id) WHERE outlook_message_id IS NOT NULL;

-- Coluna para urgência (já existe na migração email_urgencia.sql, mas vamos garantir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'obra_emails' AND column_name = 'urgencia') THEN
    ALTER TABLE obra_emails ADD COLUMN urgencia VARCHAR(20) DEFAULT 'normal' CHECK (urgencia IN ('urgente', 'alta', 'normal', 'baixa'));
  END IF;
END $$;

-- Coluna para indicar se tem anexos (boolean para filtros rápidos)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS tem_anexos BOOLEAN DEFAULT false;

-- Coluna para fonte do email (outlook, gmail, manual, etc.)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS fonte VARCHAR(50) DEFAULT 'manual';

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia ON obra_emails(urgencia);
CREATE INDEX IF NOT EXISTS idx_obra_emails_fonte ON obra_emails(fonte);
CREATE INDEX IF NOT EXISTS idx_obra_emails_tem_anexos ON obra_emails(tem_anexos) WHERE tem_anexos = true;

-- Atualizar emails existentes que têm anexos
UPDATE obra_emails SET tem_anexos = true WHERE anexos IS NOT NULL AND anexos != '[]'::jsonb AND tem_anexos = false;

COMMENT ON COLUMN obra_emails.outlook_message_id IS 'ID único da mensagem no Microsoft Outlook (para evitar duplicados na sincronização)';
COMMENT ON COLUMN obra_emails.urgencia IS 'Nível de urgência: urgente, alta, normal, baixa';
COMMENT ON COLUMN obra_emails.tem_anexos IS 'Indica se o email tem anexos (para filtros rápidos)';
COMMENT ON COLUMN obra_emails.fonte IS 'Fonte do email: outlook, gmail, manual, webhook';
-- Seed: Email de teste para testar detecção de decisões
-- Data: 2025-01-25
-- Descrição: Insere um email de teste com decisões claras para validar a funcionalidade

-- Primeiro, obter um projeto/obra válido para associar o email
DO $$
DECLARE
  v_obra_id UUID;
  v_projeto_id UUID;
BEGIN
  -- Tentar obter uma obra existente
  SELECT id INTO v_obra_id FROM obras WHERE estado = 'em_curso' LIMIT 1;

  -- Se não houver obra, tentar obter um projeto
  IF v_obra_id IS NULL THEN
    SELECT id INTO v_projeto_id FROM projetos WHERE arquivado = false LIMIT 1;
  END IF;

  -- Inserir email de teste (usando obra_id se disponível)
  INSERT INTO obra_emails (
    obra_id,
    de_email,
    de_nome,
    para_emails,
    assunto,
    corpo_texto,
    tipo,
    data_envio,
    data_recebido,
    lido,
    importante,
    codigo_obra_detectado
  ) VALUES (
    COALESCE(v_obra_id, v_projeto_id),
    'joao.silva@cliente.com',
    'João Silva',
    '[{"email": "ines@gavinhogroup.com", "nome": "Inês Gavinho"}]'::jsonb,
    'RE: Confirmação materiais WC Suite - Maria Residences',
    'Olá Inês,

Após a reunião de ontem com a equipa, venho confirmar as seguintes decisões:

1. BANCADA WC SUITE
Confirmamos que queremos avançar com o mármore Calacatta Gold para a bancada do WC Suite principal, conforme a amostra que nos mostraram na visita à pedreira.

2. TORNEIRA WC
Aprovamos a torneira Fantini série Lamè em dourado escovado. Por favor encomendem 2 unidades (uma para o WC suite e outra para o WC social).

3. ORÇAMENTO ADICIONAL
O orçamento adicional de €3.200 para os acabamentos premium está aprovado. Podem avançar com a encomenda.

4. PRAZO DE ENTREGA
Precisamos que a instalação esteja concluída até 15 de Março, conforme acordado.

Por favor confirmem a recepção deste email e a data de entrega prevista dos materiais.

Cumprimentos,
João Silva
Cliente - Maria Residences
Telemóvel: +351 912 345 678',
    'recebido',
    NOW(),
    NOW(),
    false,
    true,
    'GA00402'
  );

  RAISE NOTICE 'Email de teste inserido com sucesso!';
END $$;

-- Verificar inserção
SELECT id, assunto, de_nome, corpo_texto, created_at
FROM obra_emails
WHERE assunto LIKE '%Confirmação materiais WC Suite%'
ORDER BY created_at DESC
LIMIT 1;
-- Migração: Adiciona created_by à tabela decisoes
-- Data: 2025-01-26
-- Descrição: O trigger log_decisao_created() espera esta coluna

-- Adicionar coluna created_by para o trigger funcionar
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS created_by UUID;

-- Comentário explicativo
COMMENT ON COLUMN decisoes.created_by IS 'UUID do utilizador que criou a decisão. Usado pelo trigger log_decisao_created().';
-- MQT (Mapa de Quantidades de Trabalho) Tables
-- ============================================

-- Tabela principal de mapas
CREATE TABLE IF NOT EXISTS mqt_mapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    versao VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'em_execucao', 'concluido')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de capítulos
CREATE TABLE IF NOT EXISTS mqt_capitulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapa_id UUID REFERENCES mqt_mapas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mapa_id, numero)
);

-- Tabela de items (linhas do MQT)
CREATE TABLE IF NOT EXISTS mqt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapa_id UUID REFERENCES mqt_mapas(id) ON DELETE CASCADE,
    capitulo_id UUID REFERENCES mqt_capitulos(id) ON DELETE CASCADE,
    referencia VARCHAR(50) NOT NULL,
    tipo VARCHAR(255),
    subtipo VARCHAR(255),
    zona VARCHAR(255),
    descricao TEXT NOT NULL,
    unidade VARCHAR(20) NOT NULL CHECK (unidade IN ('m²', 'm³', 'ml', 'un', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç')),
    quantidade DECIMAL(12,2) DEFAULT 0,
    preco_unitario DECIMAL(12,2) DEFAULT 0,
    -- Campos de execução
    quantidade_executada DECIMAL(12,2) DEFAULT 0,
    percentagem_execucao DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN quantidade > 0 THEN LEAST((quantidade_executada / quantidade) * 100, 100) ELSE 0 END
    ) STORED,
    data_inicio DATE,
    data_conclusao DATE,
    -- Organização
    ordem INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    item_pai_id UUID REFERENCES mqt_items(id) ON DELETE SET NULL,
    -- Metadata
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mqt_mapas_obra ON mqt_mapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_mapa ON mqt_items(mapa_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_capitulo ON mqt_items(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_referencia ON mqt_items(referencia);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_mqt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mqt_mapas_updated
    BEFORE UPDATE ON mqt_mapas
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

CREATE TRIGGER trigger_mqt_capitulos_updated
    BEFORE UPDATE ON mqt_capitulos
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

CREATE TRIGGER trigger_mqt_items_updated
    BEFORE UPDATE ON mqt_items
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

-- View para totais por capítulo
CREATE OR REPLACE VIEW mqt_capitulos_totais AS
SELECT
    c.id,
    c.mapa_id,
    c.numero,
    c.nome,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_capitulos c
LEFT JOIN mqt_items i ON i.capitulo_id = c.id
GROUP BY c.id, c.mapa_id, c.numero, c.nome;

-- View para totais do mapa
CREATE OR REPLACE VIEW mqt_mapas_totais AS
SELECT
    m.id,
    m.obra_id,
    m.nome,
    m.status,
    COUNT(DISTINCT c.id) as total_capitulos,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_mapas m
LEFT JOIN mqt_capitulos c ON c.mapa_id = m.id
LEFT JOIN mqt_items i ON i.mapa_id = m.id
GROUP BY m.id, m.obra_id, m.nome, m.status;

-- RLS Policies
ALTER TABLE mqt_mapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqt_capitulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura MQT mapas" ON mqt_mapas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT mapas" ON mqt_mapas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT mapas" ON mqt_mapas FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT mapas" ON mqt_mapas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura MQT capitulos" ON mqt_capitulos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT capitulos" ON mqt_capitulos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT capitulos" ON mqt_capitulos FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT capitulos" ON mqt_capitulos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura MQT items" ON mqt_items FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT items" ON mqt_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT items" ON mqt_items FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT items" ON mqt_items FOR DELETE USING (true);

-- Comentários
COMMENT ON TABLE mqt_mapas IS 'Mapas de Quantidades de Trabalho principais';
COMMENT ON TABLE mqt_capitulos IS 'Capítulos do MQT (ex: Demolições, Alvenarias, etc.)';
COMMENT ON TABLE mqt_items IS 'Items individuais do MQT com quantidades e preços';
-- Migração: Adicionar campos de processamento IA aos emails
-- Data: 2025-01-26
-- Descrição: Campos para rastrear se o email foi processado pela IA

-- Adicionar coluna para marcar email como processado
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS processado_ia BOOLEAN DEFAULT FALSE;

-- Adicionar coluna para guardar a classificação do email
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS classificacao_ia VARCHAR(50);

-- Comentários
COMMENT ON COLUMN obra_emails.processado_ia IS 'Indica se o email foi processado pela IA (classificação, diário, tarefas)';
COMMENT ON COLUMN obra_emails.classificacao_ia IS 'Tipo de email classificado pela IA: pedido_informacao, pedido_orcamento, questao_cliente, etc.';

-- Índice para emails não processados
CREATE INDEX IF NOT EXISTS idx_obra_emails_processado ON obra_emails(processado_ia);
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
-- Migração: Adicionar campo metadata ao projeto_diario
-- Data: 2025-01-26
-- Descrição: Campo JSONB para guardar metadados adicionais nas entradas do diário

ALTER TABLE projeto_diario ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN projeto_diario.metadata IS 'Metadados adicionais: tipo_classificado, acao_requerida, etc.';
-- Migração: Criar tabela de tarefas
-- Data: 2025-01-26
-- Descrição: Sistema de tarefas rastreáveis ligadas a projetos e emails

-- =====================================================
-- TABELA PRINCIPAL: TAREFAS
-- =====================================================

CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relacionamentos
  projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES utilizadores(id),
  criado_por_id UUID REFERENCES utilizadores(id),
  tarefa_pai_id UUID REFERENCES tarefas(id) ON DELETE CASCADE,

  -- Conteúdo
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  notas TEXT,

  -- Classificação
  categoria VARCHAR(50) DEFAULT 'geral',
  -- Valores: 'geral', 'email_resposta', 'email_followup', 'email_orcamento', 'email_informacao', 'design', 'procurement', 'cliente', 'obra'

  prioridade VARCHAR(20) DEFAULT 'media',
  -- Valores: 'baixa', 'media', 'alta', 'urgente'

  status VARCHAR(30) DEFAULT 'pendente',
  -- Valores: 'pendente', 'em_progresso', 'em_revisao', 'concluida', 'cancelada'

  -- Datas
  data_limite DATE,
  data_inicio DATE,
  data_conclusao TIMESTAMP WITH TIME ZONE,

  -- Origem (para tarefas criadas automaticamente)
  origem_tipo VARCHAR(50),
  -- Valores: 'manual', 'email', 'decisao', 'sistema'
  origem_id UUID,
  -- ID do email, decisão ou outro objeto que originou a tarefa

  -- Email relacionado (quando origem_tipo = 'email')
  email_id UUID REFERENCES obra_emails(id) ON DELETE SET NULL,
  email_assunto VARCHAR(500),
  email_de VARCHAR(255),

  -- Metadados
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra ON tarefas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_prioridade ON tarefas(prioridade);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_limite ON tarefas(data_limite);
CREATE INDEX IF NOT EXISTS idx_tarefas_email ON tarefas(email_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_origem ON tarefas(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_pai ON tarefas(tarefa_pai_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tarefas_updated_at ON tarefas;
CREATE TRIGGER trigger_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION update_tarefas_updated_at();

-- Comentários
COMMENT ON TABLE tarefas IS 'Tarefas rastreáveis do projeto, incluindo follow-ups automáticos de emails';
COMMENT ON COLUMN tarefas.categoria IS 'Tipo de tarefa: geral, email_resposta, email_followup, email_orcamento, email_informacao, design, procurement, cliente, obra';
COMMENT ON COLUMN tarefas.origem_tipo IS 'Origem da tarefa: manual, email, decisao, sistema';
COMMENT ON COLUMN tarefas.origem_id IS 'ID do objeto que originou a tarefa (email_id, decisao_id, etc.)';

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver tarefas dos seus projetos
CREATE POLICY "Visualizar tarefas dos projetos" ON tarefas
  FOR SELECT USING (true);

-- Policy: Utilizadores autenticados podem criar tarefas
CREATE POLICY "Criar tarefas" ON tarefas
  FOR INSERT WITH CHECK (true);

-- Policy: Utilizadores podem atualizar tarefas
CREATE POLICY "Atualizar tarefas" ON tarefas
  FOR UPDATE USING (true);

-- Policy: Utilizadores podem eliminar tarefas
CREATE POLICY "Eliminar tarefas" ON tarefas
  FOR DELETE USING (true);
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
-- FUNÇÃO PARA UPDATED_AT (se não existir)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- ============================================
-- FIX: Drop views before recreating
-- Solves "cannot drop columns from view" error
-- ============================================

-- Drop all views that may have column changes
-- Using CASCADE to handle any dependencies

DROP VIEW IF EXISTS obra_documentos_execucao CASCADE;
DROP VIEW IF EXISTS v_checklist_resumo CASCADE;
DROP VIEW IF EXISTS v_chat_ultimas_mensagens CASCADE;
DROP VIEW IF EXISTS v_tracking_obra CASCADE;
DROP VIEW IF EXISTS v_obra_timeline_completa CASCADE;
DROP VIEW IF EXISTS v_obra_acoes_pendentes CASCADE;
DROP VIEW IF EXISTS v_obra_comunicacoes_stats CASCADE;
DROP VIEW IF EXISTS v_ia_processamento_stats CASCADE;
DROP VIEW IF EXISTS v_ia_mensagens_pendentes CASCADE;
DROP VIEW IF EXISTS v_analises_completas CASCADE;
DROP VIEW IF EXISTS v_estatisticas_concelho CASCADE;
DROP VIEW IF EXISTS mqt_capitulos_totais CASCADE;
DROP VIEW IF EXISTS mqt_mapas_totais CASCADE;

-- ============================================
-- RECREATE: obra_documentos_execucao
-- ============================================

CREATE VIEW obra_documentos_execucao AS
SELECT
  ef.id,
  ef.nome_ficheiro,
  ef.tipo_ficheiro,
  ef.ficheiro_url,
  ef.versao,
  ef.tamanho_bytes,
  ef.aprovado_em,
  ef.aprovado_por,
  ef.aprovado_por_nome,
  ef.notas,
  pe.codigo AS entregavel_codigo,
  pe.nome AS entregavel_descricao,
  pe.escala,
  pe.fase,
  p.id AS projeto_id,
  p.nome AS projeto_nome,
  o.id AS obra_id
FROM entrega_ficheiros ef
JOIN projeto_entregaveis pe ON ef.entregavel_id = pe.id
JOIN projetos p ON ef.projeto_id = p.id
LEFT JOIN obras o ON o.projeto_id = p.id
WHERE ef.aprovado_construcao = true
  AND ef.versao_atual = true
ORDER BY ef.aprovado_em DESC;

-- ============================================
-- RECREATE: v_checklist_resumo
-- ============================================

CREATE VIEW v_checklist_resumo AS
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
-- RECREATE: v_chat_ultimas_mensagens
-- ============================================

CREATE VIEW v_chat_ultimas_mensagens AS
SELECT DISTINCT ON (obra_id)
  obra_id,
  id as ultima_mensagem_id,
  conteudo as ultima_mensagem,
  autor_tipo,
  autor_nome,
  created_at as ultima_mensagem_em
FROM chat_mensagens
ORDER BY obra_id, created_at DESC;

-- ============================================
-- RECREATE: v_tracking_obra
-- ============================================

CREATE VIEW v_tracking_obra AS
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
-- RECREATE: v_obra_timeline_completa
-- ============================================

CREATE VIEW v_obra_timeline_completa AS
SELECT
  t.id,
  t.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  t.canal_id,
  c.nome as canal_nome,
  c.tipo as canal_tipo,
  t.tipo_item,
  t.item_id,
  t.titulo,
  t.resumo,
  t.autor_nome,
  t.autor_contacto,
  t.metadados,
  t.tem_anexos,
  t.anexos_count,
  t.lido,
  t.importante,
  t.tem_accoes,
  t.accoes_count,
  t.data_evento,
  t.created_at
FROM obra_timeline t
JOIN obras o ON t.obra_id = o.id
LEFT JOIN obra_canais c ON t.canal_id = c.id
ORDER BY t.data_evento DESC;

-- ============================================
-- RECREATE: v_obra_acoes_pendentes
-- ============================================

CREATE VIEW v_obra_acoes_pendentes AS
SELECT
  a.id,
  a.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  a.canal_id,
  c.nome as canal_nome,
  a.tipo_acao,
  a.titulo,
  a.descricao,
  a.responsavel_nome,
  a.prazo,
  a.estado,
  a.prioridade,
  a.severidade,
  a.created_at,
  CASE
    WHEN a.prazo < NOW() THEN 'atrasada'
    WHEN a.prazo < NOW() + INTERVAL '1 day' THEN 'urgente'
    WHEN a.prazo < NOW() + INTERVAL '3 days' THEN 'proxima'
    ELSE 'normal'
  END as urgencia
FROM obra_acoes a
JOIN obras o ON a.obra_id = o.id
LEFT JOIN obra_canais c ON a.canal_id = c.id
WHERE a.estado NOT IN ('concluida', 'cancelada')
ORDER BY
  CASE a.prioridade
    WHEN 'urgente' THEN 1
    WHEN 'alta' THEN 2
    WHEN 'media' THEN 3
    ELSE 4
  END,
  a.prazo ASC NULLS LAST;

-- ============================================
-- RECREATE: v_obra_comunicacoes_stats
-- ============================================

CREATE VIEW v_obra_comunicacoes_stats AS
SELECT
  o.id as obra_id,
  o.codigo,
  o.codigo_canonico,
  o.nome,
  COUNT(DISTINCT wm.id) as total_whatsapp,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'recebida') as whatsapp_recebidas,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'enviada') as whatsapp_enviadas,
  COUNT(DISTINCT e.id) as total_emails,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'recebido') as emails_recebidos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'enviado') as emails_enviados,
  COUNT(DISTINCT a.id) as total_acoes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'pendente') as acoes_pendentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'concluida') as acoes_concluidas,
  COUNT(DISTINCT c.id) as total_canais
FROM obras o
LEFT JOIN whatsapp_mensagens wm ON o.id = wm.obra_id
LEFT JOIN obra_emails e ON o.id = e.obra_id
LEFT JOIN obra_acoes a ON o.id = a.obra_id
LEFT JOIN obra_canais c ON o.id = c.id AND c.ativo = true
GROUP BY o.id, o.codigo, o.codigo_canonico, o.nome;

-- ============================================
-- RECREATE: v_ia_processamento_stats
-- ============================================

CREATE VIEW v_ia_processamento_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as execucoes,
  SUM(whatsapp_processadas) as whatsapp_total,
  SUM(whatsapp_sugestoes) as whatsapp_sugestoes_total,
  SUM(email_processadas) as email_total,
  SUM(email_sugestoes) as email_sugestoes_total,
  AVG(duracao_ms)::INTEGER as duracao_media_ms,
  COUNT(*) FILTER (WHERE sucesso = false) as falhas
FROM ia_processamento_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- ============================================
-- RECREATE: v_ia_mensagens_pendentes
-- ============================================

CREATE VIEW v_ia_mensagens_pendentes AS
SELECT
  'whatsapp' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM whatsapp_mensagens
WHERE processada_ia = false AND tipo = 'recebida' AND conteudo IS NOT NULL

UNION ALL

SELECT
  'email' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM obra_emails
WHERE processado_ia = false AND tipo = 'recebido' AND corpo_texto IS NOT NULL;

-- ============================================
-- RECREATE: v_analises_completas
-- ============================================

CREATE VIEW v_analises_completas AS
SELECT
    a.*,
    c.nome as concelho_nome,
    c.codigo as concelho_codigo,
    p.codigo as projeto_codigo,
    p.nome as projeto_nome,
    u.nome as criado_por_nome,
    (SELECT COUNT(*) FROM analise_versoes av WHERE av.analise_id = a.id) as total_versoes,
    (SELECT MAX(versao) FROM analise_versoes av WHERE av.analise_id = a.id) as ultima_versao
FROM analises_viabilidade a
LEFT JOIN concelhos c ON a.concelho_id = c.id
LEFT JOIN projetos p ON a.projeto_id = p.id
LEFT JOIN utilizadores u ON a.created_by = u.id;

-- ============================================
-- RECREATE: v_estatisticas_concelho
-- ============================================

CREATE VIEW v_estatisticas_concelho AS
SELECT
    c.id,
    c.nome,
    c.codigo,
    COUNT(a.id) as total_analises,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel' THEN 1 END) as viaveis,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel_condicionado' THEN 1 END) as condicionados,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'inviavel' THEN 1 END) as inviaveis
FROM concelhos c
LEFT JOIN analises_viabilidade a ON c.id = a.concelho_id
GROUP BY c.id, c.nome, c.codigo;

-- ============================================
-- RECREATE: mqt_capitulos_totais
-- ============================================

CREATE VIEW mqt_capitulos_totais AS
SELECT
    c.id,
    c.mapa_id,
    c.numero,
    c.nome,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_capitulos c
LEFT JOIN mqt_items i ON i.capitulo_id = c.id
GROUP BY c.id, c.mapa_id, c.numero, c.nome;

-- ============================================
-- RECREATE: mqt_mapas_totais
-- ============================================

CREATE VIEW mqt_mapas_totais AS
SELECT
    m.id,
    m.obra_id,
    m.nome,
    m.status,
    COUNT(DISTINCT c.id) as total_capitulos,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_mapas m
LEFT JOIN mqt_capitulos c ON c.mapa_id = m.id
LEFT JOIN mqt_items i ON i.mapa_id = m.id
GROUP BY m.id, m.obra_id, m.nome, m.status;
-- Migração: Criar tabelas da Biblioteca
-- Data: 2025-01-29
-- Descrição: Sistema de gestão de materiais, modelos 3D e inspiração

-- =====================================================
-- TABELA: CATEGORIAS DA BIBLIOTECA
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'materiais',
  -- Valores: 'materiais', 'modelo3d', 'inspiracao'
  icone VARCHAR(50) DEFAULT 'layers',
  cor VARCHAR(20) DEFAULT '#C9A882',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_biblioteca_categorias_tipo ON biblioteca_categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_categorias_ordem ON biblioteca_categorias(ordem);

-- =====================================================
-- TABELA: TAGS DA BIBLIOTECA
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#C9A882',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_tags_nome ON biblioteca_tags(nome);

-- =====================================================
-- TABELA: MATERIAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_materiais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  fornecedor VARCHAR(255),
  referencia VARCHAR(100),
  preco_m2 DECIMAL(10, 2),
  cor VARCHAR(100),
  acabamento VARCHAR(100),
  notas TEXT,
  textura_url TEXT,
  ficha_tecnica_url TEXT,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_categoria ON biblioteca_materiais(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_ativo ON biblioteca_materiais(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_nome ON biblioteca_materiais(nome);

-- =====================================================
-- TABELA: MATERIAIS <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_materiais_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES biblioteca_materiais(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(material_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_tags_material ON biblioteca_materiais_tags(material_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_tags_tag ON biblioteca_materiais_tags(tag_id);

-- =====================================================
-- TABELA: MODELOS 3D
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_modelos3d (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  formato VARCHAR(20),
  fornecedor VARCHAR(255),
  preco DECIMAL(10, 2),
  largura_cm DECIMAL(8, 2),
  altura_cm DECIMAL(8, 2),
  profundidade_cm DECIMAL(8, 2),
  notas TEXT,
  arquivo_url TEXT,
  miniatura_url TEXT,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_categoria ON biblioteca_modelos3d(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_ativo ON biblioteca_modelos3d(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_nome ON biblioteca_modelos3d(nome);

-- =====================================================
-- TABELA: MODELOS 3D <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_modelos3d_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo3d_id UUID REFERENCES biblioteca_modelos3d(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(modelo3d_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_tags_modelo ON biblioteca_modelos3d_tags(modelo3d_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_tags_tag ON biblioteca_modelos3d_tags(tag_id);

-- =====================================================
-- TABELA: INSPIRAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_inspiracao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  fonte VARCHAR(255),
  link_original TEXT,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  notas TEXT,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_categoria ON biblioteca_inspiracao(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_ativo ON biblioteca_inspiracao(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_projeto ON biblioteca_inspiracao(projeto_id);

-- =====================================================
-- TABELA: INSPIRAÇÃO <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_inspiracao_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspiracao_id UUID REFERENCES biblioteca_inspiracao(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(inspiracao_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_tags_inspiracao ON biblioteca_inspiracao_tags(inspiracao_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_tags_tag ON biblioteca_inspiracao_tags(tag_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_biblioteca_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_biblioteca_categorias_updated_at ON biblioteca_categorias;
CREATE TRIGGER trigger_biblioteca_categorias_updated_at
  BEFORE UPDATE ON biblioteca_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_materiais_updated_at ON biblioteca_materiais;
CREATE TRIGGER trigger_biblioteca_materiais_updated_at
  BEFORE UPDATE ON biblioteca_materiais
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_modelos3d_updated_at ON biblioteca_modelos3d;
CREATE TRIGGER trigger_biblioteca_modelos3d_updated_at
  BEFORE UPDATE ON biblioteca_modelos3d
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_inspiracao_updated_at ON biblioteca_inspiracao;
CREATE TRIGGER trigger_biblioteca_inspiracao_updated_at
  BEFORE UPDATE ON biblioteca_inspiracao
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE biblioteca_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_materiais_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_modelos3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_modelos3d_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_inspiracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_inspiracao_tags ENABLE ROW LEVEL SECURITY;

-- Policies para biblioteca_categorias
CREATE POLICY "Visualizar categorias" ON biblioteca_categorias FOR SELECT USING (true);
CREATE POLICY "Criar categorias" ON biblioteca_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar categorias" ON biblioteca_categorias FOR UPDATE USING (true);
CREATE POLICY "Eliminar categorias" ON biblioteca_categorias FOR DELETE USING (true);

-- Policies para biblioteca_tags
CREATE POLICY "Visualizar tags" ON biblioteca_tags FOR SELECT USING (true);
CREATE POLICY "Criar tags" ON biblioteca_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar tags" ON biblioteca_tags FOR UPDATE USING (true);
CREATE POLICY "Eliminar tags" ON biblioteca_tags FOR DELETE USING (true);

-- Policies para biblioteca_materiais
CREATE POLICY "Visualizar materiais" ON biblioteca_materiais FOR SELECT USING (true);
CREATE POLICY "Criar materiais" ON biblioteca_materiais FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar materiais" ON biblioteca_materiais FOR UPDATE USING (true);
CREATE POLICY "Eliminar materiais" ON biblioteca_materiais FOR DELETE USING (true);

-- Policies para biblioteca_materiais_tags
CREATE POLICY "Visualizar materiais_tags" ON biblioteca_materiais_tags FOR SELECT USING (true);
CREATE POLICY "Criar materiais_tags" ON biblioteca_materiais_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar materiais_tags" ON biblioteca_materiais_tags FOR DELETE USING (true);

-- Policies para biblioteca_modelos3d
CREATE POLICY "Visualizar modelos3d" ON biblioteca_modelos3d FOR SELECT USING (true);
CREATE POLICY "Criar modelos3d" ON biblioteca_modelos3d FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar modelos3d" ON biblioteca_modelos3d FOR UPDATE USING (true);
CREATE POLICY "Eliminar modelos3d" ON biblioteca_modelos3d FOR DELETE USING (true);

-- Policies para biblioteca_modelos3d_tags
CREATE POLICY "Visualizar modelos3d_tags" ON biblioteca_modelos3d_tags FOR SELECT USING (true);
CREATE POLICY "Criar modelos3d_tags" ON biblioteca_modelos3d_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar modelos3d_tags" ON biblioteca_modelos3d_tags FOR DELETE USING (true);

-- Policies para biblioteca_inspiracao
CREATE POLICY "Visualizar inspiracao" ON biblioteca_inspiracao FOR SELECT USING (true);
CREATE POLICY "Criar inspiracao" ON biblioteca_inspiracao FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar inspiracao" ON biblioteca_inspiracao FOR UPDATE USING (true);
CREATE POLICY "Eliminar inspiracao" ON biblioteca_inspiracao FOR DELETE USING (true);

-- Policies para biblioteca_inspiracao_tags
CREATE POLICY "Visualizar inspiracao_tags" ON biblioteca_inspiracao_tags FOR SELECT USING (true);
CREATE POLICY "Criar inspiracao_tags" ON biblioteca_inspiracao_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar inspiracao_tags" ON biblioteca_inspiracao_tags FOR DELETE USING (true);

-- =====================================================
-- SEED: CATEGORIAS INICIAIS
-- =====================================================

INSERT INTO biblioteca_categorias (nome, tipo, icone, cor, ordem) VALUES
  -- Materiais
  ('Pedras', 'materiais', 'mountain', '#8B7355', 1),
  ('Madeiras', 'materiais', 'trees', '#A0522D', 2),
  ('Cerâmicos', 'materiais', 'layers', '#CD853F', 3),
  ('Tecidos', 'materiais', 'shirt', '#DEB887', 4),
  ('Metais', 'materiais', 'square', '#708090', 5),
  -- Modelos 3D
  ('Sofás', 'modelo3d', 'sofa', '#8B4513', 1),
  ('Iluminação', 'modelo3d', 'lamp', '#FFD700', 2),
  ('Casa de Banho', 'modelo3d', 'bath', '#4682B4', 3),
  ('Cozinha', 'modelo3d', 'chef-hat', '#CD5C5C', 4),
  ('Exterior', 'modelo3d', 'tree-palm', '#228B22', 5),
  ('Decoração', 'modelo3d', 'flower-2', '#DA70D6', 6),
  -- Inspiração
  ('Interiores', 'inspiracao', 'building', '#696969', 1),
  ('Quartos', 'inspiracao', 'bed', '#6B8E23', 2),
  ('Escritórios', 'inspiracao', 'monitor', '#4169E1', 3),
  ('Detalhes', 'inspiracao', 'zoom-in', '#DB7093', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE biblioteca_categorias IS 'Categorias para organizar materiais, modelos 3D e inspiração';
COMMENT ON TABLE biblioteca_tags IS 'Tags para classificação transversal de itens da biblioteca';
COMMENT ON TABLE biblioteca_materiais IS 'Materiais de construção e acabamentos';
COMMENT ON TABLE biblioteca_modelos3d IS 'Modelos 3D de mobiliário e equipamentos';
COMMENT ON TABLE biblioteca_inspiracao IS 'Imagens de inspiração e referências de design';
-- Migração: Tabelas para integração Telegram
-- Data: 2025-01-29

-- Tabela de configuração do bot Telegram
CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token VARCHAR(100) NOT NULL,
  bot_username VARCHAR(50),
  webhook_url VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_config DISABLE ROW LEVEL SECURITY;

-- Tabela de grupos Telegram associados a obras
CREATE TABLE IF NOT EXISTS telegram_grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL UNIQUE,
  chat_title VARCHAR(255),
  chat_type VARCHAR(20) DEFAULT 'group',
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_grupos DISABLE ROW LEVEL SECURITY;

-- Índices para grupos
CREATE INDEX IF NOT EXISTS idx_telegram_grupos_chat_id ON telegram_grupos(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_grupos_obra ON telegram_grupos(obra_id);

-- Tabela de contactos Telegram
CREATE TABLE IF NOT EXISTS telegram_contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id VARCHAR(50) NOT NULL,
  username VARCHAR(100),
  nome VARCHAR(255) NOT NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  cargo VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_contactos DISABLE ROW LEVEL SECURITY;

-- Índices para contactos
CREATE INDEX IF NOT EXISTS idx_telegram_contactos_telegram_id ON telegram_contactos(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_contactos_obra ON telegram_contactos(obra_id);

-- Tabela de mensagens Telegram
CREATE TABLE IF NOT EXISTS telegram_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_message_id BIGINT,
  chat_id VARCHAR(50) NOT NULL,
  chat_title VARCHAR(255),
  chat_type VARCHAR(20),
  autor_telegram_id VARCHAR(50),
  autor_nome VARCHAR(255),
  autor_username VARCHAR(100),
  conteudo TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'recebida',
  contacto_id UUID REFERENCES telegram_contactos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  anexos JSONB,
  lida BOOLEAN DEFAULT false,
  processada_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_mensagens DISABLE ROW LEVEL SECURITY;

-- Índices para mensagens
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_chat_id ON telegram_mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_obra ON telegram_mensagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_created ON telegram_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_processada ON telegram_mensagens(processada_ia) WHERE processada_ia = false;

-- Comentários
COMMENT ON TABLE telegram_config IS 'Configuração do bot Telegram';
COMMENT ON TABLE telegram_grupos IS 'Grupos Telegram associados a obras';
COMMENT ON TABLE telegram_contactos IS 'Contactos Telegram (membros dos grupos)';
COMMENT ON TABLE telegram_mensagens IS 'Mensagens recebidas via Telegram';
-- =====================================================
-- CHAT TEAMS - Sistema completo tipo Microsoft Teams
-- Canais, Mensagens, Presenca, Typing, Leituras, etc.
-- =====================================================

-- =====================================================
-- 1. CANAIS DE CHAT (por projeto)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_canais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    nome TEXT NOT NULL,
    descricao TEXT,
    icone TEXT DEFAULT 'hash',              -- hash, megaphone, lock, users

    -- Configuracao
    tipo TEXT DEFAULT 'publico',            -- 'publico', 'privado'
    ordem INTEGER DEFAULT 0,

    -- Estado
    arquivado BOOLEAN DEFAULT false,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_canais_projeto ON chat_canais(projeto_id);
CREATE INDEX IF NOT EXISTS idx_chat_canais_ordem ON chat_canais(ordem);

-- =====================================================
-- 2. TOPICOS DE CHAT (threads dentro de canais)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_topicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    canal_id UUID NOT NULL REFERENCES chat_canais(id) ON DELETE CASCADE,

    -- Identificacao
    titulo TEXT NOT NULL,
    descricao TEXT,

    -- Estado
    fixado BOOLEAN DEFAULT false,
    fechado BOOLEAN DEFAULT false,

    -- Contadores (desnormalizados)
    total_mensagens INTEGER DEFAULT 0,
    total_respostas INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_topicos_canal ON chat_topicos(canal_id);
CREATE INDEX IF NOT EXISTS idx_chat_topicos_fixado ON chat_topicos(fixado DESC);
CREATE INDEX IF NOT EXISTS idx_chat_topicos_updated ON chat_topicos(updated_at DESC);

-- =====================================================
-- 3. MENSAGENS DE CHAT
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES chat_mensagens(id) ON DELETE SET NULL, -- Para replies em thread

    -- Conteudo
    conteudo TEXT NOT NULL,
    conteudo_formatado TEXT,                -- HTML renderizado do markdown/rich text
    tipo TEXT DEFAULT 'texto',              -- 'texto', 'imagem', 'ficheiro', 'sistema'

    -- Ficheiros (quando tipo = imagem ou ficheiro)
    ficheiro_url TEXT,
    ficheiro_nome TEXT,
    ficheiro_tamanho INTEGER,
    ficheiro_tipo TEXT,                     -- MIME type

    -- Edicao
    editado BOOLEAN DEFAULT false,
    editado_at TIMESTAMP WITH TIME ZONE,
    versao_atual INTEGER DEFAULT 1,

    -- Eliminacao (soft delete)
    eliminado BOOLEAN DEFAULT false,
    eliminado_at TIMESTAMP WITH TIME ZONE,
    eliminado_por UUID REFERENCES utilizadores(id),

    -- Metadados
    autor_id UUID REFERENCES utilizadores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_topico ON chat_mensagens(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_parent ON chat_mensagens(parent_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_autor ON chat_mensagens(autor_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON chat_mensagens(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_eliminado ON chat_mensagens(eliminado);

-- Full text search nas mensagens
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_search ON chat_mensagens
    USING gin(to_tsvector('portuguese', coalesce(conteudo, '')));

-- =====================================================
-- 4. HISTORICO DE EDICOES DE MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mensagens_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,

    -- Conteudo anterior
    conteudo_anterior TEXT NOT NULL,
    versao INTEGER NOT NULL,

    -- Quem editou
    editado_por UUID REFERENCES utilizadores(id),
    editado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_hist_mensagem ON chat_mensagens_historico(mensagem_id);

-- =====================================================
-- 5. REACOES A MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_reacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Um utilizador so pode reagir uma vez com o mesmo emoji
    UNIQUE(mensagem_id, utilizador_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reacoes_mensagem ON chat_reacoes(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_chat_reacoes_utilizador ON chat_reacoes(utilizador_id);

-- =====================================================
-- 6. MENCOES (@utilizador)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mencoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Estado de leitura
    lida BOOLEAN DEFAULT false,
    lida_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mencoes_mensagem ON chat_mencoes(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_chat_mencoes_utilizador ON chat_mencoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_mencoes_nao_lidas ON chat_mencoes(utilizador_id, lida) WHERE NOT lida;

-- =====================================================
-- 7. ANEXOS DE MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_anexos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,

    -- Ficheiro
    url TEXT NOT NULL,
    nome TEXT NOT NULL,
    tamanho INTEGER,
    tipo TEXT,                              -- MIME type

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_anexos_mensagem ON chat_anexos(mensagem_id);

-- =====================================================
-- 8. LEITURA DE MENSAGENS (para "nao lidas")
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_leituras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Ultima mensagem lida
    ultima_mensagem_id UUID REFERENCES chat_mensagens(id) ON DELETE SET NULL,
    ultima_leitura_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(topico_id, utilizador_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_leituras_topico ON chat_leituras(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_leituras_utilizador ON chat_leituras(utilizador_id);

-- =====================================================
-- 9. PRESENCA ONLINE DOS UTILIZADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_presenca (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE UNIQUE,

    -- Estado
    estado TEXT DEFAULT 'offline',          -- 'online', 'away', 'busy', 'offline'
    estado_custom TEXT,                     -- Mensagem de estado personalizada

    -- Ultima actividade
    ultima_actividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Dispositivo/contexto
    dispositivo TEXT,                       -- 'web', 'mobile', 'desktop'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_presenca_estado ON chat_presenca(estado);
CREATE INDEX IF NOT EXISTS idx_chat_presenca_actividade ON chat_presenca(ultima_actividade DESC);

-- =====================================================
-- 10. TYPING INDICATOR (quem esta a escrever)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_typing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Timestamp de quando comecou a escrever
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Expira automaticamente (TTL de 5 segundos)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 seconds'),

    -- Unique constraint - um utilizador so pode estar a escrever num topico de cada vez
    UNIQUE(topico_id, utilizador_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_typing_topico ON chat_typing(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_expires ON chat_typing(expires_at);

-- =====================================================
-- 11. NOTIFICACOES PUSH
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Tipo e referencia
    tipo TEXT NOT NULL,                     -- 'mensagem', 'mencao', 'reacao', 'resposta'
    mensagem_id UUID REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    topico_id UUID REFERENCES chat_topicos(id) ON DELETE CASCADE,
    canal_id UUID REFERENCES chat_canais(id) ON DELETE CASCADE,

    -- Conteudo
    titulo TEXT NOT NULL,
    corpo TEXT,

    -- Quem originou
    originado_por UUID REFERENCES utilizadores(id),

    -- Estado
    lido BOOLEAN DEFAULT false,
    lido_at TIMESTAMP WITH TIME ZONE,

    -- Push notification
    push_enviado BOOLEAN DEFAULT false,
    push_enviado_at TIMESTAMP WITH TIME ZONE,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_notif_utilizador ON chat_notificacoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_notif_nao_lidas ON chat_notificacoes(utilizador_id, lido) WHERE NOT lido;
CREATE INDEX IF NOT EXISTS idx_chat_notif_created ON chat_notificacoes(created_at DESC);

-- =====================================================
-- 12. SUBSCRICOES DE NOTIFICACAO (preferencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_subscricoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Referencia (pode ser canal ou topico)
    canal_id UUID REFERENCES chat_canais(id) ON DELETE CASCADE,
    topico_id UUID REFERENCES chat_topicos(id) ON DELETE CASCADE,

    -- Preferencias
    notificar BOOLEAN DEFAULT true,
    notificar_mencoes BOOLEAN DEFAULT true,
    notificar_respostas BOOLEAN DEFAULT true,

    -- Silenciar ate
    silenciado_ate TIMESTAMP WITH TIME ZONE,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Apenas uma subscricao por utilizador/canal ou utilizador/topico
    UNIQUE(utilizador_id, canal_id),
    UNIQUE(utilizador_id, topico_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_subs_utilizador ON chat_subscricoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_subs_canal ON chat_subscricoes(canal_id);
CREATE INDEX IF NOT EXISTS idx_chat_subs_topico ON chat_subscricoes(topico_id);

-- =====================================================
-- 13. PUSH SUBSCRIPTION (Web Push API)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Web Push subscription data
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,                   -- Public key
    auth TEXT NOT NULL,                     -- Auth secret

    -- Dispositivo
    user_agent TEXT,
    dispositivo TEXT,                       -- 'chrome', 'firefox', 'safari', etc.

    -- Estado
    activo BOOLEAN DEFAULT true,
    ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_utilizador ON chat_push_subscriptions(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_activo ON chat_push_subscriptions(activo) WHERE activo;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Funcao generica para updated_at (se nao existir)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_chat_canais_updated ON chat_canais;
CREATE TRIGGER trigger_chat_canais_updated
    BEFORE UPDATE ON chat_canais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_topicos_updated ON chat_topicos;
CREATE TRIGGER trigger_chat_topicos_updated
    BEFORE UPDATE ON chat_topicos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_mensagens_updated ON chat_mensagens;
CREATE TRIGGER trigger_chat_mensagens_updated
    BEFORE UPDATE ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_presenca_updated ON chat_presenca;
CREATE TRIGGER trigger_chat_presenca_updated
    BEFORE UPDATE ON chat_presenca
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar contadores de mensagens no topico
CREATE OR REPLACE FUNCTION update_topico_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_id IS NULL THEN
            UPDATE chat_topicos SET total_mensagens = total_mensagens + 1, updated_at = NOW() WHERE id = NEW.topico_id;
        ELSE
            UPDATE chat_topicos SET total_respostas = total_respostas + 1, updated_at = NOW() WHERE id = NEW.topico_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.parent_id IS NULL THEN
            UPDATE chat_topicos SET total_mensagens = GREATEST(total_mensagens - 1, 0), updated_at = NOW() WHERE id = OLD.topico_id;
        ELSE
            UPDATE chat_topicos SET total_respostas = GREATEST(total_respostas - 1, 0), updated_at = NOW() WHERE id = OLD.topico_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_topico_counters ON chat_mensagens;
CREATE TRIGGER trigger_update_topico_counters
    AFTER INSERT OR DELETE ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_topico_counters();

-- Trigger para guardar historico de edicoes
CREATE OR REPLACE FUNCTION save_mensagem_historico()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.conteudo IS DISTINCT FROM NEW.conteudo THEN
        INSERT INTO chat_mensagens_historico (mensagem_id, conteudo_anterior, versao, editado_por, editado_at)
        VALUES (OLD.id, OLD.conteudo, OLD.versao_atual, NEW.autor_id, NOW());

        NEW.editado = true;
        NEW.editado_at = NOW();
        NEW.versao_atual = OLD.versao_atual + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_save_mensagem_historico ON chat_mensagens;
CREATE TRIGGER trigger_save_mensagem_historico
    BEFORE UPDATE OF conteudo ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION save_mensagem_historico();

-- Funcao para limpar typing indicators expirados
CREATE OR REPLACE FUNCTION cleanup_expired_typing()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_typing WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Funcao para actualizar presenca para "away" apos inactividade
CREATE OR REPLACE FUNCTION update_away_presence()
RETURNS void AS $$
BEGIN
    UPDATE chat_presenca
    SET estado = 'away', updated_at = NOW()
    WHERE estado = 'online'
    AND ultima_actividade < NOW() - INTERVAL '5 minutes';

    UPDATE chat_presenca
    SET estado = 'offline', updated_at = NOW()
    WHERE estado IN ('online', 'away')
    AND ultima_actividade < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCOES UTILITARIAS
-- =====================================================

-- Funcao para contar mensagens nao lidas num topico
CREATE OR REPLACE FUNCTION get_unread_count(p_topico_id UUID, p_utilizador_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_ultima_leitura TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    -- Obter ultima leitura
    SELECT ultima_leitura_at INTO v_ultima_leitura
    FROM chat_leituras
    WHERE topico_id = p_topico_id AND utilizador_id = p_utilizador_id;

    -- Se nunca leu, conta todas
    IF v_ultima_leitura IS NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM chat_mensagens
        WHERE topico_id = p_topico_id AND eliminado = false AND autor_id != p_utilizador_id;
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM chat_mensagens
        WHERE topico_id = p_topico_id
        AND eliminado = false
        AND autor_id != p_utilizador_id
        AND created_at > v_ultima_leitura;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Funcao para pesquisar mensagens
CREATE OR REPLACE FUNCTION search_chat_messages(
    p_projeto_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    mensagem_id UUID,
    topico_id UUID,
    canal_id UUID,
    canal_nome TEXT,
    topico_titulo TEXT,
    conteudo TEXT,
    autor_nome TEXT,
    autor_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS mensagem_id,
        m.topico_id,
        c.id AS canal_id,
        c.nome AS canal_nome,
        t.titulo AS topico_titulo,
        m.conteudo,
        u.nome AS autor_nome,
        u.avatar_url AS autor_avatar,
        m.created_at,
        ts_rank(to_tsvector('portuguese', m.conteudo), plainto_tsquery('portuguese', p_query)) AS rank
    FROM chat_mensagens m
    JOIN chat_topicos t ON m.topico_id = t.id
    JOIN chat_canais c ON t.canal_id = c.id
    LEFT JOIN utilizadores u ON m.autor_id = u.id
    WHERE c.projeto_id = p_projeto_id
    AND m.eliminado = false
    AND to_tsvector('portuguese', m.conteudo) @@ plainto_tsquery('portuguese', p_query)
    ORDER BY rank DESC, m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE chat_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_subscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies - permitir acesso a utilizadores autenticados
-- (Numa implementacao mais robusta, verificariamos se o utilizador pertence ao projeto)

CREATE POLICY "chat_canais_all" ON chat_canais FOR ALL USING (true);
CREATE POLICY "chat_topicos_all" ON chat_topicos FOR ALL USING (true);
CREATE POLICY "chat_mensagens_all" ON chat_mensagens FOR ALL USING (true);
CREATE POLICY "chat_mensagens_historico_all" ON chat_mensagens_historico FOR ALL USING (true);
CREATE POLICY "chat_reacoes_all" ON chat_reacoes FOR ALL USING (true);
CREATE POLICY "chat_mencoes_all" ON chat_mencoes FOR ALL USING (true);
CREATE POLICY "chat_anexos_all" ON chat_anexos FOR ALL USING (true);
CREATE POLICY "chat_leituras_all" ON chat_leituras FOR ALL USING (true);
CREATE POLICY "chat_presenca_all" ON chat_presenca FOR ALL USING (true);
CREATE POLICY "chat_typing_all" ON chat_typing FOR ALL USING (true);
CREATE POLICY "chat_notificacoes_all" ON chat_notificacoes FOR ALL USING (true);
CREATE POLICY "chat_subscricoes_all" ON chat_subscricoes FOR ALL USING (true);
CREATE POLICY "chat_push_subscriptions_all" ON chat_push_subscriptions FOR ALL USING (true);

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================
-- Habilitar realtime para as tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presenca;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_notificacoes;
-- =====================================================
-- Remover utilizadores especificos
-- =====================================================

-- Primeiro, remover de tabelas relacionadas (para evitar erros de FK)
DELETE FROM projeto_equipa WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_presenca se existir
DELETE FROM chat_presenca WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_leituras se existir
DELETE FROM chat_leituras WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_mencoes se existir
DELETE FROM chat_mencoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_notificacoes se existir
DELETE FROM chat_notificacoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_subscricoes se existir
DELETE FROM chat_subscricoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_push_subscriptions se existir
DELETE FROM chat_push_subscriptions WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Marcar utilizadores como inativos (soft delete - mais seguro)
UPDATE utilizadores
SET ativo = false,
    updated_at = NOW()
WHERE email IN (
    'alana.oliveira@by-gavinho.com',
    'nathalia.bampi@by-gavinho.com',
    'raquel.sonobe@by-gavinho.com',
    'leonardo.ribeiro@by-gavinho.com',
    'patricia.morais@by-gavinho.com'
);

-- Se preferires eliminar completamente (descomentar se necessario):
-- DELETE FROM utilizadores WHERE email IN (
--     'alana.oliveira@by-gavinho.com',
--     'nathalia.bampi@by-gavinho.com',
--     'raquel.sonobe@by-gavinho.com',
--     'leonardo.ribeiro@by-gavinho.com',
--     'patricia.morais@by-gavinho.com'
-- );

-- Remover tambem do Supabase Auth (tem de ser feito via dashboard ou API admin)
-- Os utilizadores ficam inativos na tabela utilizadores mas mantem a conta auth
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
-- Migration: Add internal platform code for projects
-- This code is auto-generated and used for AI/platform identification
-- Separate from the external GAVINHO code (GA00413, etc.)

-- Add codigo_interno column
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS codigo_interno TEXT;

-- Create sequence for auto-generation
CREATE SEQUENCE IF NOT EXISTS projetos_codigo_interno_seq START WITH 1;

-- Function to generate internal code (PRJ-001, PRJ-002, etc.)
CREATE OR REPLACE FUNCTION generate_codigo_interno()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_interno IS NULL THEN
    NEW.codigo_interno := 'PRJ-' || LPAD(nextval('projetos_codigo_interno_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate on insert
DROP TRIGGER IF EXISTS trigger_codigo_interno ON projetos;
CREATE TRIGGER trigger_codigo_interno
  BEFORE INSERT ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION generate_codigo_interno();

-- Update existing projects that don't have codigo_interno
DO $$
DECLARE
  r RECORD;
  counter INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM projetos WHERE codigo_interno IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE projetos
    SET codigo_interno = 'PRJ-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
    counter := counter + 1;
  END LOOP;

  -- Update sequence to start after existing projects
  IF counter > 1 THEN
    PERFORM setval('projetos_codigo_interno_seq', counter);
  END IF;
END $$;

-- Add unique constraint
ALTER TABLE projetos DROP CONSTRAINT IF EXISTS projetos_codigo_interno_unique;
ALTER TABLE projetos ADD CONSTRAINT projetos_codigo_interno_unique UNIQUE (codigo_interno);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projetos_codigo_interno ON projetos(codigo_interno);

COMMENT ON COLUMN projetos.codigo_interno IS 'Internal platform code (auto-generated, e.g., PRJ-0001). Used for AI identification and internal references.';
-- =====================================================
-- PROJETO ATAS TABLE
-- Atas de reuniao para projetos
-- =====================================================

-- Criar tabela de atas
CREATE TABLE IF NOT EXISTS projeto_atas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  fase VARCHAR(100),

  -- Informacoes da reuniao
  titulo VARCHAR(500) NOT NULL,
  data_reuniao DATE NOT NULL,
  local VARCHAR(255),
  hora_inicio TIME,
  hora_fim TIME,

  -- Participantes (JSON array)
  participantes JSONB DEFAULT '[]',

  -- Conteudo da ata (HTML rich text)
  conteudo TEXT,

  -- Ordem do dia (JSON array)
  ordem_dia JSONB DEFAULT '[]',

  -- Decisoes tomadas (JSON array)
  decisoes JSONB DEFAULT '[]',

  -- Acoes a realizar (JSON array com responsavel e prazo)
  acoes JSONB DEFAULT '[]',

  -- Proxima reuniao
  proxima_reuniao DATE,
  proxima_reuniao_local VARCHAR(255),
  proxima_reuniao_hora TIME,

  -- Metadata
  numero_ata INTEGER,
  status VARCHAR(50) DEFAULT 'rascunho',
  criado_por UUID REFERENCES utilizadores(id),
  aprovado_por UUID REFERENCES utilizadores(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_projeto_atas_projeto ON projeto_atas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_data ON projeto_atas(data_reuniao DESC);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_fase ON projeto_atas(fase);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_status ON projeto_atas(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_projeto_atas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_atas_updated_at ON projeto_atas;
CREATE TRIGGER trigger_projeto_atas_updated_at
  BEFORE UPDATE ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_atas_updated_at();

-- Funcao para auto-incrementar numero_ata por projeto
CREATE OR REPLACE FUNCTION auto_increment_numero_ata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_ata IS NULL THEN
    SELECT COALESCE(MAX(numero_ata), 0) + 1
    INTO NEW.numero_ata
    FROM projeto_atas
    WHERE projeto_id = NEW.projeto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_increment_numero_ata ON projeto_atas;
CREATE TRIGGER trigger_auto_increment_numero_ata
  BEFORE INSERT ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_numero_ata();

-- RLS
ALTER TABLE projeto_atas ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "projeto_atas_select" ON projeto_atas
  FOR SELECT USING (true);

CREATE POLICY "projeto_atas_insert" ON projeto_atas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "projeto_atas_update" ON projeto_atas
  FOR UPDATE USING (true);

CREATE POLICY "projeto_atas_delete" ON projeto_atas
  FOR DELETE USING (true);

-- Comentarios
COMMENT ON TABLE projeto_atas IS 'Atas de reuniao de projetos';
COMMENT ON COLUMN projeto_atas.participantes IS 'Array JSON de participantes [{nome, cargo, entidade}]';
COMMENT ON COLUMN projeto_atas.conteudo IS 'Conteudo HTML da ata (rich text)';
COMMENT ON COLUMN projeto_atas.ordem_dia IS 'Array JSON de pontos da ordem do dia';
COMMENT ON COLUMN projeto_atas.decisoes IS 'Array JSON de decisoes [{texto, responsavel}]';
COMMENT ON COLUMN projeto_atas.acoes IS 'Array JSON de acoes [{descricao, responsavel, prazo, concluida}]';
COMMENT ON COLUMN projeto_atas.status IS 'Status: rascunho, pendente_aprovacao, aprovada, arquivada';
-- Migration: Create projeto_moodboards table for HTML moodboard uploads
-- Date: 2025-02-01
-- Description: Stores HTML moodboard files for project briefing/concept visualization

-- Create projeto_moodboards table
CREATE TABLE IF NOT EXISTS projeto_moodboards (
  id TEXT PRIMARY KEY DEFAULT ('mb_' || replace(gen_random_uuid()::text, '-', '')),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Moodboard info
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'conceito' CHECK (tipo IN ('conceito', 'materiais', 'cores', 'espacos', 'outro')),

  -- File info
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,

  -- Metadata
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_projeto_id ON projeto_moodboards(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_tipo ON projeto_moodboards(tipo);
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_created_at ON projeto_moodboards(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_projeto_moodboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_moodboards_updated_at ON projeto_moodboards;
CREATE TRIGGER trigger_projeto_moodboards_updated_at
  BEFORE UPDATE ON projeto_moodboards
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_moodboards_updated_at();

-- Enable RLS
ALTER TABLE projeto_moodboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project moodboards"
  ON projeto_moodboards FOR SELECT
  USING (true);

CREATE POLICY "Users can insert project moodboards"
  ON projeto_moodboards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update project moodboards"
  ON projeto_moodboards FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete project moodboards"
  ON projeto_moodboards FOR DELETE
  USING (true);

-- Add comment
COMMENT ON TABLE projeto_moodboards IS 'HTML moodboard files for project briefing and concept visualization';

-- Create storage bucket policy for projeto-files if not exists
-- Note: Run this in Supabase Dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('projeto-files', 'projeto-files', true)
-- ON CONFLICT (id) DO NOTHING;
-- Migration: Create projeto_renders tables
-- These tables store archviz renders, versions, and comments
-- Required for the archviz functionality to persist data

-- =====================================================
-- Table: projeto_renders
-- Main render record - one per compartimento/vista combination
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  compartimento TEXT NOT NULL,
  vista TEXT DEFAULT 'Vista Principal',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projeto_renders_projeto_id ON projeto_renders(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_renders_compartimento ON projeto_renders(compartimento);

-- Enable RLS
ALTER TABLE projeto_renders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view renders" ON projeto_renders;
CREATE POLICY "Users can view renders" ON projeto_renders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert renders" ON projeto_renders;
CREATE POLICY "Users can insert renders" ON projeto_renders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update renders" ON projeto_renders;
CREATE POLICY "Users can update renders" ON projeto_renders
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete renders" ON projeto_renders;
CREATE POLICY "Users can delete renders" ON projeto_renders
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_render_versoes
-- Version history for each render (v1, v2, v3, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_render_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id UUID NOT NULL REFERENCES projeto_renders(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  url TEXT NOT NULL,
  is_final BOOLEAN DEFAULT FALSE,
  marked_final_at TIMESTAMPTZ,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_render_versoes_render_id ON projeto_render_versoes(render_id);
CREATE INDEX IF NOT EXISTS idx_projeto_render_versoes_is_final ON projeto_render_versoes(is_final) WHERE is_final = true;

-- Unique constraint: one version number per render
ALTER TABLE projeto_render_versoes DROP CONSTRAINT IF EXISTS projeto_render_versoes_render_versao_unique;
ALTER TABLE projeto_render_versoes ADD CONSTRAINT projeto_render_versoes_render_versao_unique
  UNIQUE (render_id, versao);

-- Enable RLS
ALTER TABLE projeto_render_versoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view versions" ON projeto_render_versoes;
CREATE POLICY "Users can view versions" ON projeto_render_versoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert versions" ON projeto_render_versoes;
CREATE POLICY "Users can insert versions" ON projeto_render_versoes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update versions" ON projeto_render_versoes;
CREATE POLICY "Users can update versions" ON projeto_render_versoes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete versions" ON projeto_render_versoes;
CREATE POLICY "Users can delete versions" ON projeto_render_versoes
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_render_comentarios
-- Comments on renders
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_render_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id UUID NOT NULL REFERENCES projeto_renders(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  autor_id UUID,
  autor_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_render_comentarios_render_id ON projeto_render_comentarios(render_id);

-- Enable RLS
ALTER TABLE projeto_render_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view comments" ON projeto_render_comentarios;
CREATE POLICY "Users can view comments" ON projeto_render_comentarios
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert comments" ON projeto_render_comentarios;
CREATE POLICY "Users can insert comments" ON projeto_render_comentarios
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own comments" ON projeto_render_comentarios;
CREATE POLICY "Users can delete own comments" ON projeto_render_comentarios
  FOR DELETE USING (true);

-- =====================================================
-- Storage bucket for renders
-- =====================================================
-- Note: Storage bucket needs to be created via Supabase dashboard or API
-- Bucket name: 'renders'
-- Public: true (for image URLs to work)

-- Add comments for documentation
COMMENT ON TABLE projeto_renders IS 'Stores render records for archviz - one per compartimento/vista';
COMMENT ON TABLE projeto_render_versoes IS 'Version history for renders - supports multiple versions per render';
COMMENT ON TABLE projeto_render_comentarios IS 'Comments and feedback on renders';

COMMENT ON COLUMN projeto_renders.compartimento IS 'Room/space name (e.g., Sala de Estar, Cozinha)';
COMMENT ON COLUMN projeto_renders.vista IS 'View angle/perspective name';
COMMENT ON COLUMN projeto_render_versoes.is_final IS 'Whether this version is marked as final/approved';
COMMENT ON COLUMN projeto_render_versoes.url IS 'Public URL to the render image in storage';

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_projeto_renders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_renders_updated_at ON projeto_renders;
CREATE TRIGGER trigger_projeto_renders_updated_at
  BEFORE UPDATE ON projeto_renders
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_renders_updated_at();

-- Log migration execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_projeto_renders_tables', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();
-- =====================================================
-- TABELAS ESSENCIAIS DE PROJETO
-- Tabelas que dependem apenas de 'projetos' e 'clientes'
-- =====================================================

-- =====================================================
-- 1. projeto_pagamentos
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  prestacao_numero INTEGER,
  descricao TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendente', -- pendente, pago, atrasado, cancelado
  data_prevista DATE,
  data_pagamento DATE,
  metodo_pagamento TEXT,
  comprovativo_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_projeto_id ON projeto_pagamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_estado ON projeto_pagamentos(estado);

ALTER TABLE projeto_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_pagamentos_select" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_insert" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_update" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_delete" ON projeto_pagamentos;

CREATE POLICY "projeto_pagamentos_select" ON projeto_pagamentos FOR SELECT USING (true);
CREATE POLICY "projeto_pagamentos_insert" ON projeto_pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_pagamentos_update" ON projeto_pagamentos FOR UPDATE USING (true);
CREATE POLICY "projeto_pagamentos_delete" ON projeto_pagamentos FOR DELETE USING (true);

-- =====================================================
-- 2. projeto_servicos
-- =====================================================
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

ALTER TABLE projeto_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_servicos_select" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_insert" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_update" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_delete" ON projeto_servicos;

CREATE POLICY "projeto_servicos_select" ON projeto_servicos FOR SELECT USING (true);
CREATE POLICY "projeto_servicos_insert" ON projeto_servicos FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_servicos_update" ON projeto_servicos FOR UPDATE USING (true);
CREATE POLICY "projeto_servicos_delete" ON projeto_servicos FOR DELETE USING (true);

-- =====================================================
-- 3. projeto_duvidas (para archviz questions)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_duvidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  utilizador_id UUID,
  entregavel_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_referencia TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, em_analise, respondido, fechado
  resposta TEXT,
  respondido_por UUID,
  respondido_em TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_duvidas_projeto_id ON projeto_duvidas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_duvidas_status ON projeto_duvidas(status);

ALTER TABLE projeto_duvidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_duvidas_select" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_insert" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_update" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_delete" ON projeto_duvidas;

CREATE POLICY "projeto_duvidas_select" ON projeto_duvidas FOR SELECT USING (true);
CREATE POLICY "projeto_duvidas_insert" ON projeto_duvidas FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_duvidas_update" ON projeto_duvidas FOR UPDATE USING (true);
CREATE POLICY "projeto_duvidas_delete" ON projeto_duvidas FOR DELETE USING (true);

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_projeto_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_pagamentos_updated_at ON projeto_pagamentos;
CREATE TRIGGER trigger_projeto_pagamentos_updated_at
  BEFORE UPDATE ON projeto_pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_pagamentos_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE projeto_pagamentos IS 'Pagamentos/prestacoes do projeto';
COMMENT ON TABLE projeto_servicos IS 'Servicos contratados para o projeto';
COMMENT ON TABLE projeto_duvidas IS 'Duvidas e pedidos de definicao sobre renders/entregaveis';

-- Log migration
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_projeto_tables_essential', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();
-- =====================================================
-- MIGRAÇÃO: Renomear project_decisions para projeto_duvidas
-- Clarificar a diferença entre:
--   - decisoes: Decisões formais com impacto (orçamento, prazo)
--   - projeto_duvidas: Sistema Q&A/Dúvidas que precisam resposta
-- =====================================================

-- 1. Renomear tabela principal de project_decisions para projeto_duvidas
ALTER TABLE IF EXISTS project_decisions RENAME TO projeto_duvidas;

-- 2. Renomear tabela de comentários
ALTER TABLE IF EXISTS decision_comments RENAME TO duvida_comentarios;

-- 3. Renomear coluna decision_id para duvida_id na tabela de comentários
ALTER TABLE IF EXISTS duvida_comentarios
  RENAME COLUMN decision_id TO duvida_id;

-- 4. Renomear a sequência
ALTER SEQUENCE IF EXISTS decision_seq RENAME TO duvida_seq;

-- 5. Atualizar os índices com novos nomes
DROP INDEX IF EXISTS idx_decisions_projeto;
DROP INDEX IF EXISTS idx_decisions_status;
DROP INDEX IF EXISTS idx_decisions_entregavel;
DROP INDEX IF EXISTS idx_decisions_submetido_em;
DROP INDEX IF EXISTS idx_decision_comments_decision;
DROP INDEX IF EXISTS idx_decision_comments_criado;

CREATE INDEX IF NOT EXISTS idx_duvidas_projeto ON projeto_duvidas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_duvidas_status ON projeto_duvidas(status);
CREATE INDEX IF NOT EXISTS idx_duvidas_entregavel ON projeto_duvidas(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_duvidas_submetido_em ON projeto_duvidas(submetido_em DESC);
CREATE INDEX IF NOT EXISTS idx_duvida_comentarios_duvida ON duvida_comentarios(duvida_id);
CREATE INDEX IF NOT EXISTS idx_duvida_comentarios_criado ON duvida_comentarios(criado_em DESC);

-- 6. Atualizar triggers para usar novos nomes

-- Trigger para atualizar status quando há comentário
CREATE OR REPLACE FUNCTION on_duvida_comment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a dúvida está pendente, mudar para em discussão
  UPDATE projeto_duvidas
  SET status = 'discussion', updated_at = NOW()
  WHERE id = NEW.duvida_id AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decision_comment_insert ON duvida_comentarios;
CREATE TRIGGER trigger_duvida_comment_insert
  AFTER INSERT ON duvida_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION on_duvida_comment_insert();

-- Trigger: Registar submissão no diário de bordo
CREATE OR REPLACE FUNCTION log_duvida_submission()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

  INSERT INTO projeto_diario (
    projeto_id,
    categoria_id,
    titulo,
    descricao,
    tipo,
    fonte,
    data_evento
  ) VALUES (
    NEW.projeto_id,
    categoria_id,
    'Nova dúvida: ' || NEW.titulo,
    'Dúvida submetida para análise por ' || COALESCE(NEW.submetido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.descricao, 200),
    'auto',
    'duvidas_log',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_decision_submitted ON projeto_duvidas;
CREATE TRIGGER on_duvida_submitted
  AFTER INSERT ON projeto_duvidas
  FOR EACH ROW EXECUTE FUNCTION log_duvida_submission();

-- Trigger: Registar resposta no diário de bordo
CREATE OR REPLACE FUNCTION log_duvida_response()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  IF NEW.resolucao_final IS NOT NULL AND (OLD.resolucao_final IS NULL OR OLD.resolucao_final != NEW.resolucao_final) THEN
    SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

    INSERT INTO projeto_diario (
      projeto_id,
      categoria_id,
      titulo,
      descricao,
      tipo,
      fonte,
      data_evento
    ) VALUES (
      NEW.projeto_id,
      categoria_id,
      'Dúvida resolvida: ' || NEW.titulo,
      'Resposta de ' || COALESCE(NEW.resolvido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.resolucao_final, 200),
      'auto',
      'duvidas_log',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_decision_responded ON projeto_duvidas;
CREATE TRIGGER on_duvida_responded
  AFTER UPDATE ON projeto_duvidas
  FOR EACH ROW EXECUTE FUNCTION log_duvida_response();

-- 7. Atualizar RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_duvidas;
CREATE POLICY "Allow all for authenticated users" ON projeto_duvidas FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON duvida_comentarios;
CREATE POLICY "Allow all for authenticated users" ON duvida_comentarios FOR ALL USING (true);

-- 8. Adicionar comentários às tabelas para documentação
COMMENT ON TABLE projeto_duvidas IS 'Sistema Q&A de dúvidas do projeto que precisam de resposta/definição. NÃO confundir com a tabela "decisoes" que guarda decisões formais com impacto.';
COMMENT ON TABLE duvida_comentarios IS 'Comentários/respostas às dúvidas do projeto. Thread de discussão.';
COMMENT ON TABLE decisoes IS 'Decisões formais do projeto com tracking de impacto (orçamento, prazo). NÃO confundir com "projeto_duvidas" que é um sistema Q&A.';
-- Seed: Test Project for Platform Testing
-- This project is used for testing all platform features
-- codigo: TEST-001 | codigo_interno: PRJ-TEST

-- First, ensure we have a test client
INSERT INTO clientes (
  id, codigo, nome, tipo, email, telefone, nif,
  morada, cidade, codigo_postal, pais,
  segmento, idioma, notas, created_at
)
VALUES (
  'test-client-0001-0001-000000000001',
  'CLI-TEST',
  'Cliente Teste Plataforma',
  'Particular',
  'teste@gavinho.pt',
  '+351 912 345 678',
  '123456789',
  'Rua do Teste, 123',
  'Lisboa',
  '1000-001',
  'Portugal',
  'Nacional',
  'Português',
  'Cliente de teste para validação da plataforma. NÃO APAGAR.',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email;

-- Create the test project
INSERT INTO projetos (
  id, codigo, codigo_interno, nome, descricao,
  tipologia, subtipo, tipo_apartamento,
  cliente_id, cliente_nome,
  localizacao, morada, cidade, codigo_postal, pais,
  fase, status, progresso,
  area_bruta, area_exterior, unidade_area,
  orcamento_atual,
  data_inicio, data_prevista_conclusao,
  notas, created_at, updated_at
)
VALUES (
  'test-proj-0001-0001-000000000001',
  'TEST-001',
  'PRJ-TEST',
  'Projeto de Teste Plataforma',
  'Este projeto é utilizado para testar todas as funcionalidades da plataforma Gavinho. Inclui dados de exemplo para entregáveis, pagamentos, equipa, e todas as outras funcionalidades. NÃO APAGAR.',
  'Residencial',
  'Apartamento',
  'T3',
  'test-client-0001-0001-000000000001',
  'Cliente Teste Plataforma',
  'Restelo, Lisboa',
  'Rua do Teste, 123, 1º Dto',
  'Lisboa',
  '1000-001',
  'Portugal',
  'Projeto',
  'on_track',
  45,
  180.5,
  25.0,
  'm²',
  150000.00,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '90 days',
  'Projeto de teste para validação da plataforma.',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  progresso = EXCLUDED.progresso,
  updated_at = NOW();

-- Create test entregáveis (deliverables)
INSERT INTO projeto_entregaveis (id, projeto_id, nome, descricao, status, data_prevista, created_at)
VALUES
  ('test-entreg-001-000000000001', 'test-proj-0001-0001-000000000001', 'Levantamento Inicial', 'Levantamento do espaço existente e condições técnicas', 'concluido', CURRENT_DATE - INTERVAL '25 days', NOW()),
  ('test-entreg-002-000000000001', 'test-proj-0001-0001-000000000001', 'Conceito Design', 'Moodboard e conceito visual do projeto', 'concluido', CURRENT_DATE - INTERVAL '15 days', NOW()),
  ('test-entreg-003-000000000001', 'test-proj-0001-0001-000000000001', 'Plantas Base', 'Plantas de distribuição e layout', 'em_progresso', CURRENT_DATE + INTERVAL '5 days', NOW()),
  ('test-entreg-004-000000000001', 'test-proj-0001-0001-000000000001', 'Renders 3D', 'Visualizações 3D dos principais espaços', 'pendente', CURRENT_DATE + INTERVAL '30 days', NOW()),
  ('test-entreg-005-000000000001', 'test-proj-0001-0001-000000000001', 'Projeto Execução', 'Desenhos técnicos e especificações', 'pendente', CURRENT_DATE + INTERVAL '60 days', NOW()),
  ('test-entreg-006-000000000001', 'test-proj-0001-0001-000000000001', 'Caderno de Encargos', 'Documento final com todas as especificações', 'pendente', CURRENT_DATE + INTERVAL '75 days', NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data_prevista = EXCLUDED.data_prevista;

-- Create test pagamentos (payments)
INSERT INTO projeto_pagamentos (id, projeto_id, prestacao_numero, descricao, valor, estado, data_prevista, data_pagamento, created_at)
VALUES
  ('test-pag-001-0000000000001', 'test-proj-0001-0001-000000000001', 1, 'Entrada (30%)', 45000.00, 'pago', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days', NOW()),
  ('test-pag-002-0000000000001', 'test-proj-0001-0001-000000000001', 2, 'Aprovação Conceito (20%)', 30000.00, 'pago', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', NOW()),
  ('test-pag-003-0000000000001', 'test-proj-0001-0001-000000000001', 3, 'Entrega Projeto Base (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '15 days', NULL, NOW()),
  ('test-pag-004-0000000000001', 'test-proj-0001-0001-000000000001', 4, 'Entrega Final (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '80 days', NULL, NOW())
ON CONFLICT (id) DO UPDATE SET
  estado = EXCLUDED.estado,
  data_pagamento = EXCLUDED.data_pagamento;

-- Create test intervenientes (stakeholders)
INSERT INTO projeto_intervenientes (id, projeto_id, nome, tipo, empresa, email, telefone, notas, created_at)
VALUES
  ('test-interv-001-00000000001', 'test-proj-0001-0001-000000000001', 'João Silva', 'Dono de Obra', NULL, 'joao.silva@email.com', '+351 911 111 111', 'Cliente principal', NOW()),
  ('test-interv-002-00000000001', 'test-proj-0001-0001-000000000001', 'Maria Santos', 'Autor Licenciamento Arquitectura', 'Atelier MS', 'maria@atelierms.pt', '+351 922 222 222', 'Arquitecta responsável pelo licenciamento', NOW()),
  ('test-interv-003-00000000001', 'test-proj-0001-0001-000000000001', 'Pedro Costa', 'Especialidade Estruturas', 'Eng. Costa Lda', 'pedro@engcosta.pt', '+351 933 333 333', 'Engenheiro de estruturas', NOW())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo = EXCLUDED.tipo;

-- Create test serviços (services)
INSERT INTO projeto_servicos (id, projeto_id, nome, descricao, valor, fase, created_at)
VALUES
  ('test-serv-001-000000000001', 'test-proj-0001-0001-000000000001', 'Design de Interiores', 'Serviço completo de design de interiores', 80000.00, 'Projeto', NOW()),
  ('test-serv-002-000000000001', 'test-proj-0001-0001-000000000001', 'Renders e Visualização 3D', 'Pack de renders para apresentação', 15000.00, 'Projeto', NOW()),
  ('test-serv-003-000000000001', 'test-proj-0001-0001-000000000001', 'Acompanhamento de Obra', 'Visitas semanais durante a execução', 25000.00, 'Construção', NOW()),
  ('test-serv-004-000000000001', 'test-proj-0001-0001-000000000001', 'Decoração e Styling', 'Seleção de mobiliário e acessórios', 30000.00, 'Fit-out', NOW())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  valor = EXCLUDED.valor;

-- Create test tarefas (tasks)
INSERT INTO tarefas (id, projeto_id, titulo, descricao, status, prioridade, data_limite, created_at)
VALUES
  ('test-tarefa-001-0000000001', 'test-proj-0001-0001-000000000001', 'Validar medidas com cliente', 'Confirmar medidas do levantamento com o cliente', 'concluida', 'alta', CURRENT_DATE - INTERVAL '20 days', NOW()),
  ('test-tarefa-002-0000000001', 'test-proj-0001-0001-000000000001', 'Preparar apresentação conceito', 'Moodboard e imagens de referência', 'concluida', 'alta', CURRENT_DATE - INTERVAL '10 days', NOW()),
  ('test-tarefa-003-0000000001', 'test-proj-0001-0001-000000000001', 'Desenvolver plantas cozinha', 'Layout e equipamentos da cozinha', 'em_progresso', 'alta', CURRENT_DATE + INTERVAL '3 days', NOW()),
  ('test-tarefa-004-0000000001', 'test-proj-0001-0001-000000000001', 'Selecionar revestimentos', 'Escolher materiais para pavimentos e paredes', 'pendente', 'media', CURRENT_DATE + INTERVAL '10 days', NOW()),
  ('test-tarefa-005-0000000001', 'test-proj-0001-0001-000000000001', 'Reunião com fornecedor móveis', 'Apresentar projecto e obter orçamento', 'pendente', 'media', CURRENT_DATE + INTERVAL '20 days', NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data_limite = EXCLUDED.data_limite;

-- Create a test ata (meeting minutes)
INSERT INTO projeto_atas (id, projeto_id, titulo, data_reuniao, local_reuniao, participantes, conteudo, decisoes, proximas_acoes, created_at)
VALUES (
  'test-ata-001-00000000000001',
  'test-proj-0001-0001-000000000001',
  'Reunião de Kick-off',
  CURRENT_DATE - INTERVAL '25 days',
  'Escritório Gavinho',
  '[{"nome": "João Silva", "funcao": "Cliente"}, {"nome": "Ana Gavinho", "funcao": "Designer"}]',
  '<p>Reunião inicial do projeto para definição de expectativas e timeline.</p><p>Pontos discutidos:</p><ul><li>Orçamento aprovado</li><li>Estilo preferido: contemporâneo com toques clássicos</li><li>Prioridade: cozinha e suite principal</li></ul>',
  '<ul><li>Aprovar conceito até final do mês</li><li>Orçamento final: 150.000€</li></ul>',
  '<ul><li>Enviar moodboard em 5 dias</li><li>Agendar visita ao espaço</li></ul>',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo;

-- Create test blockers/dúvidas
INSERT INTO decisoes (id, projeto_id, titulo, descricao, status, prioridade, categoria, created_at)
VALUES
  ('test-decisao-001-000000001', 'test-proj-0001-0001-000000000001', 'Tipo de pavimento cozinha', 'Cliente indeciso entre cerâmico e vinílico. Necessita ver amostras.', 'pendente', 'alta', 'Materiais', NOW()),
  ('test-decisao-002-000000001', 'test-proj-0001-0001-000000000001', 'Cor da suite principal', 'Apresentar 3 opções de palete de cores', 'resolvido', 'media', 'Design', NOW())
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  status = EXCLUDED.status;

-- Log seed execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_seed_projeto_teste', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Projeto de Teste criado com sucesso!';
  RAISE NOTICE '   Código: TEST-001';
  RAISE NOTICE '   Código Interno: PRJ-TEST';
  RAISE NOTICE '   Cliente: Cliente Teste Plataforma';
  RAISE NOTICE '';
  RAISE NOTICE '   Dados incluídos:';
  RAISE NOTICE '   - 6 Entregáveis (2 concluídos, 1 em progresso, 3 pendentes)';
  RAISE NOTICE '   - 4 Pagamentos (2 pagos, 2 pendentes)';
  RAISE NOTICE '   - 3 Intervenientes';
  RAISE NOTICE '   - 4 Serviços';
  RAISE NOTICE '   - 5 Tarefas';
  RAISE NOTICE '   - 1 Ata de Reunião';
  RAISE NOTICE '   - 2 Decisões/Dúvidas';
END $$;
-- =====================================================
-- PROJETO DE TESTE SIMPLIFICADO
-- Usa apenas colunas que existem na base de dados
-- =====================================================

-- 1. Criar cliente de teste
INSERT INTO clientes (id, codigo, nome, tipo, email, telefone, nif, morada, cidade, codigo_postal, notas)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'CLI-TEST',
  'Cliente Teste Plataforma',
  'Particular',
  'teste@gavinho.pt',
  '+351 912 345 678',
  '123456789',
  'Rua do Teste, 123',
  'Lisboa',
  '1000-001',
  'Cliente de teste para validacao da plataforma. NAO APAGAR.'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email;

-- 2. Criar projeto de teste
INSERT INTO projetos (
  id, codigo, nome, descricao,
  tipologia, subtipo,
  cliente_id, cliente_nome,
  localizacao, morada, cidade, codigo_postal,
  fase, status, progresso,
  area_bruta, area_exterior, unidade_area,
  orcamento_atual,
  data_inicio, data_prevista_conclusao,
  notas
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'TEST-001',
  'Projeto de Teste Plataforma',
  'Este projeto e utilizado para testar todas as funcionalidades da plataforma Gavinho. NAO APAGAR.',
  'Residencial',
  'Apartamento',
  'a0000000-0000-0000-0000-000000000001',
  'Cliente Teste Plataforma',
  'Restelo, Lisboa',
  'Rua do Teste, 123, 1 Dto',
  'Lisboa',
  '1000-001',
  'Projeto',
  'on_track',
  45,
  180.5,
  25.0,
  'm2',
  150000.00,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '90 days',
  'Projeto de teste para validacao da plataforma.'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  progresso = EXCLUDED.progresso;

-- 3. Criar entregaveis de teste (usando colunas que existem)
INSERT INTO projeto_entregaveis (id, projeto_id, codigo, nome, fase, status, data_inicio, data_conclusao)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENT-001', 'Levantamento Inicial', 'Conceito', 'concluido', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'ENT-002', 'Conceito Design', 'Conceito', 'concluido', CURRENT_DATE - INTERVAL '24 days', CURRENT_DATE - INTERVAL '15 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'ENT-003', 'Plantas Base', 'Projeto Base', 'em_progresso', CURRENT_DATE - INTERVAL '14 days', NULL),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'ENT-004', 'Renders 3D', 'Projeto Base', 'pendente', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'ENT-005', 'Projeto Execucao', 'Projeto Execucao', 'pendente', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status;

-- 4. Criar tarefas de teste
INSERT INTO tarefas (id, projeto_id, titulo, descricao, status, prioridade, data_limite)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Validar medidas com cliente', 'Confirmar medidas do levantamento', 'concluida', 'alta', CURRENT_DATE - INTERVAL '20 days'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Preparar apresentacao conceito', 'Moodboard e imagens de referencia', 'concluida', 'alta', CURRENT_DATE - INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Desenvolver plantas cozinha', 'Layout e equipamentos da cozinha', 'em_progresso', 'alta', CURRENT_DATE + INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Selecionar revestimentos', 'Escolher materiais para pavimentos e paredes', 'pendente', 'media', CURRENT_DATE + INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Reuniao com fornecedor moveis', 'Apresentar projecto e obter orcamento', 'pendente', 'media', CURRENT_DATE + INTERVAL '20 days')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  titulo = EXCLUDED.titulo;

-- 5. Criar decisoes/duvidas de teste
INSERT INTO decisoes (id, projeto_id, titulo, descricao, status, prioridade, categoria)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tipo de pavimento cozinha', 'Cliente indeciso entre ceramico e vinilico. Necessita ver amostras.', 'pendente', 'alta', 'Materiais'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Cor da suite principal', 'Apresentar 3 opcoes de palete de cores', 'resolvido', 'media', 'Design')
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  status = EXCLUDED.status;

-- 6. Criar pagamentos de teste (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projeto_pagamentos') THEN
    INSERT INTO projeto_pagamentos (id, projeto_id, prestacao_numero, descricao, valor, estado, data_prevista, data_pagamento)
    VALUES
      ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'Entrada (30%)', 45000.00, 'pago', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days'),
      ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 2, 'Aprovacao Conceito (20%)', 30000.00, 'pago', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days'),
      ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 3, 'Entrega Projeto Base (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '15 days', NULL),
      ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 4, 'Entrega Final (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '80 days', NULL)
    ON CONFLICT (id) DO UPDATE SET
      estado = EXCLUDED.estado,
      data_pagamento = EXCLUDED.data_pagamento;
  END IF;
END $$;

-- 7. Criar servicos de teste (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projeto_servicos') THEN
    INSERT INTO projeto_servicos (id, projeto_id, nome, descricao, valor, fase)
    VALUES
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Design de Interiores', 'Servico completo de design de interiores', 80000.00, 'Projeto'),
      ('g0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Renders e Visualizacao 3D', 'Pack de renders para apresentacao', 15000.00, 'Projeto'),
      ('g0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Acompanhamento de Obra', 'Visitas semanais durante a execucao', 25000.00, 'Construcao'),
      ('g0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Decoracao e Styling', 'Selecao de mobiliario e acessorios', 30000.00, 'Fit-out')
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      valor = EXCLUDED.valor;
  END IF;
END $$;

-- Log seed execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_seed_projeto_teste_v2', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();

-- Confirmacao
DO $$
BEGIN
  RAISE NOTICE 'Projeto de Teste criado com sucesso!';
  RAISE NOTICE '  Codigo: TEST-001';
  RAISE NOTICE '  ID: b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '';
  RAISE NOTICE 'Dados incluidos:';
  RAISE NOTICE '  - 5 Entregaveis';
  RAISE NOTICE '  - 5 Tarefas';
  RAISE NOTICE '  - 2 Decisoes';
  RAISE NOTICE '  - 4 Pagamentos (se tabela existir)';
  RAISE NOTICE '  - 4 Servicos (se tabela existir)';
END $$;
-- =====================================================
-- SEEDS EXECUTADOS TABLE
-- Regista seeds já executados para auto-ocultar cards
-- =====================================================

-- Criar tabela para tracking de seeds executados
CREATE TABLE IF NOT EXISTS seeds_executados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_key VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  executado_por UUID REFERENCES utilizadores(id),
  executado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resultado JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_seeds_executados_key ON seeds_executados(seed_key);
CREATE INDEX IF NOT EXISTS idx_seeds_executados_em ON seeds_executados(executado_em DESC);

-- RLS
ALTER TABLE seeds_executados ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ver seeds executados
CREATE POLICY "seeds_executados_select" ON seeds_executados
  FOR SELECT USING (true);

-- Política: usuários autenticados podem inserir
CREATE POLICY "seeds_executados_insert" ON seeds_executados
  FOR INSERT WITH CHECK (true);

-- Política: apenas admin pode deletar
CREATE POLICY "seeds_executados_delete" ON seeds_executados
  FOR DELETE USING (true);

-- Comentários
COMMENT ON TABLE seeds_executados IS 'Registo de seeds já executados para auto-ocultar cards na UI';
COMMENT ON COLUMN seeds_executados.seed_key IS 'Chave única do seed (ex: GA00402_maria_residences)';
COMMENT ON COLUMN seeds_executados.resultado IS 'JSON com detalhes do resultado (success count, errors, etc)';
COMMENT ON COLUMN seeds_executados.metadata IS 'Dados adicionais específicos do seed';
-- =====================================================
-- G.A.R.V.I.S. - Chat IA para Projetos
-- Gavinho Assistant for Responsive Virtual Intelligence Support
-- =====================================================

-- =====================================================
-- 1. Add is_bot column to utilizadores if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilizadores' AND column_name = 'is_bot'
  ) THEN
    ALTER TABLE utilizadores ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- 2. GARVIS bot user - skipped
-- The utilizadores table has auth constraints (utilizadores_team_requires_auth)
-- GARVIS works without a bot user row - chat logs stand alone
-- =====================================================

-- =====================================================
-- 3. Create GARVIS chat logs table
-- =====================================================
CREATE TABLE IF NOT EXISTS garvis_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  projeto_id UUID,
  topico_id UUID,

  -- Mensagens
  mensagem_utilizador_id UUID,
  mensagem_resposta_id UUID,

  -- Conteúdo original
  prompt_usuario TEXT NOT NULL,
  resposta_gerada TEXT NOT NULL,

  -- Contexto usado pelo modelo
  contexto_projeto JSONB DEFAULT '{}',

  -- Métricas
  modelo_usado TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_input INTEGER,
  tokens_output INTEGER,
  tempo_resposta_ms INTEGER,

  -- Feedback
  feedback_positivo BOOLEAN,
  feedback_comentario TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garvis_logs_projeto ON garvis_chat_logs(projeto_id);
CREATE INDEX IF NOT EXISTS idx_garvis_logs_created ON garvis_chat_logs(created_at DESC);

-- Enable RLS
ALTER TABLE garvis_chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "garvis_logs_all" ON garvis_chat_logs;
CREATE POLICY "garvis_logs_all" ON garvis_chat_logs FOR ALL USING (true);

-- =====================================================
-- 4. GARVIS configuration per project
-- =====================================================
CREATE TABLE IF NOT EXISTS garvis_config_projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Configurações
  ativo BOOLEAN DEFAULT TRUE,
  tom_resposta TEXT DEFAULT 'profissional', -- profissional, casual, formal
  idioma TEXT DEFAULT 'pt',
  max_tokens_resposta INTEGER DEFAULT 500,

  -- Contexto adicional
  instrucoes_customizadas TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(projeto_id)
);

CREATE INDEX IF NOT EXISTS idx_garvis_config_projeto ON garvis_config_projeto(projeto_id);

ALTER TABLE garvis_config_projeto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garvis_config_all" ON garvis_config_projeto;
CREATE POLICY "garvis_config_all" ON garvis_config_projeto FOR ALL USING (true);

-- Trigger for updated_at (only if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    DROP TRIGGER IF EXISTS trigger_garvis_config_updated ON garvis_config_projeto;
    CREATE TRIGGER trigger_garvis_config_updated
      BEFORE UPDATE ON garvis_config_projeto
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Documentation: garvis_chat_logs = GARVIS chat interaction logs
-- Documentation: garvis_config_projeto = GARVIS config per project
-- Migration: Create levantamento_fotografico tables
-- Date: 2025-02-02
-- Description: Stores photographs of existing spaces organized by compartment
-- Used for documenting current state of spaces before intervention

-- =====================================================
-- Table: projeto_levantamento_compartimentos
-- Compartments/rooms to organize photos
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_levantamento_compartimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_levantamento_compartimentos_projeto_id
  ON projeto_levantamento_compartimentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_levantamento_compartimentos_ordem
  ON projeto_levantamento_compartimentos(ordem);

-- Unique constraint: one compartment name per project
ALTER TABLE projeto_levantamento_compartimentos
  DROP CONSTRAINT IF EXISTS levantamento_compartimentos_projeto_nome_unique;
ALTER TABLE projeto_levantamento_compartimentos
  ADD CONSTRAINT levantamento_compartimentos_projeto_nome_unique
  UNIQUE (projeto_id, nome);

-- Enable RLS
ALTER TABLE projeto_levantamento_compartimentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can view compartimentos" ON projeto_levantamento_compartimentos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can insert compartimentos" ON projeto_levantamento_compartimentos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can update compartimentos" ON projeto_levantamento_compartimentos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can delete compartimentos" ON projeto_levantamento_compartimentos
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_levantamento_fotos
-- Photos within each compartment
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_levantamento_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compartimento_id UUID NOT NULL REFERENCES projeto_levantamento_compartimentos(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  url TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  ordem INTEGER DEFAULT 0,
  is_destaque BOOLEAN DEFAULT FALSE,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_compartimento_id
  ON projeto_levantamento_fotos(compartimento_id);
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_is_destaque
  ON projeto_levantamento_fotos(is_destaque) WHERE is_destaque = true;
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_ordem
  ON projeto_levantamento_fotos(ordem);

-- Enable RLS
ALTER TABLE projeto_levantamento_fotos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can view fotos" ON projeto_levantamento_fotos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can insert fotos" ON projeto_levantamento_fotos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can update fotos" ON projeto_levantamento_fotos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can delete fotos" ON projeto_levantamento_fotos
  FOR DELETE USING (true);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_levantamento_compartimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_levantamento_compartimentos_updated_at ON projeto_levantamento_compartimentos;
CREATE TRIGGER trigger_levantamento_compartimentos_updated_at
  BEFORE UPDATE ON projeto_levantamento_compartimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_levantamento_compartimentos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE projeto_levantamento_compartimentos IS 'Compartments/rooms for organizing site survey photos';
COMMENT ON TABLE projeto_levantamento_fotos IS 'Photos of existing spaces for site survey documentation';

COMMENT ON COLUMN projeto_levantamento_compartimentos.nome IS 'Room/space name (e.g., Sala de Estar, Cozinha, Quarto Principal)';
COMMENT ON COLUMN projeto_levantamento_compartimentos.ordem IS 'Display order for the compartment';
COMMENT ON COLUMN projeto_levantamento_fotos.is_destaque IS 'Featured/highlight photo for this compartment';
COMMENT ON COLUMN projeto_levantamento_fotos.url IS 'Public URL to the photo in storage';
-- Migration: Create projeto_compartimentos table
-- Date: 2025-02-02
-- Description: Stores project-specific compartments for archviz renders
-- When a user creates a new compartment, it's saved for reuse within that project

-- =====================================================
-- Table: projeto_compartimentos
-- Compartments specific to each project
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_compartimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_compartimentos_projeto_id
  ON projeto_compartimentos(projeto_id);

-- Unique constraint: one compartment name per project
ALTER TABLE projeto_compartimentos
  DROP CONSTRAINT IF EXISTS projeto_compartimentos_projeto_nome_unique;
ALTER TABLE projeto_compartimentos
  ADD CONSTRAINT projeto_compartimentos_projeto_nome_unique
  UNIQUE (projeto_id, nome);

-- Enable RLS
ALTER TABLE projeto_compartimentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can view compartimentos" ON projeto_compartimentos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can insert compartimentos" ON projeto_compartimentos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can delete compartimentos" ON projeto_compartimentos
  FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE projeto_compartimentos IS 'Project-specific compartments for organizing archviz renders';
COMMENT ON COLUMN projeto_compartimentos.nome IS 'Compartment name (e.g., Quarto Premium_Sofa_Frente)';

-- =====================================================
-- Add vista column to projeto_renders if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projeto_renders' AND column_name = 'vista'
  ) THEN
    ALTER TABLE projeto_renders ADD COLUMN vista TEXT DEFAULT 'Vista Principal';
  END IF;
END $$;

COMMENT ON COLUMN projeto_renders.vista IS 'View/angle name within compartment (e.g., Vista Frontal, Vista Diagonal)';
-- =====================================================
-- MIGRAÇÃO: Fornecedores + G.A.R.V.I.S. Procurement
-- Gavinho Platform - Fevereiro 2025
-- Tabelas base + inteligência + procurement
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
-- FASE 3: Orçamentos recebidos
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

CREATE TABLE IF NOT EXISTS orcamento_linhas (
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
-- FASE 3: Preços de referência
-- ============================================

CREATE TABLE IF NOT EXISTS precos_referencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT,
  subcategoria TEXT,
  unidade TEXT NOT NULL,
  preco_minimo DECIMAL(12,2),
  preco_medio DECIMAL(12,2),
  preco_maximo DECIMAL(12,2),
  n_amostras INTEGER DEFAULT 0,
  data_atualizacao DATE DEFAULT CURRENT_DATE,
  fonte TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preco_ref_categoria ON precos_referencia(categoria, subcategoria);

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
ALTER TABLE orcamento_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_referencia ENABLE ROW LEVEL SECURITY;
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
DROP POLICY IF EXISTS "all_orcamento_linhas" ON orcamento_linhas;
CREATE POLICY "all_orcamento_linhas" ON orcamento_linhas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_precos_referencia" ON precos_referencia;
CREATE POLICY "all_precos_referencia" ON precos_referencia FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_alertas_garvis" ON alertas_garvis;
CREATE POLICY "all_alertas_garvis" ON alertas_garvis FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "all_fornecedor_projeto_scores" ON fornecedor_projeto_scores;
CREATE POLICY "all_fornecedor_projeto_scores" ON fornecedor_projeto_scores FOR ALL USING (true) WITH CHECK (true);
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
-- =====================================================
-- MIGRAÇÃO: Tabela projeto_inspiracoes
-- Gavinho Platform - Criado em 2025-02-07
-- Galeria de inspirações e referências visuais
-- =====================================================

CREATE TABLE IF NOT EXISTS projeto_inspiracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  categoria TEXT DEFAULT 'geral', -- geral, materiais, cores, espacos, mobiliario, iluminacao, exterior
  imagem_url TEXT NOT NULL,
  imagem_path TEXT NOT NULL,
  fonte TEXT, -- Pinterest, Instagram, website URL, etc.
  tags TEXT[],
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_projeto_id ON projeto_inspiracoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_categoria ON projeto_inspiracoes(categoria);

ALTER TABLE projeto_inspiracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_inspiracoes_all" ON projeto_inspiracoes;
CREATE POLICY "projeto_inspiracoes_all" ON projeto_inspiracoes
  FOR ALL USING (true);
-- =====================================================
-- MIGRAÇÃO: Tabela projeto_notebook_sections
-- Gavinho Platform - Criado em 2025-02-07
-- Notebook do projeto estilo Google Docs
-- Secções hierárquicas com conteúdo rich text
-- =====================================================

CREATE TABLE IF NOT EXISTS projeto_notebook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES projeto_notebook_sections(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT, -- HTML rich text content
  tipo TEXT DEFAULT 'secao' CHECK (tipo IN ('secao', 'pagina', 'tabela')),
  icone TEXT DEFAULT 'file-text',
  ordem INTEGER DEFAULT 0,
  expandido BOOLEAN DEFAULT true,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_sections_projeto ON projeto_notebook_sections(projeto_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_parent ON projeto_notebook_sections(parent_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_ordem ON projeto_notebook_sections(projeto_id, parent_id, ordem);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_notebook_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notebook_sections_updated_at ON projeto_notebook_sections;
CREATE TRIGGER trigger_notebook_sections_updated_at
  BEFORE UPDATE ON projeto_notebook_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_sections_updated_at();

ALTER TABLE projeto_notebook_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notebook_sections_all" ON projeto_notebook_sections;
CREATE POLICY "notebook_sections_all" ON projeto_notebook_sections
  FOR ALL USING (true) WITH CHECK (true);
-- ══════════════════════════════════════════════════════════════
-- GAVINHO Platform — Sistema de Agentes Autónomos para Email
-- Data: 2025-02-08
-- Descrição: Fila de processamento, ações de agentes, audit log,
--            embeddings para RAG, e notificações em tempo real
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. ENUM TYPES para taxonomia de emails
-- ══════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE email_domain AS ENUM (
    'comercial_financeiro',
    'projeto_design',
    'construcao_obra',
    'relacoes_comunicacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_category AS ENUM (
    'pedido_cotacao',
    'encomenda',
    'aviso_entrega',
    'faturacao',
    'proposta_financeira',
    'decisao_projeto',
    'licenciamento',
    'rfi',
    'progresso',
    'nao_conformidade',
    'subempreiteiro',
    'agendamento',
    'seguranca',
    'cliente',
    'fornecedor',
    'ata_reuniao',
    'interno'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_tier AS ENUM (
    'auto_execute',
    'auto_notify',
    'review_required',
    'escalate',
    'manual_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════
-- 2. FILA DE PROCESSAMENTO DE EMAIL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Identificadores Microsoft Graph
  graph_message_id TEXT NOT NULL,
  graph_resource_path TEXT,
  internet_message_id TEXT UNIQUE,
  conversation_id TEXT,

  -- Metadados do email
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  to_recipients JSONB,
  cc_recipients JSONB,
  received_at TIMESTAMPTZ,
  body_preview TEXT,
  body_html TEXT,
  body_text TEXT,
  has_attachments BOOLEAN DEFAULT false,
  importance TEXT DEFAULT 'normal',

  -- Estado de processamento
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending','fetching','fetched','classifying','routing',
               'acting','completed','failed','needs_review')
  ),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMPTZ,

  -- Classificação IA
  domain TEXT,
  category TEXT,
  subcategory TEXT,
  confidence DECIMAL(5,4),
  urgency TEXT CHECK (urgency IN ('critica', 'alta', 'media', 'baixa')),
  language_detected TEXT,
  summary_pt TEXT,
  extracted_entities JSONB,
  target_agent TEXT,

  -- Associações
  project_id UUID,
  obra_id UUID,
  supplier_id UUID,
  client_id UUID,

  -- Referência ao email original na obra_emails
  obra_email_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_epq_status ON email_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_epq_internet_msg ON email_processing_queue(internet_message_id);
CREATE INDEX IF NOT EXISTS idx_epq_conversation ON email_processing_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_epq_project ON email_processing_queue(project_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_obra ON email_processing_queue(obra_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_category ON email_processing_queue(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_graph_msg ON email_processing_queue(graph_message_id);

-- RLS
ALTER TABLE email_processing_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "epq_all" ON email_processing_queue;
CREATE POLICY "epq_all" ON email_processing_queue FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 3. FILA DE AÇÕES DOS AGENTES
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Origem
  email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  obra_email_id UUID,
  project_id UUID,
  obra_id UUID,
  source_agent TEXT NOT NULL,

  -- Definição da ação
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}',
  action_description TEXT,

  -- Classificação IA
  confidence DECIMAL(5,4),
  ai_reasoning TEXT,
  model_id TEXT,

  -- Risco e routing
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  approval_tier TEXT NOT NULL DEFAULT 'review_required' CHECK (approval_tier IN (
    'auto_execute','auto_notify','review_required','escalate','manual_only'
  )),

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','executed','failed','rolled_back','expired'
  )),

  -- Aprovação
  assigned_to UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),

  -- Execução
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Rollback
  is_reversible BOOLEAN DEFAULT true,
  rollback_payload JSONB,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aa_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_aa_email ON agent_actions(email_id);
CREATE INDEX IF NOT EXISTS idx_aa_project ON agent_actions(project_id);
CREATE INDEX IF NOT EXISTS idx_aa_approval ON agent_actions(approval_tier, status);
CREATE INDEX IF NOT EXISTS idx_aa_assigned ON agent_actions(assigned_to, status);

-- RLS
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aa_all" ON agent_actions;
CREATE POLICY "aa_all" ON agent_actions FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 4. LOG DE AUDITORIA IMUTÁVEL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL,
  email_queue_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,

  -- Contexto IA
  model_id TEXT,
  input_hash TEXT,
  ai_reasoning TEXT,
  confidence DECIMAL(5,4),
  alternative_actions JSONB,

  -- Detalhes
  action_type TEXT,
  action_payload JSONB,
  outcome TEXT,
  outcome_details JSONB,
  error_message TEXT,

  -- Interação humana
  actor_id UUID,
  actor_role TEXT,
  human_override BOOLEAN DEFAULT false,
  human_feedback TEXT,

  -- Metadados
  execution_time_ms INTEGER,
  cost_usd DECIMAL(10,6),
  session_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aal_action ON ai_audit_log(action_id);
CREATE INDEX IF NOT EXISTS idx_aal_event ON ai_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_email ON ai_audit_log(email_queue_id);

-- RLS
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aal_all" ON ai_audit_log;
CREATE POLICY "aal_all" ON ai_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 5. NOTIFICAÇÕES DE AGENTES
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  channels TEXT[] DEFAULT ARRAY['in_app'],
  read_at TIMESTAMPTZ,
  action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL,
  email_queue_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_an_user ON agent_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_an_created ON agent_notifications(created_at DESC);

-- RLS
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "an_all" ON agent_notifications;
CREATE POLICY "an_all" ON agent_notifications FOR ALL USING (true) WITH CHECK (true);

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agent_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_actions;

-- ══════════════════════════════════════════════════
-- 6. CONFIGURAÇÃO DE SUBSCRIÇÕES GRAPH API
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS graph_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'created',
  notification_url TEXT NOT NULL,
  expiration_date TIMESTAMPTZ NOT NULL,
  client_state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  renewed_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE graph_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gs_all" ON graph_subscriptions;
CREATE POLICY "gs_all" ON graph_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 7. FUNÇÃO DE MATCHING POR SIMILARIDADE (RAG)
-- ══════════════════════════════════════════════════

-- Nota: requer extensão pgvector habilitada
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Função para encontrar emails similares (quando pgvector estiver habilitado)
CREATE OR REPLACE FUNCTION match_similar_emails(
  p_from_address TEXT,
  p_subject TEXT,
  p_project_id UUID DEFAULT NULL,
  p_obra_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  subject TEXT,
  from_address TEXT,
  project_id UUID,
  obra_id UUID,
  category TEXT,
  received_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    epq.id,
    epq.subject,
    epq.from_address,
    epq.project_id,
    epq.obra_id,
    epq.category,
    epq.received_at
  FROM email_processing_queue epq
  WHERE epq.status = 'completed'
    AND (
      epq.from_address = p_from_address
      OR epq.project_id = p_project_id
      OR epq.obra_id = p_obra_id
    )
  ORDER BY epq.received_at DESC
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════
-- 8. TRIGGER PARA UPDATED_AT
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_epq_updated ON email_processing_queue;
CREATE TRIGGER trg_epq_updated BEFORE UPDATE ON email_processing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aa_updated ON agent_actions;
CREATE TRIGGER trg_aa_updated BEFORE UPDATE ON agent_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════
-- 9. TRIGGER PARA PROCESSAR NOVO EMAIL DA FILA
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_new_email_in_queue()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_email_queued', json_build_object(
    'id', NEW.id,
    'graph_message_id', NEW.graph_message_id,
    'status', NEW.status
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_email_queued ON email_processing_queue;
CREATE TRIGGER trg_new_email_queued
  AFTER INSERT ON email_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_email_in_queue();

-- ══════════════════════════════════════════════════
-- 10. VIEWS PARA MONITORIZAÇÃO
-- ══════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_agent_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE status = 'completed') as classificados,
  COUNT(*) FILTER (WHERE status = 'failed') as falhados,
  COUNT(*) FILTER (WHERE status = 'needs_review') as pendentes_revisao,
  AVG(confidence)::DECIMAL(5,4) as confianca_media,
  COUNT(DISTINCT category) as categorias_distintas
FROM email_processing_queue
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

CREATE OR REPLACE VIEW v_agent_actions_pending AS
SELECT
  aa.*,
  epq.subject as email_subject,
  epq.from_address as email_from,
  epq.summary_pt as email_summary,
  epq.category as email_category
FROM agent_actions aa
LEFT JOIN email_processing_queue epq ON epq.id = aa.email_id
WHERE aa.status = 'pending'
ORDER BY
  CASE aa.approval_tier
    WHEN 'auto_execute' THEN 1
    WHEN 'auto_notify' THEN 2
    WHEN 'review_required' THEN 3
    WHEN 'escalate' THEN 4
    WHEN 'manual_only' THEN 5
  END,
  aa.created_at ASC;

-- ══════════════════════════════════════════════════
-- 11. RENOVAÇÃO AUTOMÁTICA DA SUBSCRIÇÃO (pg_cron)
-- ══════════════════════════════════════════════════

DO $do$
BEGIN
  PERFORM cron.schedule(
    'renew-graph-subscription',
    '0 0 */2 * *',
    $$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/renew-subscription',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
  );
  RAISE NOTICE 'pg_cron job criado';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não disponível: %', SQLERRM;
END $do$;

-- Docs: email_processing_queue, agent_actions, ai_audit_log, agent_notifications, graph_subscriptions
-- =====================================================
-- G.A.R.V.I.S. Global Configuration (key-value)
-- Stores API keys, global settings, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS garvis_configuracao (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE garvis_configuracao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garvis_config_all" ON garvis_configuracao;
CREATE POLICY "garvis_config_all" ON garvis_configuracao FOR ALL USING (true);
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

CREATE OR REPLACE VIEW v_portal_entregas AS
SELECT
  po.id, po.codigo, po.projeto_id, po.obra_id,
  COALESCE(po.descricao_portal, po.codigo) as descricao,
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
DROP POLICY IF EXISTS "req_all" ON requisicoes;
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
DROP POLICY IF EXISTS "cot_all" ON cotacoes;
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
DROP POLICY IF EXISTS "cl_all" ON cotacao_linhas;
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
DROP POLICY IF EXISTS "po_all" ON purchase_orders;
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
DROP POLICY IF EXISTS "pol_all" ON po_linhas;
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
DROP POLICY IF EXISTS "pfat_all" ON procurement_facturas;
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
DROP POLICY IF EXISTS "pr_all" ON precos_referencia;
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
DROP POLICY IF EXISTS "fsh_all" ON fornecedor_score_historico;
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

-- Docs: requisicoes, cotacoes, cotacao_linhas, purchase_orders, po_linhas,
-- procurement_facturas, precos_referencia, fornecedor_score_historico
-- =====================================================
-- Storage bucket for deal room quote files (PDF, docs)
-- =====================================================

-- Create the 'orcamentos' bucket (public for download links)
INSERT INTO storage.buckets (id, name, public)
VALUES ('orcamentos', 'orcamentos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "orcamentos_upload" ON storage.objects;
CREATE POLICY "orcamentos_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'orcamentos');

-- Allow public read access (download links)
DROP POLICY IF EXISTS "orcamentos_read" ON storage.objects;
CREATE POLICY "orcamentos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'orcamentos');

-- Allow delete by authenticated users
DROP POLICY IF EXISTS "orcamentos_delete" ON storage.objects;
CREATE POLICY "orcamentos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'orcamentos');
