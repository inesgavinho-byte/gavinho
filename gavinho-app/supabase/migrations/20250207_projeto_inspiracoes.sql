-- =====================================================
-- MIGRAÇÃO: Tabela projeto_inspiracoes
-- Gavinho Platform - Criado em 2025-02-07
-- Galeria de inspirações e referências visuais
-- =====================================================

CREATE TABLE IF NOT EXISTS projeto_inspiracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  categoria TEXT DEFAULT 'geral', -- geral, materiais, cores, espacos, mobiliario, iluminacao, exterior
  imagem_url TEXT NOT NULL,
  imagem_path TEXT NOT NULL,
  fonte TEXT, -- Pinterest, Instagram, website URL, etc.
  tags TEXT[],
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_projeto_id ON projeto_inspiracoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_inspiracoes_categoria ON projeto_inspiracoes(categoria);

ALTER TABLE projeto_inspiracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projeto_inspiracoes_all" ON projeto_inspiracoes
  FOR ALL USING (true);
