-- Migração: Configurar email_config para usar domínio gavinhogroup.com
-- Data: 2025-02-07
-- Descrição: Configura o remetente de email para usar o domínio verificado no Resend

-- Inserir ou atualizar configuração de email
INSERT INTO email_config (
  email_principal,
  servidor_smtp,
  porta_smtp,
  usar_tls,
  ativo
) VALUES (
  'notificacoes@gavinhogroup.com',
  'smtp.resend.com',
  587,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Se já existir uma configuração, atualizar para o novo domínio
UPDATE email_config
SET
  email_principal = 'notificacoes@gavinhogroup.com',
  servidor_smtp = 'smtp.resend.com',
  porta_smtp = 587,
  usar_tls = true,
  ativo = true,
  updated_at = NOW()
WHERE email_principal LIKE '%@gavinho.pt'
   OR email_principal IS NULL
   OR email_principal = '';

-- Garantir que apenas uma configuração está ativa
-- (desativar outras se existirem múltiplas)
UPDATE email_config
SET ativo = false, updated_at = NOW()
WHERE email_principal != 'notificacoes@gavinhogroup.com'
  AND ativo = true;

-- Comentário
COMMENT ON TABLE email_config IS 'Configuração do servidor de email - usa Resend com domínio gavinhogroup.com';
