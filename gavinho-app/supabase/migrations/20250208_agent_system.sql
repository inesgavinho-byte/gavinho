-- ══════════════════════════════════════════════════════════════
-- GAVINHO Platform — Sistema de Agentes Autónomos para Email
-- Data: 2025-02-08
-- Descrição: Fila de processamento, ações de agentes, audit log,
--            embeddings para RAG, e notificações em tempo real
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. ENUM TYPES para taxonomia de emails
-- ══════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE email_domain AS ENUM (
    'comercial_financeiro',
    'projeto_design',
    'construcao_obra',
    'relacoes_comunicacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_category AS ENUM (
    'pedido_cotacao',
    'encomenda',
    'aviso_entrega',
    'faturacao',
    'proposta_financeira',
    'decisao_projeto',
    'licenciamento',
    'rfi',
    'progresso',
    'nao_conformidade',
    'subempreiteiro',
    'agendamento',
    'seguranca',
    'cliente',
    'fornecedor',
    'ata_reuniao',
    'interno'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_tier AS ENUM (
    'auto_execute',
    'auto_notify',
    'review_required',
    'escalate',
    'manual_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════
-- 2. FILA DE PROCESSAMENTO DE EMAIL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Identificadores Microsoft Graph
  graph_message_id TEXT NOT NULL,
  graph_resource_path TEXT,
  internet_message_id TEXT UNIQUE,
  conversation_id TEXT,

  -- Metadados do email
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  to_recipients JSONB,
  cc_recipients JSONB,
  received_at TIMESTAMPTZ,
  body_preview TEXT,
  body_html TEXT,
  body_text TEXT,
  has_attachments BOOLEAN DEFAULT false,
  importance TEXT DEFAULT 'normal',

  -- Estado de processamento
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending','fetching','fetched','classifying','routing',
               'acting','completed','failed','needs_review')
  ),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMPTZ,

  -- Classificação IA
  domain TEXT,
  category TEXT,
  subcategory TEXT,
  confidence DECIMAL(5,4),
  urgency TEXT CHECK (urgency IN ('critica', 'alta', 'media', 'baixa')),
  language_detected TEXT,
  summary_pt TEXT,
  extracted_entities JSONB,
  target_agent TEXT,

  -- Associações
  project_id UUID,
  obra_id UUID,
  supplier_id UUID,
  client_id UUID,

  -- Referência ao email original na obra_emails
  obra_email_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_epq_status ON email_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_epq_internet_msg ON email_processing_queue(internet_message_id);
CREATE INDEX IF NOT EXISTS idx_epq_conversation ON email_processing_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_epq_project ON email_processing_queue(project_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_obra ON email_processing_queue(obra_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_category ON email_processing_queue(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_epq_graph_msg ON email_processing_queue(graph_message_id);

-- RLS
ALTER TABLE email_processing_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "epq_all" ON email_processing_queue;
CREATE POLICY "epq_all" ON email_processing_queue FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 3. FILA DE AÇÕES DOS AGENTES
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Origem
  email_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  obra_email_id UUID,
  project_id UUID,
  obra_id UUID,
  source_agent TEXT NOT NULL,

  -- Definição da ação
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}',
  action_description TEXT,

  -- Classificação IA
  confidence DECIMAL(5,4),
  ai_reasoning TEXT,
  model_id TEXT,

  -- Risco e routing
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  approval_tier TEXT NOT NULL DEFAULT 'review_required' CHECK (approval_tier IN (
    'auto_execute','auto_notify','review_required','escalate','manual_only'
  )),

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','executed','failed','rolled_back','expired'
  )),

  -- Aprovação
  assigned_to UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),

  -- Execução
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Rollback
  is_reversible BOOLEAN DEFAULT true,
  rollback_payload JSONB,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aa_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_aa_email ON agent_actions(email_id);
CREATE INDEX IF NOT EXISTS idx_aa_project ON agent_actions(project_id);
CREATE INDEX IF NOT EXISTS idx_aa_approval ON agent_actions(approval_tier, status);
CREATE INDEX IF NOT EXISTS idx_aa_assigned ON agent_actions(assigned_to, status);

-- RLS
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aa_all" ON agent_actions;
CREATE POLICY "aa_all" ON agent_actions FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 4. LOG DE AUDITORIA IMUTÁVEL
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL,
  email_queue_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,

  -- Contexto IA
  model_id TEXT,
  input_hash TEXT,
  ai_reasoning TEXT,
  confidence DECIMAL(5,4),
  alternative_actions JSONB,

  -- Detalhes
  action_type TEXT,
  action_payload JSONB,
  outcome TEXT,
  outcome_details JSONB,
  error_message TEXT,

  -- Interação humana
  actor_id UUID,
  actor_role TEXT,
  human_override BOOLEAN DEFAULT false,
  human_feedback TEXT,

  -- Metadados
  execution_time_ms INTEGER,
  cost_usd DECIMAL(10,6),
  session_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aal_action ON ai_audit_log(action_id);
CREATE INDEX IF NOT EXISTS idx_aal_event ON ai_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_email ON ai_audit_log(email_queue_id);

-- RLS
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aal_all" ON ai_audit_log;
CREATE POLICY "aal_all" ON ai_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 5. NOTIFICAÇÕES DE AGENTES
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  channels TEXT[] DEFAULT ARRAY['in_app'],
  read_at TIMESTAMPTZ,
  action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL,
  email_queue_id UUID REFERENCES email_processing_queue(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_an_user ON agent_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_an_created ON agent_notifications(created_at DESC);

-- RLS
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "an_all" ON agent_notifications;
CREATE POLICY "an_all" ON agent_notifications FOR ALL USING (true) WITH CHECK (true);

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agent_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_actions;

-- ══════════════════════════════════════════════════
-- 6. CONFIGURAÇÃO DE SUBSCRIÇÕES GRAPH API
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS graph_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'created',
  notification_url TEXT NOT NULL,
  expiration_date TIMESTAMPTZ NOT NULL,
  client_state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  renewed_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE graph_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gs_all" ON graph_subscriptions;
CREATE POLICY "gs_all" ON graph_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- 7. FUNÇÃO DE MATCHING POR SIMILARIDADE (RAG)
-- ══════════════════════════════════════════════════

-- Nota: requer extensão pgvector habilitada
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Função para encontrar emails similares (quando pgvector estiver habilitado)
CREATE OR REPLACE FUNCTION match_similar_emails(
  p_from_address TEXT,
  p_subject TEXT,
  p_project_id UUID DEFAULT NULL,
  p_obra_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  subject TEXT,
  from_address TEXT,
  project_id UUID,
  obra_id UUID,
  category TEXT,
  received_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    epq.id,
    epq.subject,
    epq.from_address,
    epq.project_id,
    epq.obra_id,
    epq.category,
    epq.received_at
  FROM email_processing_queue epq
  WHERE epq.status = 'completed'
    AND (
      epq.from_address = p_from_address
      OR epq.project_id = p_project_id
      OR epq.obra_id = p_obra_id
    )
  ORDER BY epq.received_at DESC
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════
-- 8. TRIGGER PARA UPDATED_AT
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_epq_updated ON email_processing_queue;
CREATE TRIGGER trg_epq_updated BEFORE UPDATE ON email_processing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aa_updated ON agent_actions;
CREATE TRIGGER trg_aa_updated BEFORE UPDATE ON agent_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════
-- 9. TRIGGER PARA PROCESSAR NOVO EMAIL DA FILA
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_new_email_in_queue()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_email_queued', json_build_object(
    'id', NEW.id,
    'graph_message_id', NEW.graph_message_id,
    'status', NEW.status
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_email_queued ON email_processing_queue;
CREATE TRIGGER trg_new_email_queued
  AFTER INSERT ON email_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_email_in_queue();

-- ══════════════════════════════════════════════════
-- 10. VIEWS PARA MONITORIZAÇÃO
-- ══════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_agent_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE status = 'completed') as classificados,
  COUNT(*) FILTER (WHERE status = 'failed') as falhados,
  COUNT(*) FILTER (WHERE status = 'needs_review') as pendentes_revisao,
  AVG(confidence)::DECIMAL(5,4) as confianca_media,
  COUNT(DISTINCT category) as categorias_distintas
FROM email_processing_queue
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

CREATE OR REPLACE VIEW v_agent_actions_pending AS
SELECT
  aa.*,
  epq.subject as email_subject,
  epq.from_address as email_from,
  epq.summary_pt as email_summary,
  epq.category as email_category
FROM agent_actions aa
LEFT JOIN email_processing_queue epq ON epq.id = aa.email_id
WHERE aa.status = 'pending'
ORDER BY
  CASE aa.approval_tier
    WHEN 'auto_execute' THEN 1
    WHEN 'auto_notify' THEN 2
    WHEN 'review_required' THEN 3
    WHEN 'escalate' THEN 4
    WHEN 'manual_only' THEN 5
  END,
  aa.created_at ASC;

-- ══════════════════════════════════════════════════
-- 11. RENOVAÇÃO AUTOMÁTICA DA SUBSCRIÇÃO (pg_cron)
-- ══════════════════════════════════════════════════

DO $do$
BEGIN
  PERFORM cron.schedule(
    'renew-graph-subscription',
    '0 0 */2 * *',
    $$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/renew-subscription',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
  );
  RAISE NOTICE 'pg_cron job criado';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não disponível: %', SQLERRM;
END $do$;

-- Docs: email_processing_queue, agent_actions, ai_audit_log, agent_notifications, graph_subscriptions
