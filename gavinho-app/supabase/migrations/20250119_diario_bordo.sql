-- =====================================================
-- DIÁRIO DE BORDO - Schema
-- =====================================================

-- Categorias do Diário de Bordo
CREATE TABLE IF NOT EXISTS diario_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#5F5C59',
  icone VARCHAR(50) DEFAULT 'FileText',
  ordem INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO diario_categorias (nome, cor, icone, ordem) VALUES
  ('Tarefa', '#7A9E7A', 'CheckSquare', 1),
  ('Desenhos', '#8A9EB8', 'PenTool', 2),
  ('3D / Renders', '#C9A882', 'Box', 3),
  ('Cliente', '#B88A8A', 'User', 4),
  ('Fornecedor', '#9B8AB8', 'Truck', 5),
  ('Email', '#6B8E9B', 'Mail', 6),
  ('Reunião', '#8B8A7A', 'Users', 7),
  ('Nota', '#A0A0A0', 'StickyNote', 8)
ON CONFLICT DO NOTHING;

-- Tags para filtrar entradas
CREATE TABLE IF NOT EXISTS diario_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  cor VARCHAR(20) DEFAULT '#C3BAAF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tags padrão
INSERT INTO diario_tags (nome, cor) VALUES
  ('Urgente', '#B88A8A'),
  ('Aguarda Resposta', '#C9A882'),
  ('Concluído', '#7A9E7A'),
  ('Em Revisão', '#8A9EB8'),
  ('Pendente Cliente', '#9B8AB8')
ON CONFLICT DO NOTHING;

-- Entradas do Diário de Bordo
CREATE TABLE IF NOT EXISTS projeto_diario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES diario_categorias(id),

  -- Conteúdo
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,

  -- Metadados
  tipo VARCHAR(50) DEFAULT 'manual', -- 'manual', 'email', 'auto'
  fonte VARCHAR(100), -- 'outlook', 'manual', 'sistema'

  -- Relacionamentos opcionais
  utilizador_id UUID REFERENCES utilizadores(id),
  entregavel_id UUID REFERENCES projeto_entregaveis(id),

  -- Email específico (quando tipo = 'email')
  email_de VARCHAR(255),
  email_para VARCHAR(255),
  email_assunto VARCHAR(500),
  email_message_id VARCHAR(255), -- ID único do email para evitar duplicados

  -- Anexos (URLs do Supabase Storage)
  anexos JSONB DEFAULT '[]',

  -- Timestamps
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES utilizadores(id)
);

-- Relação muitos-para-muitos entre entradas e tags
CREATE TABLE IF NOT EXISTS projeto_diario_tags (
  diario_id UUID REFERENCES projeto_diario(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES diario_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (diario_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projeto_diario_projeto ON projeto_diario(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_categoria ON projeto_diario(categoria_id);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_data ON projeto_diario(data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_tipo ON projeto_diario(tipo);
CREATE INDEX IF NOT EXISTS idx_projeto_diario_email_id ON projeto_diario(email_message_id);

-- RLS Policies
ALTER TABLE diario_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_diario_tags ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para utilizadores autenticados
CREATE POLICY "Allow all for authenticated users" ON diario_categorias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON diario_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_diario FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_diario_tags FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_diario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_diario_updated_at
  BEFORE UPDATE ON projeto_diario
  FOR EACH ROW
  EXECUTE FUNCTION update_diario_updated_at();
