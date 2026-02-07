-- =====================================================
-- NICE TO HAVE FEATURES
-- 8. Preferências por tipo de notificação
-- 9. Resumo diário por email
-- 10. Analytics de notificações
-- =====================================================

-- =====================================================
-- 8. PREFERÊNCIAS POR TIPO DE NOTIFICAÇÃO
-- =====================================================

-- Melhorar tabela de preferências existente
ALTER TABLE preferencias_notificacao_email
ADD COLUMN IF NOT EXISTS tipos_silenciados TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS canais_silenciados UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS obras_silenciadas UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS horario_silencio_inicio TIME,
ADD COLUMN IF NOT EXISTS horario_silencio_fim TIME,
ADD COLUMN IF NOT EXISTS dias_silencio INTEGER[] DEFAULT '{}'; -- 0=Dom, 1=Seg, etc.

-- Criar tabela caso não exista (para novas instalações)
CREATE TABLE IF NOT EXISTS preferencias_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID UNIQUE NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

  -- Preferências gerais
  notificacoes_ativadas BOOLEAN DEFAULT TRUE,
  som_ativado BOOLEAN DEFAULT TRUE,
  push_ativado BOOLEAN DEFAULT TRUE,

  -- Preferências de email
  email_ativado BOOLEAN DEFAULT TRUE,
  email_frequencia TEXT DEFAULT 'realtime' CHECK (email_frequencia IN ('realtime', 'hourly', 'daily', 'weekly', 'never')),
  email_hora_digest INTEGER DEFAULT 9, -- Hora para envio do digest (0-23)

  -- Tipos silenciados (não receber notificações destes tipos)
  tipos_silenciados TEXT[] DEFAULT '{}',

  -- Preferências por tipo específico (JSONB para flexibilidade)
  -- Estrutura: { "tipo": { "app": true, "email": false, "push": true } }
  preferencias_tipo JSONB DEFAULT '{}'::jsonb,

  -- Canais/Obras silenciados
  canais_silenciados UUID[] DEFAULT '{}',
  obras_silenciadas UUID[] DEFAULT '{}',

  -- Modo não perturbar
  dnd_ativado BOOLEAN DEFAULT FALSE,
  dnd_inicio TIME DEFAULT '22:00',
  dnd_fim TIME DEFAULT '08:00',
  dnd_dias INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- Todos os dias por defeito

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pref_notif_user ON preferencias_notificacao(utilizador_id);

-- RLS
ALTER TABLE preferencias_notificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizadores veem as suas preferencias_notificacao" ON preferencias_notificacao
  FOR SELECT USING (utilizador_id = auth.uid());

CREATE POLICY "Utilizadores podem atualizar preferencias_notificacao" ON preferencias_notificacao
  FOR UPDATE USING (utilizador_id = auth.uid());

CREATE POLICY "Utilizadores podem inserir preferencias_notificacao" ON preferencias_notificacao
  FOR INSERT WITH CHECK (utilizador_id = auth.uid());

-- Função para verificar se utilizador quer receber notificação
CREATE OR REPLACE FUNCTION utilizador_quer_notificacao(
  p_utilizador_id UUID,
  p_tipo TEXT,
  p_canal TEXT DEFAULT 'app' -- 'app', 'email', 'push'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_tipo_prefs JSONB;
  v_now TIME;
  v_dia_semana INTEGER;
BEGIN
  -- Buscar preferências
  SELECT * INTO v_prefs
  FROM preferencias_notificacao
  WHERE utilizador_id = p_utilizador_id;

  -- Se não tem preferências, permite tudo
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Verificar se notificações estão globalmente desativadas
  IF NOT v_prefs.notificacoes_ativadas THEN
    RETURN FALSE;
  END IF;

  -- Verificar canal específico
  IF p_canal = 'email' AND NOT v_prefs.email_ativado THEN
    RETURN FALSE;
  END IF;

  IF p_canal = 'push' AND NOT v_prefs.push_ativado THEN
    RETURN FALSE;
  END IF;

  -- Verificar se tipo está silenciado
  IF p_tipo = ANY(v_prefs.tipos_silenciados) THEN
    RETURN FALSE;
  END IF;

  -- Verificar preferências específicas por tipo
  v_tipo_prefs := v_prefs.preferencias_tipo->p_tipo;
  IF v_tipo_prefs IS NOT NULL THEN
    IF (v_tipo_prefs->>p_canal)::boolean = FALSE THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar modo DND
  IF v_prefs.dnd_ativado THEN
    v_now := CURRENT_TIME;
    v_dia_semana := EXTRACT(DOW FROM CURRENT_DATE)::integer;

    -- Verificar se estamos no horário DND
    IF v_dia_semana = ANY(v_prefs.dnd_dias) THEN
      IF v_prefs.dnd_inicio > v_prefs.dnd_fim THEN
        -- Horário noturno (ex: 22:00 - 08:00)
        IF v_now >= v_prefs.dnd_inicio OR v_now < v_prefs.dnd_fim THEN
          RETURN FALSE;
        END IF;
      ELSE
        -- Horário diurno
        IF v_now >= v_prefs.dnd_inicio AND v_now < v_prefs.dnd_fim THEN
          RETURN FALSE;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para silenciar/ativar tipo de notificação
CREATE OR REPLACE FUNCTION toggle_tipo_notificacao(
  p_utilizador_id UUID,
  p_tipo TEXT,
  p_silenciar BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Garantir que utilizador tem preferências
  INSERT INTO preferencias_notificacao (utilizador_id)
  VALUES (p_utilizador_id)
  ON CONFLICT (utilizador_id) DO NOTHING;

  IF p_silenciar THEN
    UPDATE preferencias_notificacao
    SET tipos_silenciados = array_append(
      array_remove(tipos_silenciados, p_tipo),
      p_tipo
    ),
    updated_at = NOW()
    WHERE utilizador_id = p_utilizador_id;
  ELSE
    UPDATE preferencias_notificacao
    SET tipos_silenciados = array_remove(tipos_silenciados, p_tipo),
    updated_at = NOW()
    WHERE utilizador_id = p_utilizador_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RESUMO DIÁRIO POR EMAIL
-- =====================================================

-- Tabela para controlar envios de digest
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

-- Função para obter resumo de notificações do período
CREATE OR REPLACE FUNCTION get_notificacao_digest(
  p_utilizador_id UUID,
  p_periodo TEXT DEFAULT 'daily' -- 'hourly', 'daily', 'weekly'
)
RETURNS TABLE (
  tipo TEXT,
  titulo TEXT,
  contagem BIGINT,
  mais_recente TIMESTAMPTZ,
  exemplos JSONB
) AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
BEGIN
  -- Calcular início do período
  CASE p_periodo
    WHEN 'hourly' THEN v_inicio := NOW() - INTERVAL '1 hour';
    WHEN 'daily' THEN v_inicio := NOW() - INTERVAL '1 day';
    WHEN 'weekly' THEN v_inicio := NOW() - INTERVAL '1 week';
    ELSE v_inicio := NOW() - INTERVAL '1 day';
  END CASE;

  RETURN QUERY
  WITH notifs AS (
    SELECT
      n.type,
      n.title,
      n.message,
      n.created_at,
      n.read
    FROM notificacoes_unificadas n
    WHERE (n.user_id = p_utilizador_id OR n.user_email = (
      SELECT email FROM utilizadores WHERE id = p_utilizador_id
    ))
    AND n.created_at >= v_inicio
    AND n.read = FALSE
  )
  SELECT
    n.type,
    COALESCE(
      (SELECT label FROM (VALUES
        ('mention', 'Menções'),
        ('message', 'Mensagens'),
        ('tarefa_atribuida', 'Tarefas Atribuídas'),
        ('tarefa_concluida', 'Tarefas Concluídas'),
        ('requisicao_nova', 'Novas Requisições'),
        ('material_aprovado', 'Materiais Aprovados'),
        ('aprovacao_pendente', 'Aprovações Pendentes')
      ) AS t(tipo, label) WHERE t.tipo = n.type),
      'Notificações'
    ) AS titulo,
    COUNT(*)::BIGINT AS contagem,
    MAX(n.created_at) AS mais_recente,
    jsonb_agg(
      jsonb_build_object(
        'title', n.title,
        'message', LEFT(n.message, 100),
        'created_at', n.created_at
      ) ORDER BY n.created_at DESC
    ) FILTER (WHERE n.created_at >= v_inicio) AS exemplos
  FROM notifs n
  GROUP BY n.type
  ORDER BY contagem DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar digests pendentes (para pg_cron ou edge function)
CREATE OR REPLACE FUNCTION processar_digests_pendentes()
RETURNS TABLE (
  utilizador_id UUID,
  email TEXT,
  frequencia TEXT,
  total_nao_lidas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH usuarios_digest AS (
    SELECT
      p.utilizador_id,
      u.email,
      p.email_frequencia,
      p.email_hora_digest
    FROM preferencias_notificacao p
    JOIN utilizadores u ON p.utilizador_id = u.id
    WHERE p.email_ativado = TRUE
      AND p.email_frequencia IN ('daily', 'weekly')
      -- Verificar se é hora de enviar
      AND (
        (p.email_frequencia = 'daily' AND
         EXTRACT(HOUR FROM NOW()) = p.email_hora_digest AND
         NOT EXISTS (
           SELECT 1 FROM notificacao_digest_log l
           WHERE l.utilizador_id = p.utilizador_id
             AND l.tipo = 'daily'
             AND l.enviado_em >= NOW() - INTERVAL '23 hours'
         )
        )
        OR
        (p.email_frequencia = 'weekly' AND
         EXTRACT(DOW FROM NOW()) = 1 AND -- Segunda-feira
         EXTRACT(HOUR FROM NOW()) = p.email_hora_digest AND
         NOT EXISTS (
           SELECT 1 FROM notificacao_digest_log l
           WHERE l.utilizador_id = p.utilizador_id
             AND l.tipo = 'weekly'
             AND l.enviado_em >= NOW() - INTERVAL '6 days'
         )
        )
      )
  )
  SELECT
    ud.utilizador_id,
    ud.email,
    ud.email_frequencia,
    COUNT(*)::BIGINT AS total_nao_lidas
  FROM usuarios_digest ud
  LEFT JOIN notificacoes_unificadas n ON
    (n.user_id = ud.utilizador_id OR n.user_email = ud.email)
    AND n.read = FALSE
  GROUP BY ud.utilizador_id, ud.email, ud.email_frequencia
  HAVING COUNT(*) > 0; -- Só enviar se houver notificações não lidas
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. ANALYTICS DE NOTIFICAÇÕES
-- =====================================================

-- Tabela de eventos de analytics
CREATE TABLE IF NOT EXISTS notificacao_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id UUID,
  utilizador_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,

  -- Tipo de evento
  evento TEXT NOT NULL CHECK (evento IN (
    'created',      -- Notificação criada
    'delivered',    -- Entregue (real-time)
    'viewed',       -- Vista (painel aberto)
    'read',         -- Marcada como lida
    'clicked',      -- Link clicado
    'action_taken', -- Ação executada
    'dismissed',    -- Descartada
    'email_sent',   -- Email enviado
    'email_opened', -- Email aberto (tracking pixel)
    'email_clicked' -- Link do email clicado
  )),

  -- Metadados
  tipo_notificacao TEXT,
  origem TEXT, -- 'app', 'workspace'
  canal TEXT,  -- 'in_app', 'email', 'push'
  acao_id TEXT, -- Se evento = 'action_taken'

  -- Contexto
  contexto JSONB DEFAULT '{}',

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tempo_ate_leitura INTEGER, -- Segundos desde criação até leitura
  tempo_ate_acao INTEGER     -- Segundos desde criação até ação
);

-- Índices para análise
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON notificacao_analytics(evento);
CREATE INDEX IF NOT EXISTS idx_analytics_tipo ON notificacao_analytics(tipo_notificacao);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON notificacao_analytics(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON notificacao_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_notif ON notificacao_analytics(notificacao_id);

-- RLS
ALTER TABLE notificacao_analytics ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver analytics (ou service role)
CREATE POLICY "Admins podem ver analytics" ON notificacao_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role pode inserir
CREATE POLICY "Service role pode inserir analytics" ON notificacao_analytics
  FOR INSERT WITH CHECK (true);

-- Função para registar evento de analytics
CREATE OR REPLACE FUNCTION registar_evento_notificacao(
  p_notificacao_id UUID,
  p_evento TEXT,
  p_contexto JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notif RECORD;
  v_event_id UUID;
  v_tempo_criacao TIMESTAMPTZ;
  v_tempo_leitura INTEGER;
  v_tempo_acao INTEGER;
BEGIN
  -- Buscar info da notificação
  SELECT * INTO v_notif
  FROM notificacoes_unificadas
  WHERE id = p_notificacao_id;

  IF FOUND THEN
    v_tempo_criacao := v_notif.created_at;

    -- Calcular tempos
    IF p_evento = 'read' THEN
      v_tempo_leitura := EXTRACT(EPOCH FROM (NOW() - v_tempo_criacao))::integer;
    ELSIF p_evento = 'action_taken' THEN
      v_tempo_acao := EXTRACT(EPOCH FROM (NOW() - v_tempo_criacao))::integer;
    END IF;
  END IF;

  INSERT INTO notificacao_analytics (
    notificacao_id,
    utilizador_id,
    evento,
    tipo_notificacao,
    origem,
    canal,
    acao_id,
    contexto,
    tempo_ate_leitura,
    tempo_ate_acao
  ) VALUES (
    p_notificacao_id,
    COALESCE(v_notif.user_id, (p_contexto->>'user_id')::uuid),
    p_evento,
    v_notif.type,
    v_notif.origem,
    COALESCE(p_contexto->>'canal', 'in_app'),
    p_contexto->>'acao_id',
    p_contexto,
    v_tempo_leitura,
    v_tempo_acao
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para métricas de analytics
CREATE OR REPLACE VIEW notificacao_metricas AS
WITH eventos AS (
  SELECT
    DATE_TRUNC('day', created_at) AS dia,
    tipo_notificacao,
    origem,
    evento,
    COUNT(*) AS total,
    AVG(tempo_ate_leitura) FILTER (WHERE tempo_ate_leitura IS NOT NULL) AS media_tempo_leitura,
    AVG(tempo_ate_acao) FILTER (WHERE tempo_ate_acao IS NOT NULL) AS media_tempo_acao
  FROM notificacao_analytics
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at), tipo_notificacao, origem, evento
)
SELECT
  dia,
  tipo_notificacao,
  origem,
  SUM(total) FILTER (WHERE evento = 'created') AS criadas,
  SUM(total) FILTER (WHERE evento = 'delivered') AS entregues,
  SUM(total) FILTER (WHERE evento = 'viewed') AS visualizadas,
  SUM(total) FILTER (WHERE evento = 'read') AS lidas,
  SUM(total) FILTER (WHERE evento = 'clicked') AS clicadas,
  SUM(total) FILTER (WHERE evento = 'action_taken') AS acoes,
  -- Taxa de leitura
  CASE
    WHEN SUM(total) FILTER (WHERE evento = 'created') > 0
    THEN ROUND(
      (SUM(total) FILTER (WHERE evento = 'read')::numeric /
       SUM(total) FILTER (WHERE evento = 'created')::numeric) * 100, 2
    )
    ELSE 0
  END AS taxa_leitura,
  -- Taxa de ação
  CASE
    WHEN SUM(total) FILTER (WHERE evento = 'created') > 0
    THEN ROUND(
      (SUM(total) FILTER (WHERE evento = 'action_taken')::numeric /
       SUM(total) FILTER (WHERE evento = 'created')::numeric) * 100, 2
    )
    ELSE 0
  END AS taxa_acao,
  -- Tempo médio até leitura (segundos)
  ROUND(AVG(media_tempo_leitura)::numeric, 0) AS tempo_medio_leitura,
  -- Tempo médio até ação (segundos)
  ROUND(AVG(media_tempo_acao)::numeric, 0) AS tempo_medio_acao
FROM eventos
GROUP BY dia, tipo_notificacao, origem
ORDER BY dia DESC, criadas DESC;

-- Função para obter dashboard de analytics
CREATE OR REPLACE FUNCTION get_analytics_dashboard(
  p_dias INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'resumo', (
      SELECT jsonb_build_object(
        'total_criadas', SUM(CASE WHEN evento = 'created' THEN 1 ELSE 0 END),
        'total_lidas', SUM(CASE WHEN evento = 'read' THEN 1 ELSE 0 END),
        'total_acoes', SUM(CASE WHEN evento = 'action_taken' THEN 1 ELSE 0 END),
        'taxa_leitura_media', ROUND(
          (SUM(CASE WHEN evento = 'read' THEN 1 ELSE 0 END)::numeric /
           NULLIF(SUM(CASE WHEN evento = 'created' THEN 1 ELSE 0 END), 0)) * 100, 2
        ),
        'tempo_medio_leitura', ROUND(AVG(tempo_ate_leitura)::numeric, 0)
      )
      FROM notificacao_analytics
      WHERE created_at >= NOW() - (p_dias || ' days')::interval
    ),
    'por_tipo', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          tipo_notificacao AS tipo,
          COUNT(*) FILTER (WHERE evento = 'created') AS criadas,
          COUNT(*) FILTER (WHERE evento = 'read') AS lidas,
          ROUND(
            (COUNT(*) FILTER (WHERE evento = 'read')::numeric /
             NULLIF(COUNT(*) FILTER (WHERE evento = 'created'), 0)) * 100, 2
          ) AS taxa_leitura
        FROM notificacao_analytics
        WHERE created_at >= NOW() - (p_dias || ' days')::interval
          AND tipo_notificacao IS NOT NULL
        GROUP BY tipo_notificacao
        ORDER BY criadas DESC
        LIMIT 10
      ) t
    ),
    'por_dia', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          DATE_TRUNC('day', created_at)::date AS dia,
          COUNT(*) FILTER (WHERE evento = 'created') AS criadas,
          COUNT(*) FILTER (WHERE evento = 'read') AS lidas
        FROM notificacao_analytics
        WHERE created_at >= NOW() - (p_dias || ' days')::interval
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY dia DESC
      ) t
    ),
    'engagement_por_hora', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          EXTRACT(HOUR FROM created_at)::integer AS hora,
          COUNT(*) FILTER (WHERE evento = 'read') AS leituras
        FROM notificacao_analytics
        WHERE created_at >= NOW() - (p_dias || ' days')::interval
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hora
      ) t
    )
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS PARA ANALYTICS AUTOMÁTICO
-- =====================================================

-- Trigger para registar criação de notificação (app_notificacoes)
CREATE OR REPLACE FUNCTION trigger_analytics_notificacao_criada()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notificacao_analytics (
    notificacao_id,
    utilizador_id,
    evento,
    tipo_notificacao,
    origem,
    canal
  ) VALUES (
    NEW.id,
    NEW.utilizador_id,
    'created',
    NEW.tipo,
    'app',
    'in_app'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_app_notif_created ON app_notificacoes;
CREATE TRIGGER trigger_analytics_app_notif_created
  AFTER INSERT ON app_notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_notificacao_criada();

-- Trigger para registar leitura de notificação (app_notificacoes)
CREATE OR REPLACE FUNCTION trigger_analytics_notificacao_lida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lida = TRUE AND (OLD.lida IS NULL OR OLD.lida = FALSE) THEN
    INSERT INTO notificacao_analytics (
      notificacao_id,
      utilizador_id,
      evento,
      tipo_notificacao,
      origem,
      canal,
      tempo_ate_leitura
    ) VALUES (
      NEW.id,
      NEW.utilizador_id,
      'read',
      NEW.tipo,
      'app',
      'in_app',
      EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::integer
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_app_notif_read ON app_notificacoes;
CREATE TRIGGER trigger_analytics_app_notif_read
  AFTER UPDATE ON app_notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_notificacao_lida();

-- Trigger para workspace notificacoes
CREATE OR REPLACE FUNCTION trigger_analytics_ws_notificacao_criada()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notificacao_analytics (
    notificacao_id,
    utilizador_id,
    evento,
    tipo_notificacao,
    origem,
    canal
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'created',
    NEW.type,
    'workspace',
    'in_app'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_ws_notif_created ON notificacoes;
CREATE TRIGGER trigger_analytics_ws_notif_created
  AFTER INSERT ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_ws_notificacao_criada();

CREATE OR REPLACE FUNCTION trigger_analytics_ws_notificacao_lida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND (OLD.read IS NULL OR OLD.read = FALSE) THEN
    INSERT INTO notificacao_analytics (
      notificacao_id,
      utilizador_id,
      evento,
      tipo_notificacao,
      origem,
      canal,
      tempo_ate_leitura
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'read',
      NEW.type,
      'workspace',
      'in_app',
      EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::integer
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_analytics_ws_notif_read ON notificacoes;
CREATE TRIGGER trigger_analytics_ws_notif_read
  AFTER UPDATE ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_ws_notificacao_lida();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE preferencias_notificacao IS 'Preferências de notificação por utilizador';
COMMENT ON TABLE notificacao_digest_log IS 'Log de envios de digest de notificações';
COMMENT ON TABLE notificacao_analytics IS 'Eventos de analytics de notificações';
COMMENT ON VIEW notificacao_metricas IS 'Métricas agregadas de notificações';
COMMENT ON FUNCTION utilizador_quer_notificacao IS 'Verifica se utilizador quer receber um tipo de notificação';
COMMENT ON FUNCTION get_notificacao_digest IS 'Obtém resumo de notificações para digest';
COMMENT ON FUNCTION get_analytics_dashboard IS 'Obtém dados para dashboard de analytics';
