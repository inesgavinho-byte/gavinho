-- =====================================================
-- FIX: projetos_status_check constraint
-- The form uses: on_track, at_risk, delayed, on_hold, completed
-- The DB constraint may not include all these values
-- =====================================================

-- Drop the existing constraint
ALTER TABLE projetos DROP CONSTRAINT IF EXISTS projetos_status_check;

-- Recreate with all valid status values
ALTER TABLE projetos ADD CONSTRAINT projetos_status_check
  CHECK (status IN ('on_track', 'at_risk', 'delayed', 'on_hold', 'completed', 'em_andamento', 'concluido', 'cancelado', 'suspenso'));
