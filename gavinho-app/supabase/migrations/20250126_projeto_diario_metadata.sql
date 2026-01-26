-- Migração: Adicionar campo metadata ao projeto_diario
-- Data: 2025-01-26
-- Descrição: Campo JSONB para guardar metadados adicionais nas entradas do diário

ALTER TABLE projeto_diario ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN projeto_diario.metadata IS 'Metadados adicionais: tipo_classificado, acao_requerida, etc.';
