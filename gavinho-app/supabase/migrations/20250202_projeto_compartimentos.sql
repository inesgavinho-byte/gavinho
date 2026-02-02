-- Migration: Create projeto_compartimentos table
-- Date: 2025-02-02
-- Description: Stores project-specific compartments for archviz renders
-- When a user creates a new compartment, it's saved for reuse within that project

-- =====================================================
-- Table: projeto_compartimentos
-- Compartments specific to each project
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_compartimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_compartimentos_projeto_id
  ON projeto_compartimentos(projeto_id);

-- Unique constraint: one compartment name per project
ALTER TABLE projeto_compartimentos
  DROP CONSTRAINT IF EXISTS projeto_compartimentos_projeto_nome_unique;
ALTER TABLE projeto_compartimentos
  ADD CONSTRAINT projeto_compartimentos_projeto_nome_unique
  UNIQUE (projeto_id, nome);

-- Enable RLS
ALTER TABLE projeto_compartimentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can view compartimentos" ON projeto_compartimentos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can insert compartimentos" ON projeto_compartimentos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete compartimentos" ON projeto_compartimentos;
CREATE POLICY "Users can delete compartimentos" ON projeto_compartimentos
  FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE projeto_compartimentos IS 'Project-specific compartments for organizing archviz renders';
COMMENT ON COLUMN projeto_compartimentos.nome IS 'Compartment name (e.g., Quarto Premium_Sofa_Frente)';

-- =====================================================
-- Add vista column to projeto_renders if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projeto_renders' AND column_name = 'vista'
  ) THEN
    ALTER TABLE projeto_renders ADD COLUMN vista TEXT DEFAULT 'Vista Principal';
  END IF;
END $$;

COMMENT ON COLUMN projeto_renders.vista IS 'View/angle name within compartment (e.g., Vista Frontal, Vista Diagonal)';
