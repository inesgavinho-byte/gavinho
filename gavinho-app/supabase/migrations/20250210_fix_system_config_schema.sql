-- =====================================================
-- FIX: system_config table schema mismatch
-- The table existed without description/created_at/updated_at columns
-- causing INSERT with description column to fail
-- =====================================================

-- Add missing columns
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure RLS is enabled
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_config' AND policyname = 'Service role pode gerir configurações') THEN
    CREATE POLICY "Service role pode gerir configurações" ON system_config
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert default config rows (skip if already exist)
INSERT INTO system_config (key, value, description) VALUES
  ('supabase_url', '', 'URL do projeto Supabase (ex: https://xxx.supabase.co)'),
  ('supabase_service_key', '', 'Service role key do Supabase (para chamadas internas)')
ON CONFLICT (key) DO NOTHING;

-- Helper function
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE v_value TEXT;
BEGIN
  SELECT value INTO v_value FROM system_config WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Override send_notification_email to use system_config
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wants_email BOOLEAN := TRUE;
BEGIN
  v_supabase_url := get_system_config('supabase_url');
  v_service_key := get_system_config('supabase_service_key');

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR
     v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Configuração de email não disponível - ignorando envio';
    RETURN NEW;
  END IF;

  IF NEW.urgente = TRUE OR v_wants_email = TRUE THEN
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

-- Override batch processing to use system_config
CREATE OR REPLACE FUNCTION process_pending_notification_emails()
RETURNS INTEGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_count INTEGER := 0;
BEGIN
  v_supabase_url := get_system_config('supabase_url');
  v_service_key := get_system_config('supabase_service_key');

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR
     v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Configuração não disponível';
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count FROM app_notificacoes WHERE email_enviado = FALSE;

  IF v_count > 0 THEN
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

COMMENT ON TABLE system_config IS 'Configurações do sistema - armazena URLs e chaves de API';
COMMENT ON FUNCTION get_system_config(TEXT) IS 'Obtém valor de configuração do sistema';
