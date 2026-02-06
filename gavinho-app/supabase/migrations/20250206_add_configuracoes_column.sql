-- =====================================================
-- ADD CONFIGURACOES COLUMN TO UTILIZADORES
-- Coluna JSONB para guardar preferencias do utilizador
-- =====================================================

-- Adicionar coluna configuracoes se nao existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilizadores' AND column_name = 'configuracoes'
  ) THEN
    ALTER TABLE utilizadores ADD COLUMN configuracoes JSONB DEFAULT '{}';
  END IF;
END $$;

-- Criar indice para consultas em configuracoes
CREATE INDEX IF NOT EXISTS idx_utilizadores_configuracoes ON utilizadores USING GIN (configuracoes);

-- Comentario
COMMENT ON COLUMN utilizadores.configuracoes IS 'Preferencias do utilizador: notificacoes, aparencia, etc.';
