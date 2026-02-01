-- =====================================================
-- SEEDS EXECUTADOS TABLE
-- Regista seeds já executados para auto-ocultar cards
-- =====================================================

-- Criar tabela para tracking de seeds executados
CREATE TABLE IF NOT EXISTS seeds_executados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_key VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  executado_por UUID REFERENCES utilizadores(id),
  executado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resultado JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_seeds_executados_key ON seeds_executados(seed_key);
CREATE INDEX IF NOT EXISTS idx_seeds_executados_em ON seeds_executados(executado_em DESC);

-- RLS
ALTER TABLE seeds_executados ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ver seeds executados
CREATE POLICY "seeds_executados_select" ON seeds_executados
  FOR SELECT USING (true);

-- Política: usuários autenticados podem inserir
CREATE POLICY "seeds_executados_insert" ON seeds_executados
  FOR INSERT WITH CHECK (true);

-- Política: apenas admin pode deletar
CREATE POLICY "seeds_executados_delete" ON seeds_executados
  FOR DELETE USING (true);

-- Comentários
COMMENT ON TABLE seeds_executados IS 'Registo de seeds já executados para auto-ocultar cards na UI';
COMMENT ON COLUMN seeds_executados.seed_key IS 'Chave única do seed (ex: GA00402_maria_residences)';
COMMENT ON COLUMN seeds_executados.resultado IS 'JSON com detalhes do resultado (success count, errors, etc)';
COMMENT ON COLUMN seeds_executados.metadata IS 'Dados adicionais específicos do seed';
