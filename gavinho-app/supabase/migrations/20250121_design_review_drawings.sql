-- =====================================================
-- DESIGN REVIEW DRAWINGS - Desenhos sobre PDFs
-- =====================================================

CREATE TABLE IF NOT EXISTS design_review_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES design_review_versions(id) ON DELETE CASCADE,

  -- Página e tipo
  pagina INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('pencil', 'rectangle', 'arrow', 'circle', 'line')),

  -- Dados do desenho (JSON com pontos/coordenadas)
  -- Para pencil: { points: [{x, y}, ...] }
  -- Para rectangle: { x, y, width, height }
  -- Para arrow/line: { x1, y1, x2, y2 }
  -- Para circle: { cx, cy, radius }
  data JSONB NOT NULL,

  -- Estilo
  cor TEXT DEFAULT '#EF4444',
  espessura INTEGER DEFAULT 2,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_drawings_version ON design_review_drawings(version_id);
CREATE INDEX IF NOT EXISTS idx_drawings_pagina ON design_review_drawings(pagina);

-- RLS
ALTER TABLE design_review_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON design_review_drawings FOR ALL USING (true);
