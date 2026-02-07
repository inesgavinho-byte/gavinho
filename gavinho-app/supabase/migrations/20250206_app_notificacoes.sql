-- =====================================================
-- APP NOTIFICATIONS TABLE
-- Stores app-wide notifications for all users
-- Triggered by requisition submissions, task assignments, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS app_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target user
  utilizador_id UUID REFERENCES utilizadores(id) ON DELETE CASCADE,
  utilizador_email TEXT, -- Fallback if no user ID

  -- Content
  tipo TEXT NOT NULL, -- 'requisicao_nova', 'requisicao_aprovada', 'tarefa_atribuida', etc.
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,

  -- Source references
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  requisicao_id UUID,
  tarefa_id UUID,

  -- Metadata
  dados JSONB DEFAULT '{}', -- Additional data for the notification
  urgente BOOLEAN DEFAULT FALSE,

  -- Status
  lida BOOLEAN DEFAULT FALSE,
  data_leitura TIMESTAMPTZ,

  -- Email notification
  email_enviado BOOLEAN DEFAULT FALSE,
  data_email TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_utilizador ON app_notificacoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_email ON app_notificacoes(utilizador_email);
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_tipo ON app_notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_lida ON app_notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_obra ON app_notificacoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_app_notificacoes_created ON app_notificacoes(created_at DESC);

-- Enable RLS
ALTER TABLE app_notificacoes ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Utilizadores veem as suas notificacoes" ON app_notificacoes
  FOR SELECT USING (
    utilizador_id = auth.uid() OR
    utilizador_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Utilizadores podem marcar como lidas" ON app_notificacoes
  FOR UPDATE USING (
    utilizador_id = auth.uid() OR
    utilizador_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Service role can insert notifications
CREATE POLICY "Service role pode inserir" ON app_notificacoes
  FOR INSERT WITH CHECK (true);
