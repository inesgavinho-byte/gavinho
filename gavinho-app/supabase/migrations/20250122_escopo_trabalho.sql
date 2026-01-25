-- =====================================================
-- ESCOPO DE TRABALHO - Campo para guardar escopo do projeto
-- =====================================================

-- Adicionar coluna escopo_trabalho à tabela projetos
ALTER TABLE projetos
ADD COLUMN IF NOT EXISTS escopo_trabalho TEXT;

-- Comentário para documentação
COMMENT ON COLUMN projetos.escopo_trabalho IS 'Escopo detalhado do trabalho do projeto, incluindo fases, entregáveis e condições contratuais';
