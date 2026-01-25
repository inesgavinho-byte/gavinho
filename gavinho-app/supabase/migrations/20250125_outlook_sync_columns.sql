-- Migração: Colunas adicionais para sincronização Outlook
-- Data: 2025-01-25
-- Descrição: Adiciona colunas para suportar sincronização com Microsoft Outlook

-- Coluna para ID da mensagem do Outlook (diferente do message_id padrão)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS outlook_message_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_emails_outlook_id ON obra_emails(outlook_message_id) WHERE outlook_message_id IS NOT NULL;

-- Coluna para urgência (já existe na migração email_urgencia.sql, mas vamos garantir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'obra_emails' AND column_name = 'urgencia') THEN
    ALTER TABLE obra_emails ADD COLUMN urgencia VARCHAR(20) DEFAULT 'normal' CHECK (urgencia IN ('urgente', 'alta', 'normal', 'baixa'));
  END IF;
END $$;

-- Coluna para indicar se tem anexos (boolean para filtros rápidos)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS tem_anexos BOOLEAN DEFAULT false;

-- Coluna para fonte do email (outlook, gmail, manual, etc.)
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS fonte VARCHAR(50) DEFAULT 'manual';

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia ON obra_emails(urgencia);
CREATE INDEX IF NOT EXISTS idx_obra_emails_fonte ON obra_emails(fonte);
CREATE INDEX IF NOT EXISTS idx_obra_emails_tem_anexos ON obra_emails(tem_anexos) WHERE tem_anexos = true;

-- Atualizar emails existentes que têm anexos
UPDATE obra_emails SET tem_anexos = true WHERE anexos IS NOT NULL AND anexos != '[]'::jsonb AND tem_anexos = false;

COMMENT ON COLUMN obra_emails.outlook_message_id IS 'ID único da mensagem no Microsoft Outlook (para evitar duplicados na sincronização)';
COMMENT ON COLUMN obra_emails.urgencia IS 'Nível de urgência: urgente, alta, normal, baixa';
COMMENT ON COLUMN obra_emails.tem_anexos IS 'Indica se o email tem anexos (para filtros rápidos)';
COMMENT ON COLUMN obra_emails.fonte IS 'Fonte do email: outlook, gmail, manual, webhook';
