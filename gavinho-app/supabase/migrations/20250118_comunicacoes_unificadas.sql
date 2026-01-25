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
