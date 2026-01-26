-- Migração: Adiciona created_by à tabela decisoes
-- Data: 2025-01-26
-- Descrição: O trigger log_decisao_created() espera esta coluna

-- Adicionar coluna created_by para o trigger funcionar
ALTER TABLE decisoes ADD COLUMN IF NOT EXISTS created_by UUID;

-- Comentário explicativo
COMMENT ON COLUMN decisoes.created_by IS 'UUID do utilizador que criou a decisão. Usado pelo trigger log_decisao_created().';
