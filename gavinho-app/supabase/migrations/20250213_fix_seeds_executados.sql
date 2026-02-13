-- =====================================================
-- FIX: Ensure seeds_executados table exists with correct schema
--
-- Problem: Multiple migrations INSERT INTO seeds_executados before
-- the table is created (20250201_seeds_executados.sql).
-- Also, INSERTs used wrong column names (executed_at vs executado_em)
-- and wrong conflict target (nome vs seed_key).
--
-- Run this FIRST if you get:
--   ERROR: relation "seeds_executados" does not exist
-- =====================================================

-- Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS seeds_executados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_key VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  executado_por UUID,
  executado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resultado JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Add unique index on nome so ON CONFLICT (nome) works in legacy migrations
-- (some older migrations use ON CONFLICT (nome) instead of ON CONFLICT (seed_key))
CREATE UNIQUE INDEX IF NOT EXISTS idx_seeds_executados_nome_unique
  ON seeds_executados(nome);

-- Add executed_at alias column for legacy migrations that use it
-- (older migrations use executed_at instead of executado_em)
ALTER TABLE seeds_executados
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure other indexes exist
CREATE INDEX IF NOT EXISTS idx_seeds_executados_key ON seeds_executados(seed_key);
CREATE INDEX IF NOT EXISTS idx_seeds_executados_em ON seeds_executados(executado_em DESC);

-- RLS
ALTER TABLE seeds_executados ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent: drop + create)
DROP POLICY IF EXISTS "seeds_executados_select" ON seeds_executados;
CREATE POLICY "seeds_executados_select" ON seeds_executados
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "seeds_executados_insert" ON seeds_executados;
CREATE POLICY "seeds_executados_insert" ON seeds_executados
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "seeds_executados_delete" ON seeds_executados;
CREATE POLICY "seeds_executados_delete" ON seeds_executados
  FOR DELETE USING (true);

-- Log this fix
INSERT INTO seeds_executados (seed_key, nome, executed_at, executado_em)
VALUES ('20250213_fix_seeds_executados', '20250213_fix_seeds_executados', NOW(), NOW())
ON CONFLICT (seed_key) DO UPDATE SET executed_at = NOW(), executado_em = NOW();
