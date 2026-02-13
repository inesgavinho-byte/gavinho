-- Migration: Create projeto_renders tables
-- These tables store archviz renders, versions, and comments
-- Required for the archviz functionality to persist data

-- =====================================================
-- Table: projeto_renders
-- Main render record - one per compartimento/vista combination
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  compartimento TEXT NOT NULL,
  vista TEXT DEFAULT 'Vista Principal',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projeto_renders_projeto_id ON projeto_renders(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_renders_compartimento ON projeto_renders(compartimento);

-- Enable RLS
ALTER TABLE projeto_renders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view renders" ON projeto_renders;
CREATE POLICY "Users can view renders" ON projeto_renders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert renders" ON projeto_renders;
CREATE POLICY "Users can insert renders" ON projeto_renders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update renders" ON projeto_renders;
CREATE POLICY "Users can update renders" ON projeto_renders
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete renders" ON projeto_renders;
CREATE POLICY "Users can delete renders" ON projeto_renders
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_render_versoes
-- Version history for each render (v1, v2, v3, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_render_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id UUID NOT NULL REFERENCES projeto_renders(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  url TEXT NOT NULL,
  is_final BOOLEAN DEFAULT FALSE,
  marked_final_at TIMESTAMPTZ,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_render_versoes_render_id ON projeto_render_versoes(render_id);
CREATE INDEX IF NOT EXISTS idx_projeto_render_versoes_is_final ON projeto_render_versoes(is_final) WHERE is_final = true;

-- Unique constraint: one version number per render
ALTER TABLE projeto_render_versoes DROP CONSTRAINT IF EXISTS projeto_render_versoes_render_versao_unique;
ALTER TABLE projeto_render_versoes ADD CONSTRAINT projeto_render_versoes_render_versao_unique
  UNIQUE (render_id, versao);

-- Enable RLS
ALTER TABLE projeto_render_versoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view versions" ON projeto_render_versoes;
CREATE POLICY "Users can view versions" ON projeto_render_versoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert versions" ON projeto_render_versoes;
CREATE POLICY "Users can insert versions" ON projeto_render_versoes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update versions" ON projeto_render_versoes;
CREATE POLICY "Users can update versions" ON projeto_render_versoes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete versions" ON projeto_render_versoes;
CREATE POLICY "Users can delete versions" ON projeto_render_versoes
  FOR DELETE USING (true);

-- =====================================================
-- Table: projeto_render_comentarios
-- Comments on renders
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_render_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id UUID NOT NULL REFERENCES projeto_renders(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  autor_id UUID,
  autor_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projeto_render_comentarios_render_id ON projeto_render_comentarios(render_id);

-- Enable RLS
ALTER TABLE projeto_render_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view comments" ON projeto_render_comentarios;
CREATE POLICY "Users can view comments" ON projeto_render_comentarios
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert comments" ON projeto_render_comentarios;
CREATE POLICY "Users can insert comments" ON projeto_render_comentarios
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own comments" ON projeto_render_comentarios;
CREATE POLICY "Users can delete own comments" ON projeto_render_comentarios
  FOR DELETE USING (true);

-- =====================================================
-- Storage bucket for renders
-- =====================================================
-- Note: Storage bucket needs to be created via Supabase dashboard or API
-- Bucket name: 'renders'
-- Public: true (for image URLs to work)

-- Add comments for documentation
COMMENT ON TABLE projeto_renders IS 'Stores render records for archviz - one per compartimento/vista';
COMMENT ON TABLE projeto_render_versoes IS 'Version history for renders - supports multiple versions per render';
COMMENT ON TABLE projeto_render_comentarios IS 'Comments and feedback on renders';

COMMENT ON COLUMN projeto_renders.compartimento IS 'Room/space name (e.g., Sala de Estar, Cozinha)';
COMMENT ON COLUMN projeto_renders.vista IS 'View angle/perspective name';
COMMENT ON COLUMN projeto_render_versoes.is_final IS 'Whether this version is marked as final/approved';
COMMENT ON COLUMN projeto_render_versoes.url IS 'Public URL to the render image in storage';

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_projeto_renders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_renders_updated_at ON projeto_renders;
CREATE TRIGGER trigger_projeto_renders_updated_at
  BEFORE UPDATE ON projeto_renders
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_renders_updated_at();

-- Log migration execution (guarded: table may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, nome, executado_em)
    VALUES ('20250201_projeto_renders_tables', '20250201_projeto_renders_tables', NOW())
    ON CONFLICT (seed_key) DO UPDATE SET executado_em = NOW();
  END IF;
END $$;
