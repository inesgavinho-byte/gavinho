-- =====================================================
-- MIGRAÇÃO: Tabela projeto_notebook_sections
-- Gavinho Platform - Criado em 2025-02-07
-- Notebook do projeto estilo Google Docs
-- Secções hierárquicas com conteúdo rich text
-- =====================================================

CREATE TABLE IF NOT EXISTS projeto_notebook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES projeto_notebook_sections(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT, -- HTML rich text content
  tipo TEXT DEFAULT 'secao' CHECK (tipo IN ('secao', 'pagina', 'tabela')),
  icone TEXT DEFAULT 'file-text',
  ordem INTEGER DEFAULT 0,
  expandido BOOLEAN DEFAULT true,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_sections_projeto ON projeto_notebook_sections(projeto_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_parent ON projeto_notebook_sections(parent_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_ordem ON projeto_notebook_sections(projeto_id, parent_id, ordem);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_notebook_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notebook_sections_updated_at ON projeto_notebook_sections;
CREATE TRIGGER trigger_notebook_sections_updated_at
  BEFORE UPDATE ON projeto_notebook_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_sections_updated_at();

ALTER TABLE projeto_notebook_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notebook_sections_all" ON projeto_notebook_sections
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE projeto_notebook_sections IS 'Secções do Notebook do projeto - estrutura hierárquica estilo Google Docs';
