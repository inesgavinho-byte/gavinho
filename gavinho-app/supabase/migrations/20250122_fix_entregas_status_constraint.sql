-- =====================================================
-- FIX: projeto_entregas status constraint
-- Atualizar constraint para corresponder aos valores do frontend
-- =====================================================

-- Remover constraint antiga
ALTER TABLE projeto_entregas
DROP CONSTRAINT IF EXISTS projeto_entregas_status_check;

-- Adicionar constraint com os valores corretos
ALTER TABLE projeto_entregas
ADD CONSTRAINT projeto_entregas_status_check
CHECK (status IN ('pendente', 'em_preparacao', 'enviado', 'entregue', 'aprovado', 'rejeitado'));

-- Nota: Se a tabela não existir, criar com estrutura correta
-- CREATE TABLE IF NOT EXISTS projeto_entregas (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
--   tipo TEXT NOT NULL DEFAULT 'interna' CHECK (tipo IN ('interna', 'cliente')),
--   titulo TEXT NOT NULL,
--   descricao TEXT,
--   destinatario TEXT,
--   data_prevista DATE,
--   data_entrega DATE,
--   status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_preparacao', 'enviado', 'entregue', 'aprovado', 'rejeitado')),
--   documentos TEXT,
--   observacoes TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
