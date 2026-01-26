-- Migração: Adicionar campos de processamento IA aos emails
-- Data: 2025-01-26
-- Descrição: Campos para rastrear se o email foi processado pela IA

-- Adicionar coluna para marcar email como processado
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS processado_ia BOOLEAN DEFAULT FALSE;

-- Adicionar coluna para guardar a classificação do email
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS classificacao_ia VARCHAR(50);

-- Comentários
COMMENT ON COLUMN obra_emails.processado_ia IS 'Indica se o email foi processado pela IA (classificação, diário, tarefas)';
COMMENT ON COLUMN obra_emails.classificacao_ia IS 'Tipo de email classificado pela IA: pedido_informacao, pedido_orcamento, questao_cliente, etc.';

-- Índice para emails não processados
CREATE INDEX IF NOT EXISTS idx_obra_emails_processado ON obra_emails(processado_ia);
