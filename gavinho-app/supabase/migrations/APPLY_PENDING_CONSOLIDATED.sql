-- =====================================================
-- GAVINHO PLATFORM — CONSOLIDATED PENDING MIGRATIONS
-- =====================================================
-- Generated: 2026-02-10
-- Scope: 8 pending migrations, applied in dependency order
-- Safety: All statements use IF NOT EXISTS / CREATE OR REPLACE
-- Usage: Paste into Supabase Dashboard > SQL Editor > Run
-- =====================================================

-- =====================================================
-- PART 1: SEEDS_EXECUTADOS TABLE (20250201_seeds_executados.sql)
-- New table for tracking which seeds have been run
-- =====================================================

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

CREATE INDEX IF NOT EXISTS idx_seeds_executados_key ON seeds_executados(seed_key);
CREATE INDEX IF NOT EXISTS idx_seeds_executados_em ON seeds_executados(executado_em DESC);

ALTER TABLE seeds_executados ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seeds_executados' AND policyname = 'seeds_executados_select') THEN
    CREATE POLICY "seeds_executados_select" ON seeds_executados FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seeds_executados' AND policyname = 'seeds_executados_insert') THEN
    CREATE POLICY "seeds_executados_insert" ON seeds_executados FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seeds_executados' AND policyname = 'seeds_executados_delete') THEN
    CREATE POLICY "seeds_executados_delete" ON seeds_executados FOR DELETE USING (true);
  END IF;
END $$;

COMMENT ON TABLE seeds_executados IS 'Registo de seeds já executados para auto-ocultar cards na UI';


-- =====================================================
-- PART 2: NOTIFICATION EMAIL TRIGGER (20250206_notification_email_trigger.sql)
-- Email notification functions + preferences table
-- =====================================================

-- Enable pg_net for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Email notification trigger function (will be overridden in Part 8)
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_user_email TEXT;
  v_wants_email BOOLEAN := TRUE;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
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

-- Trigger on app_notificacoes
DROP TRIGGER IF EXISTS trigger_send_notification_email ON app_notificacoes;
CREATE TRIGGER trigger_send_notification_email
  AFTER INSERT ON app_notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_email();

-- Batch processing function
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

  SELECT COUNT(*) INTO v_count
  FROM app_notificacoes
  WHERE email_enviado = FALSE;

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

-- Configure pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process_notification_emails');
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

-- Email preferences table
CREATE TABLE IF NOT EXISTS preferencias_notificacao_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID UNIQUE REFERENCES utilizadores(id) ON DELETE CASCADE,
  receber_emails BOOLEAN DEFAULT TRUE,
  frequencia TEXT DEFAULT 'realtime' CHECK (frequencia IN ('realtime', 'hourly', 'daily', 'weekly', 'never')),
  tipos_email JSONB DEFAULT '{
    "requisicao_nova": true,
    "requisicao_aprovada": true,
    "tarefa_atribuida": true,
    "mencao": true,
    "urgente": true
  }'::jsonb,
  hora_digest INTEGER DEFAULT 9,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_notif_email_user ON preferencias_notificacao_email(utilizador_id);

ALTER TABLE preferencias_notificacao_email ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao_email' AND policyname = 'Utilizadores veem as suas preferencias') THEN
    CREATE POLICY "Utilizadores veem as suas preferencias" ON preferencias_notificacao_email
      FOR SELECT USING (utilizador_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao_email' AND policyname = 'Utilizadores podem atualizar as suas preferencias') THEN
    CREATE POLICY "Utilizadores podem atualizar as suas preferencias" ON preferencias_notificacao_email
      FOR UPDATE USING (utilizador_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao_email' AND policyname = 'Utilizadores podem inserir as suas preferencias') THEN
    CREATE POLICY "Utilizadores podem inserir as suas preferencias" ON preferencias_notificacao_email
      FOR INSERT WITH CHECK (utilizador_id = auth.uid());
  END IF;
END $$;

-- Helper function
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

  IF NOT FOUND THEN RETURN TRUE; END IF;
  IF v_prefs.receber_emails = FALSE THEN RETURN FALSE; END IF;
  IF v_prefs.tipos_email ? p_tipo THEN
    RETURN (v_prefs.tipos_email->>p_tipo)::boolean;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_notification_email() IS 'Trigger que envia email quando notificação é criada';
COMMENT ON FUNCTION process_pending_notification_emails() IS 'Processa notificações pendentes de email em batch';
COMMENT ON TABLE preferencias_notificacao_email IS 'Preferências de notificação por email de cada utilizador';


-- =====================================================
-- PART 3: NOTIFICATION TRIGGER FUNCTIONS (20250206_notificacoes_seed_triggers.sql)
-- Auto-notification triggers for tarefas, atas, duvidas, projetos
-- =====================================================

-- Trigger: task assigned
CREATE OR REPLACE FUNCTION notify_tarefa_atribuida()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_criador_nome TEXT;
BEGIN
  IF NEW.responsavel_id IS NOT NULL AND
     (OLD IS NULL OR OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id) THEN
    IF NEW.responsavel_id = NEW.criado_por_id THEN RETURN NEW; END IF;

    SELECT nome INTO v_projeto_nome FROM projetos WHERE id = NEW.projeto_id;
    SELECT nome INTO v_criador_nome FROM utilizadores WHERE id = NEW.criado_por_id;

    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
    VALUES (
      NEW.responsavel_id, NEW.criado_por_id, 'task', 'Tarefa atribuída',
      COALESCE(v_criador_nome, 'Alguém') || ' atribuiu-te uma tarefa: ' || NEW.titulo,
      jsonb_build_object('project', COALESCE(v_projeto_nome, 'Sem projeto'), 'tarefa_id', NEW.id, 'prioridade', NEW.prioridade),
      CASE WHEN NEW.projeto_id IS NOT NULL THEN '/projetos/' || NEW.projeto_id::text ELSE '/tarefas' END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_tarefa_atribuida ON tarefas;
CREATE TRIGGER trigger_notify_tarefa_atribuida
  AFTER INSERT OR UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION notify_tarefa_atribuida();

-- Trigger: ata created
CREATE OR REPLACE FUNCTION notify_ata_criada()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_projeto_id UUID;
  v_criador_nome TEXT;
  v_participante JSONB;
  v_user_id UUID;
BEGIN
  SELECT nome, id INTO v_projeto_nome, v_projeto_id FROM projetos WHERE id = NEW.projeto_id;
  SELECT nome INTO v_criador_nome FROM utilizadores WHERE id = NEW.criado_por;

  IF NEW.participantes IS NOT NULL AND jsonb_array_length(NEW.participantes) > 0 THEN
    FOR v_participante IN SELECT * FROM jsonb_array_elements(NEW.participantes)
    LOOP
      IF v_participante->>'user_id' IS NOT NULL THEN
        v_user_id := (v_participante->>'user_id')::UUID;
        IF v_user_id != NEW.criado_por THEN
          INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
          VALUES (
            v_user_id, NEW.criado_por, 'comment', 'Nova ata de reunião',
            COALESCE(v_criador_nome, 'Alguém') || ' criou a ata: ' || NEW.titulo,
            jsonb_build_object('project', COALESCE(v_projeto_nome, 'Sem projeto'), 'channel', 'Atas', 'ata_id', NEW.id),
            '/projetos/' || v_projeto_id::text || '/atas/' || NEW.id::text
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_ata_criada ON projeto_atas;
CREATE TRIGGER trigger_notify_ata_criada
  AFTER INSERT ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ata_criada();

-- Trigger: duvida answered
CREATE OR REPLACE FUNCTION notify_duvida_respondida()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_respondedor_nome TEXT;
BEGIN
  IF NEW.resposta IS NOT NULL AND
     (OLD IS NULL OR OLD.resposta IS DISTINCT FROM NEW.resposta) AND
     NEW.created_by IS NOT NULL THEN
    IF NEW.respondido_por = NEW.created_by THEN RETURN NEW; END IF;

    SELECT nome INTO v_projeto_nome FROM projetos WHERE id = NEW.projeto_id;
    SELECT nome INTO v_respondedor_nome FROM utilizadores WHERE id = NEW.respondido_por;

    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
    VALUES (
      NEW.created_by, NEW.respondido_por, 'comment', 'Dúvida respondida',
      COALESCE(v_respondedor_nome, 'Alguém') || ' respondeu à tua dúvida: ' || NEW.titulo,
      jsonb_build_object('project', COALESCE(v_projeto_nome, 'Sem projeto'), 'duvida_id', NEW.id),
      '/projetos/' || NEW.projeto_id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_duvida_respondida ON projeto_duvidas;
CREATE TRIGGER trigger_notify_duvida_respondida
  AFTER UPDATE ON projeto_duvidas
  FOR EACH ROW
  EXECUTE FUNCTION notify_duvida_respondida();

-- Trigger: project phase changed
CREATE OR REPLACE FUNCTION notify_projeto_fase_alterada()
RETURNS TRIGGER AS $$
DECLARE
  v_membro RECORD;
BEGIN
  IF OLD.fase IS DISTINCT FROM NEW.fase AND NEW.fase IS NOT NULL THEN
    FOR v_membro IN
      SELECT DISTINCT u.id FROM utilizadores u
      JOIN projeto_equipa pe ON pe.utilizador_id = u.id
      WHERE pe.projeto_id = NEW.id
    LOOP
      INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
      VALUES (
        v_membro.id, NULL, 'project', 'Atualização de projeto',
        'O projeto ' || COALESCE(NEW.codigo_interno, NEW.nome) || ' avançou para fase "' || NEW.fase || '"',
        jsonb_build_object('project', COALESCE(NEW.codigo_interno, NEW.nome), 'projeto_id', NEW.id, 'fase_anterior', OLD.fase, 'fase_nova', NEW.fase),
        '/projetos/' || NEW.id::text
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'fase') THEN
    DROP TRIGGER IF EXISTS trigger_notify_projeto_fase_alterada ON projetos;
    CREATE TRIGGER trigger_notify_projeto_fase_alterada
      AFTER UPDATE ON projetos FOR EACH ROW
      EXECUTE FUNCTION notify_projeto_fase_alterada();
  END IF;
END $$;

-- Helper: create mention notification
CREATE OR REPLACE FUNCTION criar_mencao(
  p_mentioned_user_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_project_name TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_sender_nome TEXT;
BEGIN
  SELECT nome INTO v_sender_nome FROM utilizadores WHERE id = p_sender_id;

  INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
  VALUES (
    p_mentioned_user_id, p_sender_id, 'mention', '@Menção',
    COALESCE(v_sender_nome, 'Alguém') || ' mencionou-te: "' || LEFT(p_message, 50) || CASE WHEN LENGTH(p_message) > 50 THEN '..."' ELSE '"' END,
    jsonb_build_object('project', p_project_name, 'channel', p_channel),
    p_link
  )
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_tarefa_atribuida() IS 'Trigger que notifica quando uma tarefa é atribuída';
COMMENT ON FUNCTION notify_ata_criada() IS 'Trigger que notifica participantes quando uma ata é criada';
COMMENT ON FUNCTION notify_duvida_respondida() IS 'Trigger que notifica quando uma dúvida é respondida';
COMMENT ON FUNCTION notify_projeto_fase_alterada() IS 'Trigger que notifica equipa quando projeto muda de fase';
COMMENT ON FUNCTION criar_mencao() IS 'Helper para criar notificações de menção @utilizador';

-- Seed data (cleans old seeds first)
DO $$
DECLARE
  v_user_id UUID;
  v_sender_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM utilizadores LIMIT 1;
  SELECT id INTO v_sender_id FROM utilizadores WHERE id != v_user_id LIMIT 1;
  IF v_sender_id IS NULL THEN v_sender_id := v_user_id; END IF;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM notificacoes WHERE context->>'seed' = 'true';

    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, created_at) VALUES
    (v_user_id, v_sender_id, 'mention', '@Menção em ata', 'Maria mencionou-te na ata do projeto 413_OEIRAS', '{"project": "413_414 OEIRAS", "channel": "Atas", "seed": "true"}'::jsonb, '/projetos/413', NOW() - INTERVAL '5 minutes'),
    (v_user_id, v_sender_id, 'message', 'Nova mensagem', 'Armando enviou uma mensagem no Team Chat', '{"project": "GAVINHO ARCH BIM TEAM", "channel": "Team Chat", "seed": "true"}'::jsonb, '/workspace', NOW() - INTERVAL '15 minutes'),
    (v_user_id, NULL, 'task', 'Tarefa atribuída', 'Tens uma nova tarefa: Revisão de imagens finais', '{"project": "420_VILA REAL", "seed": "true"}'::jsonb, '/projetos/420', NOW() - INTERVAL '30 minutes'),
    (v_user_id, v_sender_id, 'approval', 'Aprovação pendente', 'Tens um render a aguardar aprovação', '{"project": "413_414 OEIRAS", "channel": "Renders", "seed": "true"}'::jsonb, '/projetos/413', NOW() - INTERVAL '1 hour');

    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read, read_at, created_at) VALUES
    (v_user_id, v_sender_id, 'comment', 'Novo comentário', 'Carolina comentou na ata de reunião', '{"project": "464_APARTAMENTO", "channel": "Atas", "seed": "true"}'::jsonb, '/projetos/464', TRUE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours'),
    (v_user_id, NULL, 'project', 'Atualização de projeto', 'O projeto 480_MORADIA foi atualizado para fase "Em Execução"', '{"project": "480_MORADIA", "seed": "true"}'::jsonb, '/projetos/480', TRUE, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '1 day'),
    (v_user_id, v_sender_id, 'mention', NULL, 'Ana mencionou-te: "ponto de situação: estrutura d..."', '{"project": "GAVINHO Signature", "channel": "Geral", "seed": "true"}'::jsonb, '/workspace', TRUE, NOW() - INTERVAL '40 hours', NOW() - INTERVAL '2 days'),
    (v_user_id, NULL, 'system', 'Backup completo', 'O backup semanal do sistema foi concluído com sucesso', '{"seed": "true"}'::jsonb, NULL, TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours');

    RAISE NOTICE 'Seed data inserido com sucesso para utilizador %', v_user_id;
  END IF;
END $$;


-- =====================================================
-- PART 4: PROJETO ATAS SECAO (20250206_projeto_atas_secao.sql)
-- Add section column for organizing atas
-- =====================================================

ALTER TABLE projeto_atas
ADD COLUMN IF NOT EXISTS secao VARCHAR(100) DEFAULT 'diario_bordo';

CREATE INDEX IF NOT EXISTS idx_projeto_atas_secao ON projeto_atas(secao);

COMMENT ON COLUMN projeto_atas.secao IS 'Secao/separador do documento: diario_bordo, reunioes_equipa, reunioes_cliente, reunioes_obra, outras';


-- =====================================================
-- PART 5: NOTIFICACOES CONSOLIDADAS (20250207_notificacoes_consolidadas.sql)
-- Unified notification view + grouping + pagination + actions
-- =====================================================

-- Add inline action columns
ALTER TABLE app_notificacoes ADD COLUMN IF NOT EXISTS acoes JSONB DEFAULT '[]';
ALTER TABLE app_notificacoes ADD COLUMN IF NOT EXISTS grupo_id TEXT;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS acoes JSONB DEFAULT '[]';
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS grupo_id TEXT;

CREATE INDEX IF NOT EXISTS idx_app_notificacoes_grupo ON app_notificacoes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_grupo ON notificacoes(grupo_id);

-- Unified view combining both notification tables
CREATE OR REPLACE VIEW notificacoes_unificadas AS
SELECT
  id, 'app' AS origem, utilizador_id AS user_id, utilizador_email AS user_email,
  NULL::uuid AS sender_id, tipo AS type, titulo AS title, mensagem AS message,
  jsonb_build_object('obra_id', obra_id, 'requisicao_id', requisicao_id, 'tarefa_id', tarefa_id)
    || COALESCE(dados, '{}'::jsonb) AS context,
  CASE
    WHEN obra_id IS NOT NULL THEN '/obras/' || obra_id
    WHEN requisicao_id IS NOT NULL THEN '/requisicoes/' || requisicao_id
    WHEN tarefa_id IS NOT NULL THEN '/tarefas/' || tarefa_id
    ELSE NULL
  END AS link,
  lida AS read, data_leitura AS read_at, urgente AS urgent,
  acoes AS actions, grupo_id, created_at, created_at AS updated_at
FROM app_notificacoes
UNION ALL
SELECT
  id, 'workspace' AS origem, user_id, NULL AS user_email, sender_id, type, title, message,
  context, link, read, read_at, FALSE AS urgent,
  acoes AS actions, grupo_id, created_at, updated_at
FROM notificacoes;

-- Paginated unified notifications
CREATE OR REPLACE FUNCTION get_notificacoes_unificadas(
  p_user_id UUID, p_user_email TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0, p_apenas_nao_lidas BOOLEAN DEFAULT FALSE,
  p_tipo TEXT DEFAULT NULL, p_origem TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, origem TEXT, user_id UUID, user_email TEXT, sender_id UUID,
  sender_nome TEXT, sender_avatar TEXT, type TEXT, title TEXT, message TEXT,
  context JSONB, link TEXT, read BOOLEAN, read_at TIMESTAMPTZ, urgent BOOLEAN,
  actions JSONB, grupo_id TEXT, created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.origem, n.user_id, n.user_email, n.sender_id,
    u.nome AS sender_nome, u.avatar_url AS sender_avatar,
    n.type, n.title, n.message, n.context, n.link, n.read, n.read_at,
    n.urgent, n.actions, n.grupo_id, n.created_at
  FROM notificacoes_unificadas n
  LEFT JOIN utilizadores u ON n.sender_id = u.id
  WHERE (n.user_id = p_user_id OR n.user_email = p_user_email)
    AND (NOT p_apenas_nao_lidas OR n.read = FALSE)
    AND (p_tipo IS NULL OR n.type = p_tipo)
    AND (p_origem IS NULL OR n.origem = p_origem)
  ORDER BY n.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grouped notifications
CREATE OR REPLACE FUNCTION get_notificacoes_agrupadas(
  p_user_id UUID, p_user_email TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  grupo_key TEXT, type TEXT, count BIGINT, title TEXT, message TEXT,
  latest_id UUID, latest_created_at TIMESTAMPTZ, all_read BOOLEAN,
  ids UUID[], contextos JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH notifs AS (
    SELECT n.*,
      n.type || '_' || DATE(n.created_at)::text || '_' ||
        COALESCE((n.context->>'obra_id')::text, (n.context->>'project')::text, 'general') AS grupo_key
    FROM notificacoes_unificadas n
    WHERE (n.user_id = p_user_id OR n.user_email = p_user_email)
  )
  SELECT g.grupo_key, g.type, COUNT(*)::BIGINT AS count,
    CASE WHEN COUNT(*) > 1 THEN COUNT(*) || ' ' ||
      CASE g.type
        WHEN 'tarefa_atribuida' THEN 'tarefas atribuídas'
        WHEN 'tarefa_concluida' THEN 'tarefas concluídas'
        WHEN 'requisicao_nova' THEN 'novas requisições'
        WHEN 'material_aprovado' THEN 'materiais aprovados'
        WHEN 'mention' THEN 'menções'
        WHEN 'message' THEN 'novas mensagens'
        ELSE 'notificações'
      END
    ELSE MAX(g.title) END AS title,
    (ARRAY_AGG(g.message ORDER BY g.created_at DESC))[1] AS message,
    (ARRAY_AGG(g.id ORDER BY g.created_at DESC))[1] AS latest_id,
    MAX(g.created_at) AS latest_created_at,
    BOOL_AND(g.read) AS all_read,
    ARRAY_AGG(g.id ORDER BY g.created_at DESC) AS ids,
    jsonb_agg(DISTINCT g.context) FILTER (WHERE g.context IS NOT NULL) AS contextos
  FROM notifs g
  GROUP BY g.grupo_key, g.type
  ORDER BY MAX(g.created_at) DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Count unread
CREATE OR REPLACE FUNCTION contar_notificacoes_unificadas_nao_lidas(
  p_user_id UUID, p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (total BIGINT, app BIGINT, workspace BIGINT, urgentes BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE origem = 'app')::BIGINT AS app,
    COUNT(*) FILTER (WHERE origem = 'workspace')::BIGINT AS workspace,
    COUNT(*) FILTER (WHERE urgent = TRUE)::BIGINT AS urgentes
  FROM notificacoes_unificadas
  WHERE (user_id = p_user_id OR user_email = p_user_email) AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark single notification as read
CREATE OR REPLACE FUNCTION marcar_notificacao_lida(
  p_notification_id UUID, p_origem TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE v_updated BOOLEAN := FALSE;
BEGIN
  IF p_origem IS NULL OR p_origem = 'app' THEN
    UPDATE app_notificacoes SET lida = TRUE, data_leitura = NOW()
    WHERE id = p_notification_id AND lida = FALSE;
    IF FOUND THEN v_updated := TRUE; END IF;
  END IF;
  IF p_origem IS NULL OR p_origem = 'workspace' THEN
    UPDATE notificacoes SET read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND read = FALSE;
    IF FOUND THEN v_updated := TRUE; END IF;
  END IF;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all as read
CREATE OR REPLACE FUNCTION marcar_todas_notificacoes_lidas_unificado(
  p_user_id UUID, p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (app_count INTEGER, workspace_count INTEGER) AS $$
DECLARE v_app_count INTEGER := 0; v_workspace_count INTEGER := 0;
BEGIN
  UPDATE app_notificacoes SET lida = TRUE, data_leitura = NOW()
  WHERE (utilizador_id = p_user_id OR utilizador_email = p_user_email) AND lida = FALSE;
  GET DIAGNOSTICS v_app_count = ROW_COUNT;
  UPDATE notificacoes SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
  GET DIAGNOSTICS v_workspace_count = ROW_COUNT;
  RETURN QUERY SELECT v_app_count, v_workspace_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute inline action
CREATE OR REPLACE FUNCTION executar_acao_notificacao(
  p_notification_id UUID, p_acao_id TEXT, p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE v_notif RECORD; v_acao JSONB; v_resultado JSONB;
BEGIN
  SELECT * INTO v_notif FROM app_notificacoes WHERE id = p_notification_id;
  IF NOT FOUND THEN SELECT * INTO v_notif FROM notificacoes WHERE id = p_notification_id; END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Notificação não encontrada'); END IF;

  SELECT elem INTO v_acao FROM jsonb_array_elements(COALESCE(v_notif.acoes, '[]'::jsonb)) elem
  WHERE elem->>'id' = p_acao_id;
  IF v_acao IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Ação não encontrada'); END IF;

  CASE v_acao->>'tipo'
    WHEN 'aprovar_requisicao' THEN
      UPDATE requisicoes_materiais SET estado = 'aprovado', aprovado_por = p_user_id, data_aprovacao = NOW()
      WHERE id = (v_acao->>'requisicao_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Requisição aprovada');
    WHEN 'rejeitar_requisicao' THEN
      UPDATE requisicoes_materiais SET estado = 'rejeitado', aprovado_por = p_user_id, data_aprovacao = NOW()
      WHERE id = (v_acao->>'requisicao_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Requisição rejeitada');
    WHEN 'concluir_tarefa' THEN
      UPDATE tarefas SET estado = 'concluida', data_conclusao = NOW()
      WHERE id = (v_acao->>'tarefa_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Tarefa concluída');
    WHEN 'arquivar' THEN
      PERFORM marcar_notificacao_lida(p_notification_id, NULL);
      v_resultado := jsonb_build_object('success', true, 'message', 'Notificação arquivada');
    ELSE
      v_resultado := jsonb_build_object('success', false, 'error', 'Tipo de ação não suportado');
  END CASE;

  IF (v_resultado->>'success')::boolean THEN
    UPDATE app_notificacoes SET acoes = (
      SELECT jsonb_agg(CASE WHEN elem->>'id' = p_acao_id
        THEN elem || ('{"executada": true, "executada_em": "' || NOW()::text || '", "executada_por": "' || p_user_id::text || '"}')::jsonb
        ELSE elem END)
      FROM jsonb_array_elements(acoes) elem
    ) WHERE id = p_notification_id;
    UPDATE notificacoes SET acoes = (
      SELECT jsonb_agg(CASE WHEN elem->>'id' = p_acao_id
        THEN elem || ('{"executada": true, "executada_em": "' || NOW()::text || '", "executada_por": "' || p_user_id::text || '"}')::jsonb
        ELSE elem END)
      FROM jsonb_array_elements(acoes) elem
    ) WHERE id = p_notification_id;
  END IF;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-add actions based on notification type
CREATE OR REPLACE FUNCTION auto_adicionar_acoes_notificacao()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.tipo
    WHEN 'requisicao_nova' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object('id', 'aprovar_' || NEW.id, 'tipo', 'aprovar_requisicao', 'label', 'Aprovar', 'icon', 'check', 'color', 'green', 'requisicao_id', NEW.requisicao_id),
        jsonb_build_object('id', 'rejeitar_' || NEW.id, 'tipo', 'rejeitar_requisicao', 'label', 'Rejeitar', 'icon', 'x', 'color', 'red', 'requisicao_id', NEW.requisicao_id)
      );
    WHEN 'tarefa_atribuida' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object('id', 'concluir_' || NEW.id, 'tipo', 'concluir_tarefa', 'label', 'Concluir', 'icon', 'check', 'color', 'green', 'tarefa_id', NEW.tarefa_id),
        jsonb_build_object('id', 'ver_' || NEW.id, 'tipo', 'navegar', 'label', 'Ver Detalhes', 'icon', 'eye', 'color', 'blue', 'link', '/tarefas/' || NEW.tarefa_id)
      );
    WHEN 'aprovacao_pendente' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object('id', 'aprovar_' || NEW.id, 'tipo', 'aprovar_requisicao', 'label', 'Aprovar', 'icon', 'check', 'color', 'green', 'requisicao_id', NEW.requisicao_id),
        jsonb_build_object('id', 'rejeitar_' || NEW.id, 'tipo', 'rejeitar_requisicao', 'label', 'Rejeitar', 'icon', 'x', 'color', 'red', 'requisicao_id', NEW.requisicao_id)
      );
    ELSE
      NEW.acoes := jsonb_build_array(
        jsonb_build_object('id', 'arquivar_' || NEW.id, 'tipo', 'arquivar', 'label', 'Arquivar', 'icon', 'archive', 'color', 'gray')
      );
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_acoes_app_notificacoes ON app_notificacoes;
CREATE TRIGGER trigger_auto_acoes_app_notificacoes
  BEFORE INSERT ON app_notificacoes
  FOR EACH ROW
  WHEN (NEW.acoes IS NULL OR NEW.acoes = '[]'::jsonb)
  EXECUTE FUNCTION auto_adicionar_acoes_notificacao();

COMMENT ON VIEW notificacoes_unificadas IS 'Vista que combina notificacoes (Teams) e app_notificacoes (Obras)';
COMMENT ON FUNCTION get_notificacoes_unificadas IS 'Obtém notificações unificadas com paginação e filtros';
COMMENT ON FUNCTION get_notificacoes_agrupadas IS 'Agrupa notificações similares por tipo e data';
COMMENT ON FUNCTION executar_acao_notificacao IS 'Executa uma ação inline de notificação';


-- =====================================================
-- PART 6: NICE TO HAVE FEATURES (20250207_notificacoes_nice_to_have.sql)
-- Notification preferences, digest, analytics
-- =====================================================

-- Extend preferencias_notificacao_email with extra columns
ALTER TABLE preferencias_notificacao_email
ADD COLUMN IF NOT EXISTS tipos_silenciados TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS canais_silenciados UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS obras_silenciadas UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS horario_silencio_inicio TIME,
ADD COLUMN IF NOT EXISTS horario_silencio_fim TIME,
ADD COLUMN IF NOT EXISTS dias_silencio INTEGER[] DEFAULT '{}';

-- Full notification preferences table
CREATE TABLE IF NOT EXISTS preferencias_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID UNIQUE NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  notificacoes_ativadas BOOLEAN DEFAULT TRUE,
  som_ativado BOOLEAN DEFAULT TRUE,
  push_ativado BOOLEAN DEFAULT TRUE,
  email_ativado BOOLEAN DEFAULT TRUE,
  email_frequencia TEXT DEFAULT 'realtime' CHECK (email_frequencia IN ('realtime', 'hourly', 'daily', 'weekly', 'never')),
  email_hora_digest INTEGER DEFAULT 9,
  tipos_silenciados TEXT[] DEFAULT '{}',
  preferencias_tipo JSONB DEFAULT '{}'::jsonb,
  canais_silenciados UUID[] DEFAULT '{}',
  obras_silenciadas UUID[] DEFAULT '{}',
  dnd_ativado BOOLEAN DEFAULT FALSE,
  dnd_inicio TIME DEFAULT '22:00',
  dnd_fim TIME DEFAULT '08:00',
  dnd_dias INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_notif_user ON preferencias_notificacao(utilizador_id);
ALTER TABLE preferencias_notificacao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao' AND policyname = 'Utilizadores veem as suas preferencias_notificacao') THEN
    CREATE POLICY "Utilizadores veem as suas preferencias_notificacao" ON preferencias_notificacao FOR SELECT USING (utilizador_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao' AND policyname = 'Utilizadores podem atualizar preferencias_notificacao') THEN
    CREATE POLICY "Utilizadores podem atualizar preferencias_notificacao" ON preferencias_notificacao FOR UPDATE USING (utilizador_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_notificacao' AND policyname = 'Utilizadores podem inserir preferencias_notificacao') THEN
    CREATE POLICY "Utilizadores podem inserir preferencias_notificacao" ON preferencias_notificacao FOR INSERT WITH CHECK (utilizador_id = auth.uid());
  END IF;
END $$;

-- Check notification preference function
CREATE OR REPLACE FUNCTION utilizador_quer_notificacao(
  p_utilizador_id UUID, p_tipo TEXT, p_canal TEXT DEFAULT 'app'
)
RETURNS BOOLEAN AS $$
DECLARE v_prefs RECORD; v_tipo_prefs JSONB; v_now TIME; v_dia_semana INTEGER;
BEGIN
  SELECT * INTO v_prefs FROM preferencias_notificacao WHERE utilizador_id = p_utilizador_id;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  IF NOT v_prefs.notificacoes_ativadas THEN RETURN FALSE; END IF;
  IF p_canal = 'email' AND NOT v_prefs.email_ativado THEN RETURN FALSE; END IF;
  IF p_canal = 'push' AND NOT v_prefs.push_ativado THEN RETURN FALSE; END IF;
  IF p_tipo = ANY(v_prefs.tipos_silenciados) THEN RETURN FALSE; END IF;
  v_tipo_prefs := v_prefs.preferencias_tipo->p_tipo;
  IF v_tipo_prefs IS NOT NULL THEN
    IF (v_tipo_prefs->>p_canal)::boolean = FALSE THEN RETURN FALSE; END IF;
  END IF;
  IF v_prefs.dnd_ativado THEN
    v_now := CURRENT_TIME;
    v_dia_semana := EXTRACT(DOW FROM CURRENT_DATE)::integer;
    IF v_dia_semana = ANY(v_prefs.dnd_dias) THEN
      IF v_prefs.dnd_inicio > v_prefs.dnd_fim THEN
        IF v_now >= v_prefs.dnd_inicio OR v_now < v_prefs.dnd_fim THEN RETURN FALSE; END IF;
      ELSE
        IF v_now >= v_prefs.dnd_inicio AND v_now < v_prefs.dnd_fim THEN RETURN FALSE; END IF;
      END IF;
    END IF;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle notification type
CREATE OR REPLACE FUNCTION toggle_tipo_notificacao(
  p_utilizador_id UUID, p_tipo TEXT, p_silenciar BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO preferencias_notificacao (utilizador_id) VALUES (p_utilizador_id)
  ON CONFLICT (utilizador_id) DO NOTHING;
  IF p_silenciar THEN
    UPDATE preferencias_notificacao
    SET tipos_silenciados = array_append(array_remove(tipos_silenciados, p_tipo), p_tipo), updated_at = NOW()
    WHERE utilizador_id = p_utilizador_id;
  ELSE
    UPDATE preferencias_notificacao
    SET tipos_silenciados = array_remove(tipos_silenciados, p_tipo), updated_at = NOW()
    WHERE utilizador_id = p_utilizador_id;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Digest log table
CREATE TABLE IF NOT EXISTS notificacao_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('hourly', 'daily', 'weekly')),
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  total_notificacoes INTEGER DEFAULT 0,
  total_nao_lidas INTEGER DEFAULT 0,
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  sucesso BOOLEAN DEFAULT TRUE,
  erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_digest_log_user ON notificacao_digest_log(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_digest_log_tipo ON notificacao_digest_log(tipo, enviado_em);

-- Digest summary function
CREATE OR REPLACE FUNCTION get_notificacao_digest(
  p_utilizador_id UUID, p_periodo TEXT DEFAULT 'daily'
)
RETURNS TABLE (tipo TEXT, titulo TEXT, contagem BIGINT, mais_recente TIMESTAMPTZ, exemplos JSONB) AS $$
DECLARE v_inicio TIMESTAMPTZ;
BEGIN
  CASE p_periodo
    WHEN 'hourly' THEN v_inicio := NOW() - INTERVAL '1 hour';
    WHEN 'daily' THEN v_inicio := NOW() - INTERVAL '1 day';
    WHEN 'weekly' THEN v_inicio := NOW() - INTERVAL '1 week';
    ELSE v_inicio := NOW() - INTERVAL '1 day';
  END CASE;

  RETURN QUERY
  WITH notifs AS (
    SELECT n.type, n.title, n.message, n.created_at, n.read
    FROM notificacoes_unificadas n
    WHERE (n.user_id = p_utilizador_id OR n.user_email = (SELECT email FROM utilizadores WHERE id = p_utilizador_id))
      AND n.created_at >= v_inicio AND n.read = FALSE
  )
  SELECT n.type,
    COALESCE((SELECT label FROM (VALUES
      ('mention','Menções'),('message','Mensagens'),('tarefa_atribuida','Tarefas Atribuídas'),
      ('tarefa_concluida','Tarefas Concluídas'),('requisicao_nova','Novas Requisições'),
      ('material_aprovado','Materiais Aprovados'),('aprovacao_pendente','Aprovações Pendentes')
    ) AS t(tipo, label) WHERE t.tipo = n.type), 'Notificações') AS titulo,
    COUNT(*)::BIGINT AS contagem,
    MAX(n.created_at) AS mais_recente,
    jsonb_agg(jsonb_build_object('title', n.title, 'message', LEFT(n.message, 100), 'created_at', n.created_at) ORDER BY n.created_at DESC)
      FILTER (WHERE n.created_at >= v_inicio) AS exemplos
  FROM notifs n GROUP BY n.type ORDER BY contagem DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process pending digests
CREATE OR REPLACE FUNCTION processar_digests_pendentes()
RETURNS TABLE (utilizador_id UUID, email TEXT, frequencia TEXT, total_nao_lidas BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH usuarios_digest AS (
    SELECT p.utilizador_id, u.email, p.email_frequencia, p.email_hora_digest
    FROM preferencias_notificacao p
    JOIN utilizadores u ON p.utilizador_id = u.id
    WHERE p.email_ativado = TRUE AND p.email_frequencia IN ('daily', 'weekly')
      AND ((p.email_frequencia = 'daily' AND EXTRACT(HOUR FROM NOW()) = p.email_hora_digest
            AND NOT EXISTS (SELECT 1 FROM notificacao_digest_log l WHERE l.utilizador_id = p.utilizador_id AND l.tipo = 'daily' AND l.enviado_em >= NOW() - INTERVAL '23 hours'))
        OR (p.email_frequencia = 'weekly' AND EXTRACT(DOW FROM NOW()) = 1 AND EXTRACT(HOUR FROM NOW()) = p.email_hora_digest
            AND NOT EXISTS (SELECT 1 FROM notificacao_digest_log l WHERE l.utilizador_id = p.utilizador_id AND l.tipo = 'weekly' AND l.enviado_em >= NOW() - INTERVAL '6 days')))
  )
  SELECT ud.utilizador_id, ud.email, ud.email_frequencia, COUNT(*)::BIGINT AS total_nao_lidas
  FROM usuarios_digest ud
  LEFT JOIN notificacoes_unificadas n ON (n.user_id = ud.utilizador_id OR n.user_email = ud.email) AND n.read = FALSE
  GROUP BY ud.utilizador_id, ud.email, ud.email_frequencia HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics table
CREATE TABLE IF NOT EXISTS notificacao_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id UUID,
  utilizador_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,
  evento TEXT NOT NULL CHECK (evento IN ('created','delivered','viewed','read','clicked','action_taken','dismissed','email_sent','email_opened','email_clicked')),
  tipo_notificacao TEXT,
  origem TEXT,
  canal TEXT,
  acao_id TEXT,
  contexto JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tempo_ate_leitura INTEGER,
  tempo_ate_acao INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analytics_evento ON notificacao_analytics(evento);
CREATE INDEX IF NOT EXISTS idx_analytics_tipo ON notificacao_analytics(tipo_notificacao);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON notificacao_analytics(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON notificacao_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_notif ON notificacao_analytics(notificacao_id);

ALTER TABLE notificacao_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacao_analytics' AND policyname = 'Admins podem ver analytics') THEN
    CREATE POLICY "Admins podem ver analytics" ON notificacao_analytics
      FOR SELECT USING (EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacao_analytics' AND policyname = 'Service role pode inserir analytics') THEN
    CREATE POLICY "Service role pode inserir analytics" ON notificacao_analytics FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Register analytics event
CREATE OR REPLACE FUNCTION registar_evento_notificacao(
  p_notificacao_id UUID, p_evento TEXT, p_contexto JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE v_notif RECORD; v_event_id UUID; v_tempo_leitura INTEGER; v_tempo_acao INTEGER;
BEGIN
  SELECT * INTO v_notif FROM notificacoes_unificadas WHERE id = p_notificacao_id;
  IF FOUND THEN
    IF p_evento = 'read' THEN v_tempo_leitura := EXTRACT(EPOCH FROM (NOW() - v_notif.created_at))::integer; END IF;
    IF p_evento = 'action_taken' THEN v_tempo_acao := EXTRACT(EPOCH FROM (NOW() - v_notif.created_at))::integer; END IF;
  END IF;

  INSERT INTO notificacao_analytics (notificacao_id, utilizador_id, evento, tipo_notificacao, origem, canal, acao_id, contexto, tempo_ate_leitura, tempo_ate_acao)
  VALUES (p_notificacao_id, COALESCE(v_notif.user_id, (p_contexto->>'user_id')::uuid), p_evento, v_notif.type, v_notif.origem,
    COALESCE(p_contexto->>'canal', 'in_app'), p_contexto->>'acao_id', p_contexto, v_tempo_leitura, v_tempo_acao)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics metrics view
CREATE OR REPLACE VIEW notificacao_metricas AS
WITH eventos AS (
  SELECT DATE_TRUNC('day', created_at) AS dia, tipo_notificacao, origem, evento,
    COUNT(*) AS total,
    AVG(tempo_ate_leitura) FILTER (WHERE tempo_ate_leitura IS NOT NULL) AS media_tempo_leitura,
    AVG(tempo_ate_acao) FILTER (WHERE tempo_ate_acao IS NOT NULL) AS media_tempo_acao
  FROM notificacao_analytics WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at), tipo_notificacao, origem, evento
)
SELECT dia, tipo_notificacao, origem,
  SUM(total) FILTER (WHERE evento = 'created') AS criadas,
  SUM(total) FILTER (WHERE evento = 'delivered') AS entregues,
  SUM(total) FILTER (WHERE evento = 'viewed') AS visualizadas,
  SUM(total) FILTER (WHERE evento = 'read') AS lidas,
  SUM(total) FILTER (WHERE evento = 'clicked') AS clicadas,
  SUM(total) FILTER (WHERE evento = 'action_taken') AS acoes,
  CASE WHEN SUM(total) FILTER (WHERE evento = 'created') > 0
    THEN ROUND((SUM(total) FILTER (WHERE evento = 'read')::numeric / SUM(total) FILTER (WHERE evento = 'created')::numeric) * 100, 2)
    ELSE 0 END AS taxa_leitura,
  CASE WHEN SUM(total) FILTER (WHERE evento = 'created') > 0
    THEN ROUND((SUM(total) FILTER (WHERE evento = 'action_taken')::numeric / SUM(total) FILTER (WHERE evento = 'created')::numeric) * 100, 2)
    ELSE 0 END AS taxa_acao,
  ROUND(AVG(media_tempo_leitura)::numeric, 0) AS tempo_medio_leitura,
  ROUND(AVG(media_tempo_acao)::numeric, 0) AS tempo_medio_acao
FROM eventos GROUP BY dia, tipo_notificacao, origem ORDER BY dia DESC, criadas DESC;

-- Analytics dashboard function
CREATE OR REPLACE FUNCTION get_analytics_dashboard(p_dias INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE v_resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'resumo', (SELECT jsonb_build_object(
      'total_criadas', SUM(CASE WHEN evento = 'created' THEN 1 ELSE 0 END),
      'total_lidas', SUM(CASE WHEN evento = 'read' THEN 1 ELSE 0 END),
      'total_acoes', SUM(CASE WHEN evento = 'action_taken' THEN 1 ELSE 0 END),
      'taxa_leitura_media', ROUND((SUM(CASE WHEN evento = 'read' THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN evento = 'created' THEN 1 ELSE 0 END), 0)) * 100, 2),
      'tempo_medio_leitura', ROUND(AVG(tempo_ate_leitura)::numeric, 0)
    ) FROM notificacao_analytics WHERE created_at >= NOW() - (p_dias || ' days')::interval),
    'por_tipo', (SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT tipo_notificacao AS tipo, COUNT(*) FILTER (WHERE evento = 'created') AS criadas,
        COUNT(*) FILTER (WHERE evento = 'read') AS lidas,
        ROUND((COUNT(*) FILTER (WHERE evento = 'read')::numeric / NULLIF(COUNT(*) FILTER (WHERE evento = 'created'), 0)) * 100, 2) AS taxa_leitura
      FROM notificacao_analytics WHERE created_at >= NOW() - (p_dias || ' days')::interval AND tipo_notificacao IS NOT NULL
      GROUP BY tipo_notificacao ORDER BY criadas DESC LIMIT 10) t),
    'por_dia', (SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT DATE_TRUNC('day', created_at)::date AS dia, COUNT(*) FILTER (WHERE evento = 'created') AS criadas, COUNT(*) FILTER (WHERE evento = 'read') AS lidas
      FROM notificacao_analytics WHERE created_at >= NOW() - (p_dias || ' days')::interval
      GROUP BY DATE_TRUNC('day', created_at) ORDER BY dia DESC) t),
    'engagement_por_hora', (SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT EXTRACT(HOUR FROM created_at)::integer AS hora, COUNT(*) FILTER (WHERE evento = 'read') AS leituras
      FROM notificacao_analytics WHERE created_at >= NOW() - (p_dias || ' days')::interval
      GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hora) t)
  ) INTO v_resultado;
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics triggers for app_notificacoes
CREATE OR REPLACE FUNCTION trigger_analytics_notificacao_criada()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notificacao_analytics (notificacao_id, utilizador_id, evento, tipo_notificacao, origem, canal)
  VALUES (NEW.id, NEW.utilizador_id, 'created', NEW.tipo, 'app', 'in_app');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_app_notif_created ON app_notificacoes;
CREATE TRIGGER trigger_analytics_app_notif_created
  AFTER INSERT ON app_notificacoes FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_notificacao_criada();

CREATE OR REPLACE FUNCTION trigger_analytics_notificacao_lida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lida = TRUE AND (OLD.lida IS NULL OR OLD.lida = FALSE) THEN
    INSERT INTO notificacao_analytics (notificacao_id, utilizador_id, evento, tipo_notificacao, origem, canal, tempo_ate_leitura)
    VALUES (NEW.id, NEW.utilizador_id, 'read', NEW.tipo, 'app', 'in_app', EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::integer);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_app_notif_read ON app_notificacoes;
CREATE TRIGGER trigger_analytics_app_notif_read
  AFTER UPDATE ON app_notificacoes FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_notificacao_lida();

-- Analytics triggers for workspace notificacoes
CREATE OR REPLACE FUNCTION trigger_analytics_ws_notificacao_criada()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notificacao_analytics (notificacao_id, utilizador_id, evento, tipo_notificacao, origem, canal)
  VALUES (NEW.id, NEW.user_id, 'created', NEW.type, 'workspace', 'in_app');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_ws_notif_created ON notificacoes;
CREATE TRIGGER trigger_analytics_ws_notif_created
  AFTER INSERT ON notificacoes FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_ws_notificacao_criada();

CREATE OR REPLACE FUNCTION trigger_analytics_ws_notificacao_lida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND (OLD.read IS NULL OR OLD.read = FALSE) THEN
    INSERT INTO notificacao_analytics (notificacao_id, utilizador_id, evento, tipo_notificacao, origem, canal, tempo_ate_leitura)
    VALUES (NEW.id, NEW.user_id, 'read', NEW.type, 'workspace', 'in_app', EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::integer);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_ws_notif_read ON notificacoes;
CREATE TRIGGER trigger_analytics_ws_notif_read
  AFTER UPDATE ON notificacoes FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_ws_notificacao_lida();

COMMENT ON TABLE preferencias_notificacao IS 'Preferências de notificação por utilizador';
COMMENT ON TABLE notificacao_digest_log IS 'Log de envios de digest de notificações';
COMMENT ON TABLE notificacao_analytics IS 'Eventos de analytics de notificações';
COMMENT ON VIEW notificacao_metricas IS 'Métricas agregadas de notificações';
COMMENT ON FUNCTION utilizador_quer_notificacao IS 'Verifica se utilizador quer receber um tipo de notificação';
COMMENT ON FUNCTION get_notificacao_digest IS 'Obtém resumo de notificações para digest';
COMMENT ON FUNCTION get_analytics_dashboard IS 'Obtém dados para dashboard de analytics';


-- =====================================================
-- PART 7: EMAIL CONFIG UPDATE (20250207_email_config_gavinhogroup.sql)
-- Update email settings to use gavinhogroup.com domain
-- =====================================================

INSERT INTO email_config (email_principal, servidor_smtp, porta_smtp, usar_tls, ativo)
VALUES ('notificacoes@gavinhogroup.com', 'smtp.resend.com', 587, true, true)
ON CONFLICT (id) DO NOTHING;

UPDATE email_config
SET email_principal = 'notificacoes@gavinhogroup.com', servidor_smtp = 'smtp.resend.com',
    porta_smtp = 587, usar_tls = true, ativo = true, updated_at = NOW()
WHERE email_principal LIKE '%@gavinho.pt' OR email_principal IS NULL OR email_principal = '';

UPDATE email_config SET ativo = false, updated_at = NOW()
WHERE email_principal != 'notificacoes@gavinhogroup.com' AND ativo = true;

COMMENT ON TABLE email_config IS 'Configuração do servidor de email - usa Resend com domínio gavinhogroup.com';


-- =====================================================
-- PART 8: FIX NOTIFICATION EMAIL CONFIG (20250207_fix_notification_email_config.sql)
-- Replace app.settings with system_config table lookup
-- =====================================================

-- system_config already exists (2 rows) - ensure it's set up correctly
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

INSERT INTO system_config (key, value, description) VALUES
  ('supabase_url', '', 'URL do projeto Supabase (ex: https://xxx.supabase.co)'),
  ('supabase_service_key', '', 'Service role key do Supabase (para chamadas internas)')
ON CONFLICT (key) DO NOTHING;

-- Helper to read config
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE v_value TEXT;
BEGIN
  SELECT value INTO v_value FROM system_config WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Override send_notification_email to use system_config instead of app.settings
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


-- =====================================================
-- POST-MIGRATION: Configure system_config values
-- =====================================================
-- IMPORTANT: After running this migration, you must configure:
--
-- UPDATE system_config
-- SET value = 'https://vctcppuvqjstscbzdykn.supabase.co'
-- WHERE key = 'supabase_url';
--
-- UPDATE system_config
-- SET value = 'YOUR-SERVICE-ROLE-KEY'
-- WHERE key = 'supabase_service_key';
--
-- You can find the service role key in:
-- Supabase Dashboard > Project Settings > API > service_role key


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Objects created:
--   4 new tables: seeds_executados, preferencias_notificacao_email,
--                 preferencias_notificacao, notificacao_digest_log,
--                 notificacao_analytics
--   2 new views: notificacoes_unificadas, notificacao_metricas
--   25+ functions (CREATE OR REPLACE - safe to re-run)
--   10+ triggers (DROP IF EXISTS + CREATE - safe to re-run)
--   1 ALTER TABLE (projeto_atas.secao)
--   3 ALTER TABLE ADD COLUMN (app_notificacoes, notificacoes)
-- =====================================================
