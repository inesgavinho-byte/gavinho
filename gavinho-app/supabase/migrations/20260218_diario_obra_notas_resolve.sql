-- =====================================================
-- MIGRAÇÃO: Diário de Obra — Notas do dia + Resolve pendentes
-- Data: 2026-02-18
-- Seguro: usa ADD COLUMN IF NOT EXISTS
-- =====================================================

-- 1. Notas do dia (campo texto livre no fim de cada entrada)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS observacoes_dia TEXT;

-- 2. Horário de obra (caso a migração anterior não tenha corrido)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS hora_inicio TIME;
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS hora_fim TIME;

-- 3. Adicionar campo de resolução descritiva na tabela obra_pendentes
ALTER TABLE obra_pendentes ADD COLUMN IF NOT EXISTS resolucao_descricao TEXT;
