-- Migration: Create projeto_inspiracoes table
-- Table to store inspiration images and references for archviz projects

-- =====================================================
-- Table: projeto_inspiracoes
-- Stores inspiration/reference images organized by compartimento
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_inspiracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  compartimento TEXT DEFAULT 'Geral',
  titulo TEXT,
  descricao TEXT,
  url TEXT NOT NULL,
  fonte TEXT, -- Origem da inspiração (Pinterest, Archdaily, etc.)
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_projeto_id ON projeto_inspiracoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_compartimento ON projeto_inspiracoes(compartimento);
CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_tags ON projeto_inspiracoes USING GIN(tags);

-- Enable RLS
ALTER TABLE projeto_inspiracoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view inspiracoes" ON projeto_inspiracoes;
CREATE POLICY "Users can view inspiracoes" ON projeto_inspiracoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert inspiracoes" ON projeto_inspiracoes;
CREATE POLICY "Users can insert inspiracoes" ON projeto_inspiracoes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update inspiracoes" ON projeto_inspiracoes;
CREATE POLICY "Users can update inspiracoes" ON projeto_inspiracoes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete inspiracoes" ON projeto_inspiracoes;
CREATE POLICY "Users can delete inspiracoes" ON projeto_inspiracoes
  FOR DELETE USING (true);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_projeto_inspiracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_inspiracoes_updated_at ON projeto_inspiracoes;
CREATE TRIGGER trigger_projeto_inspiracoes_updated_at
  BEFORE UPDATE ON projeto_inspiracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_inspiracoes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE projeto_inspiracoes IS 'Stores inspiration and reference images for archviz projects';
COMMENT ON COLUMN projeto_inspiracoes.compartimento IS 'Room/space name for organization (e.g., Sala de Estar, Cozinha)';
COMMENT ON COLUMN projeto_inspiracoes.fonte IS 'Source of inspiration (Pinterest, Archdaily, etc.)';
COMMENT ON COLUMN projeto_inspiracoes.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN projeto_inspiracoes.url IS 'Public URL to the image in storage';

-- Log migration execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250207_projeto_inspiracoes', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();
