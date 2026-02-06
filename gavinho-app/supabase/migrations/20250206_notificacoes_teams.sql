-- =====================================================
-- NOTIFICACOES TABLE - Teams-like notification system
-- Sistema de notificações estilo Microsoft Teams
-- =====================================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS notificacoes CASCADE;

-- Create the notifications table
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target user (who receives the notification)
  user_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

  -- Sender (who triggered the notification, optional for system notifications)
  sender_id UUID REFERENCES utilizadores(id) ON DELETE SET NULL,

  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'mention',    -- @menções
    'message',    -- Novas mensagens
    'comment',    -- Comentários em atas/documentos
    'task',       -- Tarefas atribuídas
    'project',    -- Atualizações de projeto
    'approval',   -- Aprovações pendentes
    'system'      -- Notificações do sistema
  )),

  -- Content
  title TEXT,                    -- Título da notificação (opcional)
  message TEXT NOT NULL,         -- Mensagem principal

  -- Context (project, channel, etc.)
  context JSONB DEFAULT '{}',    -- { project: string, channel: string, ... }

  -- Link to navigate to
  link TEXT,                     -- URL interna para navegar

  -- Status
  read BOOLEAN DEFAULT FALSE,    -- Se foi lida
  read_at TIMESTAMPTZ,           -- Quando foi lida

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for user queries (most common)
CREATE INDEX idx_notificacoes_user_id ON notificacoes(user_id);

-- Index for unread notifications
CREATE INDEX idx_notificacoes_user_unread ON notificacoes(user_id, read) WHERE read = FALSE;

-- Index for notification type filtering
CREATE INDEX idx_notificacoes_type ON notificacoes(type);

-- Index for mentions filter
CREATE INDEX idx_notificacoes_mentions ON notificacoes(user_id, type) WHERE type = 'mention';

-- Index for ordering by date
CREATE INDEX idx_notificacoes_created_at ON notificacoes(created_at DESC);

-- Index for sender lookup
CREATE INDEX idx_notificacoes_sender_id ON notificacoes(sender_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notificacoes FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notificacoes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notificacoes FOR DELETE
  USING (user_id = auth.uid());

-- Service role and system can insert notifications for any user
CREATE POLICY "Service role can insert notifications"
  ON notificacoes FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Set read_at when marking as read
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
DROP TRIGGER IF EXISTS trigger_notificacoes_updated_at ON notificacoes;
CREATE TRIGGER trigger_notificacoes_updated_at
  BEFORE UPDATE ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_notificacoes_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION criar_notificacao(
  p_user_id UUID,
  p_type TEXT,
  p_message TEXT,
  p_title TEXT DEFAULT NULL,
  p_sender_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}',
  p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
  VALUES (p_user_id, p_sender_id, p_type, p_title, p_message, p_context, p_link)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION marcar_todas_notificacoes_lidas(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notificacoes
  SET read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION contar_notificacoes_nao_lidas(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM notificacoes WHERE user_id = p_user_id AND read = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notificacoes IS 'Sistema de notificações estilo Microsoft Teams';
COMMENT ON COLUMN notificacoes.type IS 'Tipo: mention, message, comment, task, project, approval, system';
COMMENT ON COLUMN notificacoes.context IS 'Contexto adicional: { project: string, channel: string }';
COMMENT ON COLUMN notificacoes.link IS 'URL interna para navegação quando clicar na notificação';
