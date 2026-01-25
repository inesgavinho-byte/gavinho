-- =====================================================
-- RENDER ANNOTATIONS (Moleskine)
-- Sistema de anotação visual para renders arquitectónicos
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: RENDER_ANNOTATIONS
-- Guarda anotações de desenho em cima de renders
-- =====================================================
CREATE TABLE IF NOT EXISTS render_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relação com projeto e render
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  render_id UUID NOT NULL, -- ID do render na tabela projeto_renders
  render_url TEXT, -- URL da imagem (cache para acesso rápido)

  -- Dados das anotações (JSONB array)
  -- Cada anotação tem: id, type, color, width, points/coords, createdBy, createdAt
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Dimensões do canvas original (para escalar corretamente)
  canvas_width INTEGER DEFAULT 1920,
  canvas_height INTEGER DEFAULT 1080,

  -- Versioning (para histórico se necessário)
  version INTEGER DEFAULT 1,

  -- Audit
  created_by UUID REFERENCES utilizadores(id),
  created_by_name TEXT,
  updated_by UUID REFERENCES utilizadores(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint única para evitar duplicados
  UNIQUE(projeto_id, render_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_render_annotations_projeto ON render_annotations(projeto_id);
CREATE INDEX IF NOT EXISTS idx_render_annotations_render ON render_annotations(render_id);
CREATE INDEX IF NOT EXISTS idx_render_annotations_updated ON render_annotations(updated_at DESC);

-- Índice GIN para queries no JSONB (se precisar filtrar por tipo de anotação, cor, etc.)
CREATE INDEX IF NOT EXISTS idx_render_annotations_jsonb ON render_annotations USING GIN (annotations);

-- =====================================================
-- 2. TABELA DE HISTÓRICO (OPCIONAL)
-- Para guardar versões anteriores das anotações
-- =====================================================
CREATE TABLE IF NOT EXISTS render_annotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES render_annotations(id) ON DELETE CASCADE,

  -- Snapshot das anotações
  annotations JSONB NOT NULL,
  version INTEGER NOT NULL,

  -- Quem fez a alteração
  changed_by UUID REFERENCES utilizadores(id),
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_annotation_history_annotation ON render_annotation_history(annotation_id);
CREATE INDEX IF NOT EXISTS idx_render_annotation_history_version ON render_annotation_history(version DESC);

-- =====================================================
-- 3. TRIGGER PARA UPDATED_AT AUTOMÁTICO
-- =====================================================
CREATE OR REPLACE FUNCTION update_render_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_render_annotations_updated_at ON render_annotations;
CREATE TRIGGER trigger_render_annotations_updated_at
  BEFORE UPDATE ON render_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_render_annotations_updated_at();

-- =====================================================
-- 4. TRIGGER PARA GUARDAR HISTÓRICO AUTOMATICAMENTE
-- Guarda versão anterior quando há alterações significativas
-- =====================================================
CREATE OR REPLACE FUNCTION save_render_annotation_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Só guarda histórico se as anotações mudaram
  IF OLD.annotations IS DISTINCT FROM NEW.annotations THEN
    INSERT INTO render_annotation_history (
      annotation_id,
      annotations,
      version,
      changed_by,
      changed_by_name,
      changed_at
    ) VALUES (
      OLD.id,
      OLD.annotations,
      OLD.version,
      NEW.updated_by,
      (SELECT nome FROM utilizadores WHERE id = NEW.updated_by),
      NOW()
    );

    -- Incrementa versão
    NEW.version = COALESCE(OLD.version, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_render_annotation_history ON render_annotations;
CREATE TRIGGER trigger_render_annotation_history
  BEFORE UPDATE ON render_annotations
  FOR EACH ROW
  EXECUTE FUNCTION save_render_annotation_history();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE render_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_annotation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Todos os utilizadores autenticados podem ver anotações
CREATE POLICY "render_annotations_select_policy" ON render_annotations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Todos os utilizadores autenticados podem criar anotações
CREATE POLICY "render_annotations_insert_policy" ON render_annotations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Todos os utilizadores autenticados podem atualizar anotações
CREATE POLICY "render_annotations_update_policy" ON render_annotations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Só quem criou pode apagar (ou admin)
CREATE POLICY "render_annotations_delete_policy" ON render_annotations
  FOR DELETE
  USING (auth.uid() = created_by OR auth.role() = 'service_role');

-- Políticas para histórico
CREATE POLICY "render_annotation_history_select_policy" ON render_annotation_history
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE render_annotations IS 'Anotações visuais (desenhos, textos, formas) em cima de renders - Moleskine';
COMMENT ON COLUMN render_annotations.annotations IS 'Array JSONB de anotações. Cada item: {id, type, color, width, points/coords, createdBy, createdAt}';
COMMENT ON COLUMN render_annotations.canvas_width IS 'Largura original da imagem para escalar anotações corretamente';
COMMENT ON COLUMN render_annotations.canvas_height IS 'Altura original da imagem para escalar anotações corretamente';
COMMENT ON TABLE render_annotation_history IS 'Histórico automático de versões anteriores das anotações';
