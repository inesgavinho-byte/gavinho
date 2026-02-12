-- =====================================================
-- PUSH NOTIFICATION TRIGGERS
-- Sends Web Push via Edge Function when notifications are created
-- Requires: pg_net extension, send-push edge function deployed,
--           VAPID_PRIVATE_KEY configured as edge function secret
-- =====================================================

-- Enable pg_net extension (HTTP client from PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================
-- 1. Helper function: call send-push edge function
-- =====================================================
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_url TEXT DEFAULT '/',
  p_tag TEXT DEFAULT 'gavinho'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Read config from system_config (if available) or use defaults
  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_key' LIMIT 1;

  -- Only proceed if we have the config
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Push: system_config not set, skipping';
    RETURN;
  END IF;

  -- Check if user has active push subscriptions (avoid unnecessary HTTP calls)
  IF NOT EXISTS (
    SELECT 1 FROM chat_push_subscriptions
    WHERE utilizador_id = p_user_id AND activo = true
  ) THEN
    RETURN; -- No subscriptions, nothing to send
  END IF;

  -- Call the send-push edge function via pg_net
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/send-push',
    body := json_build_object(
      'user_id', p_user_id::text,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'tag', p_tag
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )::jsonb
  );

EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if push fails
  RAISE NOTICE 'Push notification failed: %', SQLERRM;
END;
$$;

-- =====================================================
-- 2. Trigger: notificacoes table (Teams/Workspace)
-- Fires on new notifications (mentions, messages, etc.)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_push_on_notificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM send_push_notification(
    NEW.user_id,
    COALESCE(NEW.title, 'Nova notificação'),
    COALESCE(NEW.message, ''),
    COALESCE(NEW.link, '/'),
    COALESCE(NEW.type, 'notification')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notificacao ON notificacoes;
CREATE TRIGGER trg_push_notificacao
  AFTER INSERT ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_notificacao();

-- =====================================================
-- 3. Trigger: app_notificacoes table (Obras app)
-- Fires on new app notifications (tasks, materials, etc.)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_push_on_app_notificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Resolve user_id from utilizador_id or email
  IF NEW.utilizador_id IS NOT NULL THEN
    v_user_id := NEW.utilizador_id;
  ELSIF NEW.email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM utilizadores WHERE email = NEW.email LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM send_push_notification(
    v_user_id,
    COALESCE(NEW.titulo, 'GAVINHO'),
    COALESCE(NEW.mensagem, ''),
    '/',
    COALESCE(NEW.tipo, 'app')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_app_notificacao ON app_notificacoes;
CREATE TRIGGER trg_push_app_notificacao
  AFTER INSERT ON app_notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_app_notificacao();
