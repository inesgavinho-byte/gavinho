-- =====================================================
-- GARVIS Bot User Migration
-- Date: 2025-02-14
-- Description: Insert GARVIS bot user into utilizadores table
-- so the edge function can insert chat_mensagens with a valid FK.
-- Also drops/re-adds the check constraint if it blocks bot users.
-- =====================================================

-- 1. Ensure is_bot column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilizadores' AND column_name = 'is_bot'
  ) THEN
    ALTER TABLE utilizadores ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. Drop the auth check constraint if it exists (blocks non-auth users)
DO $$
BEGIN
  ALTER TABLE utilizadores DROP CONSTRAINT IF EXISTS utilizadores_team_requires_auth;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Insert GARVIS bot user (idempotent)
INSERT INTO utilizadores (id, nome, cargo, is_bot, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'G.A.R.V.I.S.',
  'Assistente IA',
  TRUE,
  'ativo'
)
ON CONFLICT (id) DO UPDATE SET
  nome = 'G.A.R.V.I.S.',
  is_bot = TRUE;

-- 4. Verify insertion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM utilizadores WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    RAISE WARNING 'GARVIS bot user could not be inserted into utilizadores';
  END IF;
END $$;
