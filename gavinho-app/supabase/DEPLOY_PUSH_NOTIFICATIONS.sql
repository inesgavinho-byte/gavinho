-- =====================================================
-- DEPLOY PUSH NOTIFICATIONS — Run in Supabase SQL Editor
-- Applies both push triggers and chat message trigger
-- =====================================================
-- Prerequisites:
--   1. Edge function 'send-push' deployed (supabase functions deploy send-push)
--   2. VAPID_PRIVATE_KEY configured as edge function secret
--   3. system_config table has 'supabase_url' and 'supabase_service_key' values
-- =====================================================

-- =====================================================
-- PART 1: Push Notification Triggers
-- (from 20250212_push_notification_triggers.sql)
-- =====================================================

-- Enable pg_net extension (HTTP client from PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Helper function: call send-push edge function
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
  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url' LIMIT 1;
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_key' LIMIT 1;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'Push: system_config not set, skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM chat_push_subscriptions
    WHERE utilizador_id = p_user_id AND activo = true
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push',
    body := json_build_object(
      'user_id', p_user_id::text,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'tag', p_tag
    )::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )::jsonb
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Push notification failed: %', SQLERRM;
END;
$$;

-- Trigger: notificacoes table → push
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

-- Trigger: app_notificacoes table → push
CREATE OR REPLACE FUNCTION trigger_push_on_app_notificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
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


-- =====================================================
-- PART 2: Chat Message → Notification Trigger
-- (from 20250212_chat_mensagens_notification_trigger.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_notificacao_on_chat_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_autor_nome TEXT;
  v_canal_codigo TEXT;
  v_canal_id UUID;
  v_mention TEXT;
  v_mentioned_user RECORD;
  v_content_preview TEXT;
  v_mentions TEXT[];
BEGIN
  IF NEW.conteudo IS NULL OR trim(NEW.conteudo) = '' THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_autor_nome FROM utilizadores WHERE id = NEW.autor_id;
  v_autor_nome := COALESCE(v_autor_nome, 'Alguém');

  SELECT codigo, id INTO v_canal_codigo, v_canal_id
  FROM chat_canais WHERE id = NEW.canal_id;

  v_content_preview := left(NEW.conteudo, 80);

  SELECT array_agg(m[1]) INTO v_mentions
  FROM regexp_matches(NEW.conteudo, '@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)', 'g') AS m;

  IF v_mentions IS NOT NULL AND array_length(v_mentions, 1) > 0 THEN
    FOREACH v_mention IN ARRAY v_mentions
    LOOP
      FOR v_mentioned_user IN
        SELECT id FROM utilizadores
        WHERE id != NEW.autor_id
          AND (
            lower(nome) = lower(v_mention)
            OR lower(nome) LIKE lower(v_mention) || ' %'
            OR split_part(lower(nome), ' ', 1) = lower(v_mention)
          )
        LIMIT 1
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM notificacoes
          WHERE user_id = v_mentioned_user.id
            AND sender_id = NEW.autor_id
            AND type = 'mention'
            AND context->>'message_id' = NEW.id::text
        ) THEN
          INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read)
          VALUES (
            v_mentioned_user.id,
            NEW.autor_id,
            'mention',
            '@Menção',
            v_autor_nome || ' mencionou-te: "' || v_content_preview ||
              CASE WHEN length(NEW.conteudo) > 80 THEN '...' ELSE '' END || '"',
            jsonb_build_object(
              'project', COALESCE(v_canal_codigo, ''),
              'channel', COALESCE(v_canal_codigo, ''),
              'message_id', NEW.id,
              'canal_id', NEW.canal_id
            ),
            '/workspace?canal=' || NEW.canal_id,
            false
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacao_on_chat_msg ON chat_mensagens;
CREATE TRIGGER trg_notificacao_on_chat_msg
  AFTER INSERT ON chat_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notificacao_on_chat_mensagem();

CREATE INDEX IF NOT EXISTS idx_notificacoes_mention_dedup
  ON notificacoes ((context->>'message_id'))
  WHERE type = 'mention';


-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✓ send_push_notification function created';
  RAISE NOTICE '✓ trg_push_notificacao trigger on notificacoes';
  RAISE NOTICE '✓ trg_push_app_notificacao trigger on app_notificacoes';
  RAISE NOTICE '✓ trg_notificacao_on_chat_msg trigger on chat_mensagens';
  RAISE NOTICE '✓ Mention dedup index created';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Deploy edge function: supabase functions deploy send-push';
  RAISE NOTICE '2. Set VAPID_PRIVATE_KEY: supabase secrets set VAPID_PRIVATE_KEY=<key>';
  RAISE NOTICE '3. Verify system_config has supabase_url and supabase_service_key';
END;
$$;
