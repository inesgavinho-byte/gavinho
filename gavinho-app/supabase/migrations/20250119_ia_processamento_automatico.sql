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
