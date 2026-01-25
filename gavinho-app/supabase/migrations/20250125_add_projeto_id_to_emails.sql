-- Migração: Adiciona projeto_id à tabela obra_emails
-- Data: 2025-01-25
-- Descrição: Permite associar emails a projetos (códigos GA) além de obras (códigos OB)

-- Adicionar coluna projeto_id que referencia a tabela projetos
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL;

-- Índice para melhor performance em queries por projeto
CREATE INDEX IF NOT EXISTS idx_obra_emails_projeto_id ON obra_emails(projeto_id) WHERE projeto_id IS NOT NULL;

-- Atualizar emails existentes que têm codigo_obra_detectado começando com GA
-- e associá-los ao projeto correspondente
UPDATE obra_emails e
SET projeto_id = p.id
FROM projetos p
WHERE e.codigo_obra_detectado LIKE 'GA%'
  AND e.codigo_obra_detectado = p.codigo
  AND e.projeto_id IS NULL;

COMMENT ON COLUMN obra_emails.projeto_id IS 'Referência ao projeto (para códigos GA). Usa obra_id para obras (códigos OB).';
