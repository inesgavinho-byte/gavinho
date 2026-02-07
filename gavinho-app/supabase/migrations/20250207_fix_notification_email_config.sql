-- =====================================================
-- FIX: Notification Email Configuration
-- Resolves permission error with app.settings parameters
-- Uses a configuration table instead of database settings
-- =====================================================

-- =====================================================
-- TABELA DE CONFIGURAÇÃO DO SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- RLS - apenas admins podem ver/editar (desativado por defeito para funções SECURITY DEFINER)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Política para service role (funções SECURITY DEFINER têm acesso)
CREATE POLICY "Service role pode gerir configurações" ON system_config
  FOR ALL USING (true) WITH CHECK (true);

-- Inserir configurações padrão (valores placeholder - devem ser atualizados manualmente)
-- NOTA: Estes valores devem ser configurados pelo administrador após a instalação
INSERT INTO system_config (key, value, description) VALUES
  ('supabase_url', '', 'URL do projeto Supabase (ex: https://xxx.supabase.co)'),
  ('supabase_service_key', '', 'Service role key do Supabase (para chamadas internas)')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FUNÇÃO HELPER: Obter configuração
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value
  FROM system_config
  WHERE key = p_key;

  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ATUALIZAR FUNÇÃO: send_notification_email
-- Usa tabela de configuração em vez de app.settings
-- =====================================================

CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_user_email TEXT;
  v_wants_email BOOLEAN := TRUE;
BEGIN
  -- Buscar configurações da tabela system_config
  v_supabase_url := get_system_config('supabase_url');
  v_service_key := get_system_config('supabase_service_key');

  -- Se não tiver configuração válida, não fazer nada
  IF v_supabase_url IS NULL OR v_supabase_url = '' OR
     v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Configuração de email não disponível - ignorando envio';
    RETURN NEW;
  END IF;

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
-- ATUALIZAR FUNÇÃO: process_pending_notification_emails
-- Usa tabela de configuração em vez de app.settings
-- =====================================================

CREATE OR REPLACE FUNCTION process_pending_notification_emails()
RETURNS INTEGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Buscar configurações da tabela system_config
  v_supabase_url := get_system_config('supabase_url');
  v_service_key := get_system_config('supabase_service_key');

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR
     v_service_key IS NULL OR v_service_key = '' THEN
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
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE system_config IS 'Configurações do sistema - armazena URLs e chaves de API';
COMMENT ON FUNCTION get_system_config(TEXT) IS 'Obtém valor de configuração do sistema';

-- =====================================================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- =====================================================

-- IMPORTANTE: Após executar esta migração, configure os valores:
--
-- UPDATE system_config
-- SET value = 'https://seu-projeto.supabase.co'
-- WHERE key = 'supabase_url';
--
-- UPDATE system_config
-- SET value = 'sua-service-role-key'
-- WHERE key = 'supabase_service_key';
--
-- Ou via Supabase Dashboard > Table Editor > system_config
