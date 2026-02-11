-- =====================================================
-- NOTIFICATION EMAIL TRIGGER
-- Envia emails automaticamente quando notificações são criadas
-- =====================================================

-- Habilitar extensão pg_net se não existir (para chamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- FUNÇÃO: Enviar email de notificação via Edge Function
-- =====================================================

CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_user_email TEXT;
  v_wants_email BOOLEAN := TRUE; -- Por defeito envia email
BEGIN
  -- Buscar configurações do vault (se disponível) ou usar variáveis de ambiente
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Se não tiver configuração, não fazer nada
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Configuração de email não disponível - ignorando envio';
    RETURN NEW;
  END IF;

  -- Verificar se utilizador quer receber emails (futuro: consultar preferências)
  -- Por agora, envia sempre

  -- Verificar se é urgente (envia sempre) ou se utilizador quer emails
  IF NEW.urgente = TRUE OR v_wants_email = TRUE THEN
    -- Chamar edge function de forma assíncrona via pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'table', 'app_notificacoes'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Disparar quando notificação é criada
-- =====================================================

DROP TRIGGER IF EXISTS trigger_send_notification_email ON app_notificacoes;
CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON app_notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- =====================================================
-- ALTERNATIVA: CRON JOB para processar em batch
-- Mais eficiente para muitas notificações
-- =====================================================

-- Função para processar notificações pendentes
CREATE OR REPLACE FUNCTION process_pending_notification_emails()
RETURNS INTEGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_count INTEGER := 0;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Configuração não disponível';
    RETURN 0;
  END IF;

  -- Contar pendentes
  SELECT COUNT(*) INTO v_count
  FROM app_notificacoes
  WHERE email_enviado = FALSE;

  IF v_count > 0 THEN
    -- Chamar edge function para processar em batch
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'process_pending', true,
        'table', 'app_notificacoes'
      )
    );
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONFIGURAR CRON (via pg_cron se disponível)
-- Executa a cada 5 minutos
-- =====================================================

-- Verificar se pg_cron está disponível e configurar job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remover job existente se houver
    PERFORM cron.unschedule('process_notification_emails');

    -- Criar novo job para executar a cada 5 minutos
    PERFORM cron.schedule(
      'process_notification_emails',
      '*/5 * * * *',
      'SELECT process_pending_notification_emails()'
    );

    RAISE NOTICE 'Cron job configurado para processar emails a cada 5 minutos';
  ELSE
    RAISE NOTICE 'pg_cron não disponível - usar trigger individual ou cron externo';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Não foi possível configurar pg_cron: %', SQLERRM;
END $$;

-- =====================================================
-- TABELA DE PREFERÊNCIAS DE EMAIL (Opcional)
-- =====================================================

CREATE TABLE IF NOT EXISTS preferencias_notificacao_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID UNIQUE REFERENCES utilizadores(id) ON DELETE CASCADE,

  -- Preferências gerais
  receber_emails BOOLEAN DEFAULT TRUE,
  frequencia TEXT DEFAULT 'realtime' CHECK (frequencia IN ('realtime', 'hourly', 'daily', 'weekly', 'never')),

  -- Tipos de notificação a receber por email
  tipos_email JSONB DEFAULT '{
    "requisicao_nova": true,
    "requisicao_aprovada": true,
    "tarefa_atribuida": true,
    "mencao": true,
    "urgente": true
  }'::jsonb,

  -- Horário preferido para digest (se não realtime)
  hora_digest INTEGER DEFAULT 9, -- 9h da manhã

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pref_notif_email_user ON preferencias_notificacao_email(utilizador_id);

-- RLS
ALTER TABLE preferencias_notificacao_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizadores veem as suas preferencias" ON preferencias_notificacao_email
  FOR SELECT USING (utilizador_id = auth.uid());

CREATE POLICY "Utilizadores podem atualizar as suas preferencias" ON preferencias_notificacao_email
  FOR UPDATE USING (utilizador_id = auth.uid());

CREATE POLICY "Utilizadores podem inserir as suas preferencias" ON preferencias_notificacao_email
  FOR INSERT WITH CHECK (utilizador_id = auth.uid());

-- =====================================================
-- FUNÇÃO HELPER: Verificar se utilizador quer email
-- =====================================================

CREATE OR REPLACE FUNCTION utilizador_quer_email_notificacao(
  p_utilizador_id UUID,
  p_tipo TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  SELECT * INTO v_prefs
  FROM preferencias_notificacao_email
  WHERE utilizador_id = p_utilizador_id;

  -- Se não tem preferências, assume que quer emails
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Se desativou todos os emails
  IF v_prefs.receber_emails = FALSE THEN
    RETURN FALSE;
  END IF;

  -- Verificar tipo específico
  IF v_prefs.tipos_email ? p_tipo THEN
    RETURN (v_prefs.tipos_email->>p_tipo)::boolean;
  END IF;

  -- Tipo não configurado, assume TRUE
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION send_notification_email() IS 'Trigger que envia email quando notificação é criada';
COMMENT ON FUNCTION process_pending_notification_emails() IS 'Processa notificações pendentes de email em batch';
COMMENT ON TABLE preferencias_notificacao_email IS 'Preferências de notificação por email de cada utilizador';
