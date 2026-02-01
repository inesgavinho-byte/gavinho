-- Migration: Create projeto_moodboards table for HTML moodboard uploads
-- Date: 2025-02-01
-- Description: Stores HTML moodboard files for project briefing/concept visualization

-- Create projeto_moodboards table
CREATE TABLE IF NOT EXISTS projeto_moodboards (
  id TEXT PRIMARY KEY DEFAULT ('mb_' || replace(gen_random_uuid()::text, '-', '')),
  projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Moodboard info
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'conceito' CHECK (tipo IN ('conceito', 'materiais', 'cores', 'espacos', 'outro')),

  -- File info
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,

  -- Metadata
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_projeto_id ON projeto_moodboards(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_tipo ON projeto_moodboards(tipo);
CREATE INDEX IF NOT EXISTS idx_projeto_moodboards_created_at ON projeto_moodboards(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_projeto_moodboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_moodboards_updated_at ON projeto_moodboards;
CREATE TRIGGER trigger_projeto_moodboards_updated_at
  BEFORE UPDATE ON projeto_moodboards
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_moodboards_updated_at();

-- Enable RLS
ALTER TABLE projeto_moodboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project moodboards"
  ON projeto_moodboards FOR SELECT
  USING (true);

CREATE POLICY "Users can insert project moodboards"
  ON projeto_moodboards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update project moodboards"
  ON projeto_moodboards FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete project moodboards"
  ON projeto_moodboards FOR DELETE
  USING (true);

-- Add comment
COMMENT ON TABLE projeto_moodboards IS 'HTML moodboard files for project briefing and concept visualization';

-- Create storage bucket policy for projeto-files if not exists
-- Note: Run this in Supabase Dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('projeto-files', 'projeto-files', true)
-- ON CONFLICT (id) DO NOTHING;
