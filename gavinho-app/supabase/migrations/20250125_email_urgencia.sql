-- Migração: Adicionar campos de urgência e classificação IA aos emails
-- Data: 2025-01-25
-- Descrição: Adiciona colunas para classificação de urgência com IA

-- =====================================================
-- 1. ADICIONAR COLUNAS À TABELA obra_emails
-- =====================================================

-- Coluna para urgência classificada
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS urgencia VARCHAR(20)
  CHECK (urgencia IN ('urgente', 'alta', 'normal', 'baixa'))
  DEFAULT 'normal';

-- Coluna para metadados da classificação IA
ALTER TABLE obra_emails ADD COLUMN IF NOT EXISTS classificacao_ia JSONB;

-- Índices para pesquisa por urgência
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia ON obra_emails(urgencia);
CREATE INDEX IF NOT EXISTS idx_obra_emails_urgencia_lido ON obra_emails(urgencia, lido)
  WHERE urgencia IN ('urgente', 'alta') AND lido = false;

-- =====================================================
-- 2. COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN obra_emails.urgencia IS 'Nível de urgência do email: urgente, alta, normal, baixa';
COMMENT ON COLUMN obra_emails.classificacao_ia IS 'Metadados da classificação IA: { urgencia, razao, categorias, classificado_em }';

-- =====================================================
-- 3. ATUALIZAR EMAILS EXISTENTES
-- =====================================================

-- Definir urgência padrão para emails existentes sem urgência
UPDATE obra_emails
SET urgencia = 'normal'
WHERE urgencia IS NULL;
