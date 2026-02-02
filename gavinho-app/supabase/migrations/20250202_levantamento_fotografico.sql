-- Migration: Create levantamento_fotografico tables
-- Date: 2025-02-02
-- Description: Stores photographs of existing spaces organized by compartment
-- Used for documenting current state of spaces before intervention

-- =====================================================
-- Table: projeto_levantamento_compartimentos
-- Compartments/rooms to organize photos
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_levantamento_compartimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_levantamento_compartimentos_projeto_id
  ON projeto_levantamento_compartimentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_levantamento_compartimentos_ordem
  ON projeto_levantamento_compartimentos(ordem);

-- Unique constraint: one compartment name per project
ALTER TABLE projeto_levantamento_compartimentos
  DROP CONSTRAINT IF EXISTS levantamento_compartimentos_projeto_nome_unique;
ALTER TABLE projeto_levantamento_compartimentos
  ADD CONSTRAINT levantamento_compartimentos_projeto_nome_unique
  UNIQUE (projeto_id, nome);

-- Enable RLS
ALTER TABLE projeto_levantamento_compartimentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can view compartimentos" ON projeto_levantamento_compartimentos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can insert compartimentos" ON projeto_levantamento_compartimentos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can update compartimentos" ON projeto_levantamento_compartimentos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete compartimentos" ON projeto_levantamento_compartimentos;
CREATE POLICY "Users can delete compartimentos" ON projeto_levantamento_compartimentos
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_levantamento_fotos
-- Photos within each compartment
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_levantamento_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compartimento_id UUID NOT NULL REFERENCES projeto_levantamento_compartimentos(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  url TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  ordem INTEGER DEFAULT 0,
  is_destaque BOOLEAN DEFAULT FALSE,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_compartimento_id
  ON projeto_levantamento_fotos(compartimento_id);
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_is_destaque
  ON projeto_levantamento_fotos(is_destaque) WHERE is_destaque = true;
CREATE INDEX IF NOT EXISTS idx_levantamento_fotos_ordem
  ON projeto_levantamento_fotos(ordem);

-- Enable RLS
ALTER TABLE projeto_levantamento_fotos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can view fotos" ON projeto_levantamento_fotos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can insert fotos" ON projeto_levantamento_fotos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can update fotos" ON projeto_levantamento_fotos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete fotos" ON projeto_levantamento_fotos;
CREATE POLICY "Users can delete fotos" ON projeto_levantamento_fotos
  FOR DELETE USING (true);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_levantamento_compartimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_levantamento_compartimentos_updated_at ON projeto_levantamento_compartimentos;
CREATE TRIGGER trigger_levantamento_compartimentos_updated_at
  BEFORE UPDATE ON projeto_levantamento_compartimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_levantamento_compartimentos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE projeto_levantamento_compartimentos IS 'Compartments/rooms for organizing site survey photos';
COMMENT ON TABLE projeto_levantamento_fotos IS 'Photos of existing spaces for site survey documentation';

COMMENT ON COLUMN projeto_levantamento_compartimentos.nome IS 'Room/space name (e.g., Sala de Estar, Cozinha, Quarto Principal)';
COMMENT ON COLUMN projeto_levantamento_compartimentos.ordem IS 'Display order for the compartment';
COMMENT ON COLUMN projeto_levantamento_fotos.is_destaque IS 'Featured/highlight photo for this compartment';
COMMENT ON COLUMN projeto_levantamento_fotos.url IS 'Public URL to the photo in storage';
