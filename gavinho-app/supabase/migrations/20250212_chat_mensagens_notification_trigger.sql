-- =====================================================
-- CHAT MESSAGE → NOTIFICATION TRIGGER
-- Creates notificacoes records when @mentions are detected
-- in new chat messages (server-side backup for client-side logic)
-- Also notifies channel members when document.hidden (via push)
-- =====================================================

-- =====================================================
-- 1. Trigger function: parse @mentions and create notificacoes
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
  -- Only process text messages with content
  IF NEW.conteudo IS NULL OR trim(NEW.conteudo) = '' THEN
    RETURN NEW;
  END IF;

  -- Get author name
  SELECT nome INTO v_autor_nome FROM utilizadores WHERE id = NEW.autor_id;
  v_autor_nome := COALESCE(v_autor_nome, 'Alguém');

  -- Get channel info (join through chat_topicos since mensagens link to topico, not canal)
  SELECT c.codigo, c.id INTO v_canal_codigo, v_canal_id
  FROM chat_canais c
  JOIN chat_topicos t ON t.canal_id = c.id
  WHERE t.id = NEW.topico_id;

  -- Preview of message content (max 80 chars)
  v_content_preview := left(NEW.conteudo, 80);

  -- Extract @mentions from message content
  -- Matches @Name or @FirstName LastName (supporting accented chars)
  SELECT array_agg(m[1]) INTO v_mentions
  FROM regexp_matches(NEW.conteudo, '@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)', 'g') AS m;

  -- If mentions found, create notificacoes for each mentioned user
  IF v_mentions IS NOT NULL AND array_length(v_mentions, 1) > 0 THEN
    FOREACH v_mention IN ARRAY v_mentions
    LOOP
      -- Find user by name match (case-insensitive, first name or full name)
      FOR v_mentioned_user IN
        SELECT id FROM utilizadores
        WHERE id != NEW.autor_id  -- Don't notify self
          AND (
            lower(nome) = lower(v_mention)
            OR lower(nome) LIKE lower(v_mention) || ' %'
            OR split_part(lower(nome), ' ', 1) = lower(v_mention)
          )
        LIMIT 1
      LOOP
        -- Check if notification already exists (avoid duplicates from client-side)
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

-- =====================================================
-- 2. Create trigger on chat_mensagens
-- =====================================================
DROP TRIGGER IF EXISTS trg_notificacao_on_chat_msg ON chat_mensagens;
CREATE TRIGGER trg_notificacao_on_chat_msg
  AFTER INSERT ON chat_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notificacao_on_chat_mensagem();

-- =====================================================
-- 3. Add index to speed up duplicate check
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notificacoes_mention_dedup
  ON notificacoes ((context->>'message_id'))
  WHERE type = 'mention';
