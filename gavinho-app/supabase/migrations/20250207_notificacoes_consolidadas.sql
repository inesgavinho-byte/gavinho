-- =====================================================
-- CONSOLIDAÇÃO DO SISTEMA DE NOTIFICAÇÕES
-- Unifica notificacoes (Teams) + app_notificacoes (Obras)
-- Adiciona agrupamento, ações inline e paginação
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPOS PARA AÇÕES INLINE
-- =====================================================

-- Adicionar campo de ações à tabela app_notificacoes
ALTER TABLE app_notificacoes
ADD COLUMN IF NOT EXISTS acoes JSONB DEFAULT '[]';

-- Adicionar campo de agrupamento
ALTER TABLE app_notificacoes
ADD COLUMN IF NOT EXISTS grupo_id TEXT;

-- Adicionar campo de ações à tabela notificacoes
ALTER TABLE notificacoes
ADD COLUMN IF NOT EXISTS acoes JSONB DEFAULT '[]';

-- Adicionar campo de agrupamento
ALTER TABLE notificacoes
ADD COLUMN IF NOT EXISTS grupo_id TEXT;

-- Index para agrupamento
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_grupo ON app_notificacoes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_grupo ON notificacoes(grupo_id);

-- =====================================================
-- 2. VISTA UNIFICADA DE NOTIFICAÇÕES
-- Combina ambas as tabelas num formato comum
-- =====================================================

CREATE OR REPLACE VIEW notificacoes_unificadas AS
-- Notificações do app (obras/materiais)
SELECT
  id,
  'app' AS origem,
  utilizador_id AS user_id,
  utilizador_email AS user_email,
  NULL::uuid AS sender_id,
  tipo AS type,
  titulo AS title,
  mensagem AS message,
  jsonb_build_object(
    'obra_id', obra_id,
    'requisicao_id', requisicao_id,
    'tarefa_id', tarefa_id
  ) || COALESCE(dados, '{}'::jsonb) AS context,
  CASE
    WHEN obra_id IS NOT NULL THEN '/obras/' || obra_id
    WHEN requisicao_id IS NOT NULL THEN '/requisicoes/' || requisicao_id
    WHEN tarefa_id IS NOT NULL THEN '/tarefas/' || tarefa_id
    ELSE NULL
  END AS link,
  lida AS read,
  data_leitura AS read_at,
  urgente AS urgent,
  acoes AS actions,
  grupo_id,
  created_at,
  created_at AS updated_at
FROM app_notificacoes

UNION ALL

-- Notificações do workspace (Teams-like)
SELECT
  id,
  'workspace' AS origem,
  user_id,
  NULL AS user_email,
  sender_id,
  type,
  title,
  message,
  context,
  link,
  read,
  read_at,
  FALSE AS urgent,
  acoes AS actions,
  grupo_id,
  created_at,
  updated_at
FROM notificacoes;

-- =====================================================
-- 3. FUNÇÃO: Obter notificações unificadas com paginação
-- =====================================================

CREATE OR REPLACE FUNCTION get_notificacoes_unificadas(
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_apenas_nao_lidas BOOLEAN DEFAULT FALSE,
  p_tipo TEXT DEFAULT NULL,
  p_origem TEXT DEFAULT NULL -- 'app', 'workspace', ou NULL para ambos
)
RETURNS TABLE (
  id UUID,
  origem TEXT,
  user_id UUID,
  user_email TEXT,
  sender_id UUID,
  sender_nome TEXT,
  sender_avatar TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  context JSONB,
  link TEXT,
  read BOOLEAN,
  read_at TIMESTAMPTZ,
  urgent BOOLEAN,
  actions JSONB,
  grupo_id TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.origem,
    n.user_id,
    n.user_email,
    n.sender_id,
    u.nome AS sender_nome,
    u.avatar_url AS sender_avatar,
    n.type,
    n.title,
    n.message,
    n.context,
    n.link,
    n.read,
    n.read_at,
    n.urgent,
    n.actions,
    n.grupo_id,
    n.created_at
  FROM notificacoes_unificadas n
  LEFT JOIN utilizadores u ON n.sender_id = u.id
  WHERE (n.user_id = p_user_id OR n.user_email = p_user_email)
    AND (NOT p_apenas_nao_lidas OR n.read = FALSE)
    AND (p_tipo IS NULL OR n.type = p_tipo)
    AND (p_origem IS NULL OR n.origem = p_origem)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNÇÃO: Agrupar notificações similares
-- =====================================================

CREATE OR REPLACE FUNCTION get_notificacoes_agrupadas(
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  grupo_key TEXT,
  type TEXT,
  count BIGINT,
  title TEXT,
  message TEXT,
  latest_id UUID,
  latest_created_at TIMESTAMPTZ,
  all_read BOOLEAN,
  ids UUID[],
  contextos JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH notifs AS (
    SELECT
      n.*,
      -- Criar chave de agrupamento: tipo + data (mesmo dia) + contexto similar
      n.type || '_' || DATE(n.created_at)::text || '_' ||
        COALESCE((n.context->>'obra_id')::text, (n.context->>'project')::text, 'general') AS grupo_key
    FROM notificacoes_unificadas n
    WHERE (n.user_id = p_user_id OR n.user_email = p_user_email)
  )
  SELECT
    g.grupo_key,
    g.type,
    COUNT(*)::BIGINT AS count,
    -- Título agregado
    CASE
      WHEN COUNT(*) > 1 THEN COUNT(*) || ' ' ||
        CASE g.type
          WHEN 'tarefa_atribuida' THEN 'tarefas atribuídas'
          WHEN 'tarefa_concluida' THEN 'tarefas concluídas'
          WHEN 'requisicao_nova' THEN 'novas requisições'
          WHEN 'material_aprovado' THEN 'materiais aprovados'
          WHEN 'mention' THEN 'menções'
          WHEN 'message' THEN 'novas mensagens'
          ELSE 'notificações'
        END
      ELSE MAX(g.title)
    END AS title,
    -- Mensagem do mais recente
    (ARRAY_AGG(g.message ORDER BY g.created_at DESC))[1] AS message,
    -- ID do mais recente
    (ARRAY_AGG(g.id ORDER BY g.created_at DESC))[1] AS latest_id,
    -- Data do mais recente
    MAX(g.created_at) AS latest_created_at,
    -- Se todos foram lidos
    BOOL_AND(g.read) AS all_read,
    -- Array de todos os IDs
    ARRAY_AGG(g.id ORDER BY g.created_at DESC) AS ids,
    -- Contextos agregados
    jsonb_agg(DISTINCT g.context) FILTER (WHERE g.context IS NOT NULL) AS contextos
  FROM notifs g
  GROUP BY g.grupo_key, g.type
  ORDER BY MAX(g.created_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNÇÃO: Contar notificações não lidas
-- =====================================================

CREATE OR REPLACE FUNCTION contar_notificacoes_unificadas_nao_lidas(
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  app BIGINT,
  workspace BIGINT,
  urgentes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE origem = 'app')::BIGINT AS app,
    COUNT(*) FILTER (WHERE origem = 'workspace')::BIGINT AS workspace,
    COUNT(*) FILTER (WHERE urgent = TRUE)::BIGINT AS urgentes
  FROM notificacoes_unificadas
  WHERE (user_id = p_user_id OR user_email = p_user_email)
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO: Marcar notificações como lidas (ambas tabelas)
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_notificacao_lida(
  p_notification_id UUID,
  p_origem TEXT DEFAULT NULL -- Se NULL, tenta ambas
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Tentar app_notificacoes
  IF p_origem IS NULL OR p_origem = 'app' THEN
    UPDATE app_notificacoes
    SET lida = TRUE, data_leitura = NOW()
    WHERE id = p_notification_id AND lida = FALSE;

    IF FOUND THEN v_updated := TRUE; END IF;
  END IF;

  -- Tentar notificacoes
  IF p_origem IS NULL OR p_origem = 'workspace' THEN
    UPDATE notificacoes
    SET read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND read = FALSE;

    IF FOUND THEN v_updated := TRUE; END IF;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNÇÃO: Marcar todas como lidas
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_todas_notificacoes_lidas_unificado(
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (app_count INTEGER, workspace_count INTEGER) AS $$
DECLARE
  v_app_count INTEGER := 0;
  v_workspace_count INTEGER := 0;
BEGIN
  -- Marcar app_notificacoes
  UPDATE app_notificacoes
  SET lida = TRUE, data_leitura = NOW()
  WHERE (utilizador_id = p_user_id OR utilizador_email = p_user_email)
    AND lida = FALSE;
  GET DIAGNOSTICS v_app_count = ROW_COUNT;

  -- Marcar notificacoes
  UPDATE notificacoes
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
  GET DIAGNOSTICS v_workspace_count = ROW_COUNT;

  RETURN QUERY SELECT v_app_count, v_workspace_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNÇÃO: Executar ação de notificação
-- =====================================================

CREATE OR REPLACE FUNCTION executar_acao_notificacao(
  p_notification_id UUID,
  p_acao_id TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_notif RECORD;
  v_acao JSONB;
  v_resultado JSONB;
BEGIN
  -- Buscar notificação (tentar ambas tabelas)
  SELECT * INTO v_notif FROM app_notificacoes WHERE id = p_notification_id;

  IF NOT FOUND THEN
    SELECT * INTO v_notif FROM notificacoes WHERE id = p_notification_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notificação não encontrada');
  END IF;

  -- Encontrar a ação
  SELECT elem INTO v_acao
  FROM jsonb_array_elements(COALESCE(v_notif.acoes, '[]'::jsonb)) elem
  WHERE elem->>'id' = p_acao_id;

  IF v_acao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ação não encontrada');
  END IF;

  -- Executar baseado no tipo de ação
  CASE v_acao->>'tipo'
    WHEN 'aprovar_requisicao' THEN
      UPDATE requisicoes_materiais
      SET estado = 'aprovado', aprovado_por = p_user_id, data_aprovacao = NOW()
      WHERE id = (v_acao->>'requisicao_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Requisição aprovada');

    WHEN 'rejeitar_requisicao' THEN
      UPDATE requisicoes_materiais
      SET estado = 'rejeitado', aprovado_por = p_user_id, data_aprovacao = NOW()
      WHERE id = (v_acao->>'requisicao_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Requisição rejeitada');

    WHEN 'concluir_tarefa' THEN
      UPDATE tarefas
      SET estado = 'concluida', data_conclusao = NOW()
      WHERE id = (v_acao->>'tarefa_id')::uuid;
      v_resultado := jsonb_build_object('success', true, 'message', 'Tarefa concluída');

    WHEN 'arquivar' THEN
      -- Marcar como lida (arquivada)
      PERFORM marcar_notificacao_lida(p_notification_id, NULL);
      v_resultado := jsonb_build_object('success', true, 'message', 'Notificação arquivada');

    ELSE
      v_resultado := jsonb_build_object('success', false, 'error', 'Tipo de ação não suportado');
  END CASE;

  -- Marcar ação como executada
  IF (v_resultado->>'success')::boolean THEN
    -- Atualizar o array de ações para marcar esta como executada
    UPDATE app_notificacoes
    SET acoes = (
      SELECT jsonb_agg(
        CASE WHEN elem->>'id' = p_acao_id
        THEN elem || '{"executada": true, "executada_em": "' || NOW()::text || '", "executada_por": "' || p_user_id::text || '"}'::jsonb
        ELSE elem END
      )
      FROM jsonb_array_elements(acoes) elem
    )
    WHERE id = p_notification_id;

    UPDATE notificacoes
    SET acoes = (
      SELECT jsonb_agg(
        CASE WHEN elem->>'id' = p_acao_id
        THEN elem || '{"executada": true, "executada_em": "' || NOW()::text || '", "executada_por": "' || p_user_id::text || '"}'::jsonb
        ELSE elem END
      )
      FROM jsonb_array_elements(acoes) elem
    )
    WHERE id = p_notification_id;
  END IF;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGER: Auto-adicionar ações baseado no tipo
-- =====================================================

CREATE OR REPLACE FUNCTION auto_adicionar_acoes_notificacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Adicionar ações baseado no tipo de notificação
  CASE NEW.tipo
    WHEN 'requisicao_nova' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object(
          'id', 'aprovar_' || NEW.id,
          'tipo', 'aprovar_requisicao',
          'label', 'Aprovar',
          'icon', 'check',
          'color', 'green',
          'requisicao_id', NEW.requisicao_id
        ),
        jsonb_build_object(
          'id', 'rejeitar_' || NEW.id,
          'tipo', 'rejeitar_requisicao',
          'label', 'Rejeitar',
          'icon', 'x',
          'color', 'red',
          'requisicao_id', NEW.requisicao_id
        )
      );

    WHEN 'tarefa_atribuida' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object(
          'id', 'concluir_' || NEW.id,
          'tipo', 'concluir_tarefa',
          'label', 'Concluir',
          'icon', 'check',
          'color', 'green',
          'tarefa_id', NEW.tarefa_id
        ),
        jsonb_build_object(
          'id', 'ver_' || NEW.id,
          'tipo', 'navegar',
          'label', 'Ver Detalhes',
          'icon', 'eye',
          'color', 'blue',
          'link', '/tarefas/' || NEW.tarefa_id
        )
      );

    WHEN 'aprovacao_pendente' THEN
      NEW.acoes := jsonb_build_array(
        jsonb_build_object(
          'id', 'aprovar_' || NEW.id,
          'tipo', 'aprovar_requisicao',
          'label', 'Aprovar',
          'icon', 'check',
          'color', 'green',
          'requisicao_id', NEW.requisicao_id
        ),
        jsonb_build_object(
          'id', 'rejeitar_' || NEW.id,
          'tipo', 'rejeitar_requisicao',
          'label', 'Rejeitar',
          'icon', 'x',
          'color', 'red',
          'requisicao_id', NEW.requisicao_id
        )
      );

    ELSE
      -- Ação padrão de arquivar
      NEW.acoes := jsonb_build_array(
        jsonb_build_object(
          'id', 'arquivar_' || NEW.id,
          'tipo', 'arquivar',
          'label', 'Arquivar',
          'icon', 'archive',
          'color', 'gray'
        )
      );
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para novas notificações
DROP TRIGGER IF EXISTS trigger_auto_acoes_app_notificacoes ON app_notificacoes;
CREATE TRIGGER trigger_auto_acoes_app_notificacoes
  BEFORE INSERT ON app_notificacoes
  FOR EACH ROW
  WHEN (NEW.acoes IS NULL OR NEW.acoes = '[]'::jsonb)
  EXECUTE FUNCTION auto_adicionar_acoes_notificacao();

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================

COMMENT ON VIEW notificacoes_unificadas IS 'Vista que combina notificacoes (Teams) e app_notificacoes (Obras)';
COMMENT ON FUNCTION get_notificacoes_unificadas IS 'Obtém notificações unificadas com paginação e filtros';
COMMENT ON FUNCTION get_notificacoes_agrupadas IS 'Agrupa notificações similares por tipo e data';
COMMENT ON FUNCTION executar_acao_notificacao IS 'Executa uma ação inline de notificação';
COMMENT ON FUNCTION auto_adicionar_acoes_notificacao IS 'Adiciona automaticamente ações às notificações baseado no tipo';
