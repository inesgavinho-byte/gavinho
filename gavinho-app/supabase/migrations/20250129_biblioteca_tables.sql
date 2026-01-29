-- Migração: Criar tabelas da Biblioteca
-- Data: 2025-01-29
-- Descrição: Sistema de gestão de materiais, modelos 3D e inspiração

-- =====================================================
-- TABELA: CATEGORIAS DA BIBLIOTECA
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'materiais',
  -- Valores: 'materiais', 'modelo3d', 'inspiracao'
  icone VARCHAR(50) DEFAULT 'layers',
  cor VARCHAR(20) DEFAULT '#C9A882',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_biblioteca_categorias_tipo ON biblioteca_categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_categorias_ordem ON biblioteca_categorias(ordem);

-- =====================================================
-- TABELA: TAGS DA BIBLIOTECA
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#C9A882',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_tags_nome ON biblioteca_tags(nome);

-- =====================================================
-- TABELA: MATERIAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_materiais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  fornecedor VARCHAR(255),
  referencia VARCHAR(100),
  preco_m2 DECIMAL(10, 2),
  cor VARCHAR(100),
  acabamento VARCHAR(100),
  notas TEXT,
  textura_url TEXT,
  ficha_tecnica_url TEXT,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_categoria ON biblioteca_materiais(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_ativo ON biblioteca_materiais(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_nome ON biblioteca_materiais(nome);

-- =====================================================
-- TABELA: MATERIAIS <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_materiais_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES biblioteca_materiais(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(material_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_tags_material ON biblioteca_materiais_tags(material_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_materiais_tags_tag ON biblioteca_materiais_tags(tag_id);

-- =====================================================
-- TABELA: MODELOS 3D
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_modelos3d (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  formato VARCHAR(20),
  fornecedor VARCHAR(255),
  preco DECIMAL(10, 2),
  largura_cm DECIMAL(8, 2),
  altura_cm DECIMAL(8, 2),
  profundidade_cm DECIMAL(8, 2),
  notas TEXT,
  arquivo_url TEXT,
  miniatura_url TEXT,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_categoria ON biblioteca_modelos3d(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_ativo ON biblioteca_modelos3d(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_nome ON biblioteca_modelos3d(nome);

-- =====================================================
-- TABELA: MODELOS 3D <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_modelos3d_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo3d_id UUID REFERENCES biblioteca_modelos3d(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(modelo3d_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_tags_modelo ON biblioteca_modelos3d_tags(modelo3d_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_modelos3d_tags_tag ON biblioteca_modelos3d_tags(tag_id);

-- =====================================================
-- TABELA: INSPIRAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_inspiracao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES biblioteca_categorias(id) ON DELETE SET NULL,
  fonte VARCHAR(255),
  link_original TEXT,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  notas TEXT,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  favorito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_categoria ON biblioteca_inspiracao(categoria_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_ativo ON biblioteca_inspiracao(ativo);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_projeto ON biblioteca_inspiracao(projeto_id);

-- =====================================================
-- TABELA: INSPIRAÇÃO <-> TAGS (RELAÇÃO N:N)
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_inspiracao_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspiracao_id UUID REFERENCES biblioteca_inspiracao(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES biblioteca_tags(id) ON DELETE CASCADE,
  UNIQUE(inspiracao_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_tags_inspiracao ON biblioteca_inspiracao_tags(inspiracao_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_inspiracao_tags_tag ON biblioteca_inspiracao_tags(tag_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_biblioteca_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_biblioteca_categorias_updated_at ON biblioteca_categorias;
CREATE TRIGGER trigger_biblioteca_categorias_updated_at
  BEFORE UPDATE ON biblioteca_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_materiais_updated_at ON biblioteca_materiais;
CREATE TRIGGER trigger_biblioteca_materiais_updated_at
  BEFORE UPDATE ON biblioteca_materiais
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_modelos3d_updated_at ON biblioteca_modelos3d;
CREATE TRIGGER trigger_biblioteca_modelos3d_updated_at
  BEFORE UPDATE ON biblioteca_modelos3d
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

DROP TRIGGER IF EXISTS trigger_biblioteca_inspiracao_updated_at ON biblioteca_inspiracao;
CREATE TRIGGER trigger_biblioteca_inspiracao_updated_at
  BEFORE UPDATE ON biblioteca_inspiracao
  FOR EACH ROW
  EXECUTE FUNCTION update_biblioteca_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE biblioteca_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_materiais_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_modelos3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_modelos3d_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_inspiracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_inspiracao_tags ENABLE ROW LEVEL SECURITY;

-- Policies para biblioteca_categorias
CREATE POLICY "Visualizar categorias" ON biblioteca_categorias FOR SELECT USING (true);
CREATE POLICY "Criar categorias" ON biblioteca_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar categorias" ON biblioteca_categorias FOR UPDATE USING (true);
CREATE POLICY "Eliminar categorias" ON biblioteca_categorias FOR DELETE USING (true);

-- Policies para biblioteca_tags
CREATE POLICY "Visualizar tags" ON biblioteca_tags FOR SELECT USING (true);
CREATE POLICY "Criar tags" ON biblioteca_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar tags" ON biblioteca_tags FOR UPDATE USING (true);
CREATE POLICY "Eliminar tags" ON biblioteca_tags FOR DELETE USING (true);

-- Policies para biblioteca_materiais
CREATE POLICY "Visualizar materiais" ON biblioteca_materiais FOR SELECT USING (true);
CREATE POLICY "Criar materiais" ON biblioteca_materiais FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar materiais" ON biblioteca_materiais FOR UPDATE USING (true);
CREATE POLICY "Eliminar materiais" ON biblioteca_materiais FOR DELETE USING (true);

-- Policies para biblioteca_materiais_tags
CREATE POLICY "Visualizar materiais_tags" ON biblioteca_materiais_tags FOR SELECT USING (true);
CREATE POLICY "Criar materiais_tags" ON biblioteca_materiais_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar materiais_tags" ON biblioteca_materiais_tags FOR DELETE USING (true);

-- Policies para biblioteca_modelos3d
CREATE POLICY "Visualizar modelos3d" ON biblioteca_modelos3d FOR SELECT USING (true);
CREATE POLICY "Criar modelos3d" ON biblioteca_modelos3d FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar modelos3d" ON biblioteca_modelos3d FOR UPDATE USING (true);
CREATE POLICY "Eliminar modelos3d" ON biblioteca_modelos3d FOR DELETE USING (true);

-- Policies para biblioteca_modelos3d_tags
CREATE POLICY "Visualizar modelos3d_tags" ON biblioteca_modelos3d_tags FOR SELECT USING (true);
CREATE POLICY "Criar modelos3d_tags" ON biblioteca_modelos3d_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar modelos3d_tags" ON biblioteca_modelos3d_tags FOR DELETE USING (true);

-- Policies para biblioteca_inspiracao
CREATE POLICY "Visualizar inspiracao" ON biblioteca_inspiracao FOR SELECT USING (true);
CREATE POLICY "Criar inspiracao" ON biblioteca_inspiracao FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar inspiracao" ON biblioteca_inspiracao FOR UPDATE USING (true);
CREATE POLICY "Eliminar inspiracao" ON biblioteca_inspiracao FOR DELETE USING (true);

-- Policies para biblioteca_inspiracao_tags
CREATE POLICY "Visualizar inspiracao_tags" ON biblioteca_inspiracao_tags FOR SELECT USING (true);
CREATE POLICY "Criar inspiracao_tags" ON biblioteca_inspiracao_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar inspiracao_tags" ON biblioteca_inspiracao_tags FOR DELETE USING (true);

-- =====================================================
-- SEED: CATEGORIAS INICIAIS
-- =====================================================

INSERT INTO biblioteca_categorias (nome, tipo, icone, cor, ordem) VALUES
  -- Materiais
  ('Pedras', 'materiais', 'mountain', '#8B7355', 1),
  ('Madeiras', 'materiais', 'trees', '#A0522D', 2),
  ('Cerâmicos', 'materiais', 'layers', '#CD853F', 3),
  ('Tecidos', 'materiais', 'shirt', '#DEB887', 4),
  ('Metais', 'materiais', 'square', '#708090', 5),
  -- Modelos 3D
  ('Sofás', 'modelo3d', 'sofa', '#8B4513', 1),
  ('Iluminação', 'modelo3d', 'lamp', '#FFD700', 2),
  ('Casa de Banho', 'modelo3d', 'bath', '#4682B4', 3),
  ('Cozinha', 'modelo3d', 'chef-hat', '#CD5C5C', 4),
  ('Exterior', 'modelo3d', 'tree-palm', '#228B22', 5),
  ('Decoração', 'modelo3d', 'flower-2', '#DA70D6', 6),
  -- Inspiração
  ('Interiores', 'inspiracao', 'building', '#696969', 1),
  ('Quartos', 'inspiracao', 'bed', '#6B8E23', 2),
  ('Escritórios', 'inspiracao', 'monitor', '#4169E1', 3),
  ('Detalhes', 'inspiracao', 'zoom-in', '#DB7093', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE biblioteca_categorias IS 'Categorias para organizar materiais, modelos 3D e inspiração';
COMMENT ON TABLE biblioteca_tags IS 'Tags para classificação transversal de itens da biblioteca';
COMMENT ON TABLE biblioteca_materiais IS 'Materiais de construção e acabamentos';
COMMENT ON TABLE biblioteca_modelos3d IS 'Modelos 3D de mobiliário e equipamentos';
COMMENT ON TABLE biblioteca_inspiracao IS 'Imagens de inspiração e referências de design';
