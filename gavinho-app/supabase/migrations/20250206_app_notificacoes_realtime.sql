-- =====================================================
-- ENABLE REALTIME FOR APP_NOTIFICACOES
-- Allows real-time subscription for app notifications
-- =====================================================

-- Add app_notificacoes to realtime publication
-- This enables postgres_changes subscriptions in the frontend
ALTER PUBLICATION supabase_realtime ADD TABLE app_notificacoes;
