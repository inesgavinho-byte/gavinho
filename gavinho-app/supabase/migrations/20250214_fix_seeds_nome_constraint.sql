-- =====================================================
-- FIX: seeds_executados.nome NOT NULL constraint
-- The 'nome' column was NOT NULL without a DEFAULT,
-- causing migration seed tracking INSERTs to fail.
-- Fix: DROP NOT NULL + add DEFAULT = seed_key value
-- =====================================================

-- 1. Make nome nullable (so existing INSERTs without nome work)
ALTER TABLE seeds_executados ALTER COLUMN nome DROP NOT NULL;

-- 2. Set default to empty string for future INSERTs
ALTER TABLE seeds_executados ALTER COLUMN nome SET DEFAULT '';

-- 3. Backfill any NULL nome values with the seed_key
UPDATE seeds_executados SET nome = seed_key WHERE nome IS NULL;

-- 4. Now insert the three pending seeds that failed before
INSERT INTO seeds_executados (seed_key, nome, executado_em)
VALUES
  ('20250214_fix_orcamentos_columns', '20250214_fix_orcamentos_columns', now()),
  ('20250214_financeiro_phase2_4', '20250214_financeiro_phase2_4', now()),
  ('20250214_fix_portfolio_view_columns', '20250214_fix_portfolio_view_columns', now()),
  ('20250214_fix_seeds_nome_constraint', '20250214_fix_seeds_nome_constraint', now())
ON CONFLICT DO NOTHING;
