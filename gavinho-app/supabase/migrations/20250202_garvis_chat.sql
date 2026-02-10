-- =====================================================
-- G.A.R.V.I.S. - Chat IA para Projetos
-- Gavinho Assistant for Responsive Virtual Intelligence Support
-- CORRIGIDO: model name, policies WITH CHECK, trigger function name
-- =====================================================

-- =====================================================
-- 0. Garantir que a função update_updated_at_column existe
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. Add is_bot column to utilizadores if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilizadores' AND column_name = 'is_bot'
  ) THEN
    ALTER TABLE utilizadores ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- 2. GARVIS bot user - skipped
-- The utilizadores table has auth constraints (utilizadores_team_requires_auth)
-- GARVIS works without a bot user row - chat logs stand alone
-- =====================================================

-- =====================================================
-- 3. Create GARVIS chat logs table
-- =====================================================
CREATE TABLE IF NOT EXISTS garvis_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  projeto_id UUID,
  topico_id UUID,

  -- Mensagens
  mensagem_utilizador_id UUID,
  mensagem_resposta_id UUID,

  -- Conteúdo original
  prompt_usuario TEXT NOT NULL,
  resposta_gerada TEXT NOT NULL,

  -- Contexto usado pelo modelo
  contexto_projeto JSONB DEFAULT '{}',

  -- Métricas
  modelo_usado TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  tokens_input INTEGER,
  tokens_output INTEGER,
  tempo_resposta_ms INTEGER,

  -- Feedback
  feedback_positivo BOOLEAN,
  feedback_comentario TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garvis_logs_projeto ON garvis_chat_logs(projeto_id);
CREATE INDEX IF NOT EXISTS idx_garvis_logs_created ON garvis_chat_logs(created_at DESC);

-- Enable RLS
ALTER TABLE garvis_chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy (com WITH CHECK para INSERT/UPDATE)
DROP POLICY IF EXISTS "garvis_logs_all" ON garvis_chat_logs;
CREATE POLICY "garvis_logs_all" ON garvis_chat_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. GARVIS configuration per project
-- =====================================================
CREATE TABLE IF NOT EXISTS garvis_config_projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Configurações
  ativo BOOLEAN DEFAULT TRUE,
  tom_resposta TEXT DEFAULT 'profissional', -- profissional, casual, formal
  idioma TEXT DEFAULT 'pt',
  max_tokens_resposta INTEGER DEFAULT 500,

  -- Contexto adicional
  instrucoes_customizadas TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(projeto_id)
);

CREATE INDEX IF NOT EXISTS idx_garvis_config_projeto ON garvis_config_projeto(projeto_id);

ALTER TABLE garvis_config_projeto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garvis_config_all" ON garvis_config_projeto;
CREATE POLICY "garvis_config_all" ON garvis_config_projeto FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at (usa update_updated_at_column - nome correto)
DROP TRIGGER IF EXISTS trigger_garvis_config_updated ON garvis_config_projeto;
CREATE TRIGGER trigger_garvis_config_updated
  BEFORE UPDATE ON garvis_config_projeto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation: garvis_chat_logs = GARVIS chat interaction logs
-- Documentation: garvis_config_projeto = GARVIS config per project
