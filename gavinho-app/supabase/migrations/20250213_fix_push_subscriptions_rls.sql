-- =====================================================
-- Fix RLS on chat_push_subscriptions
-- Replace overly-permissive USING (true) with proper
-- per-user restriction: auth.uid() = utilizador_id
-- =====================================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "chat_push_subscriptions_all" ON chat_push_subscriptions;

-- Users can read/manage only their own subscriptions
DROP POLICY IF EXISTS "chat_push_subscriptions_own" ON chat_push_subscriptions;
CREATE POLICY "chat_push_subscriptions_own"
  ON chat_push_subscriptions
  FOR ALL
  USING (auth.uid() = utilizador_id)
  WITH CHECK (auth.uid() = utilizador_id);
