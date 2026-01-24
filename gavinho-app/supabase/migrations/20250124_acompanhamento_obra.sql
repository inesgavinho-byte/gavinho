-- =====================================================
-- ACOMPANHAMENTO OBRA - Schema completo
-- Fotografias, Relatórios e Não Conformidades
-- =====================================================

-- =====================================================
-- ESPECIALIDADES (tabela base partilhada)
-- =====================================================
CREATE TABLE IF NOT EXISTS especialidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20) NOT NULL DEFAULT '#8B8670',
    icone VARCHAR(50) DEFAULT 'wrench',
    categoria VARCHAR(50), -- 'estrutura', 'mep', 'acabamentos', 'exteriores'
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir especialidades padrão
INSERT INTO especialidades (nome, cor, icone, categoria, ordem) VALUES
-- Estrutura
('Estrutura', '#8B7355', 'building-2', 'estrutura', 1),
('Alvenarias', '#A0855B', 'brick-wall', 'estrutura', 2),
('Impermeabilização', '#7A6B5A', 'shield-check', 'estrutura', 3),
-- MEP (Mechanical, Electrical, Plumbing)
('AVAC', '#5B8BA0', 'wind', 'mep', 10),
('Elétrico', '#D4A84B', 'zap', 'mep', 11),
('Hidráulica', '#6B8E8E', 'droplets', 'mep', 12),
('Gás', '#E07B54', 'flame', 'mep', 13),
-- Acabamentos
('Carpintaria', '#A67C52', 'layers', 'acabamentos', 20),
('Serralharia', '#7A7A7A', 'wrench', 'acabamentos', 21),
('Pintura', '#9B8B7A', 'paintbrush', 'acabamentos', 22),
('Revestimentos', '#6B7280', 'grid-3x3', 'acabamentos', 23),
('Caixilharia', '#5D6D7E', 'square', 'acabamentos', 24),
('Vidros', '#85C1E9', 'maximize-2', 'acabamentos', 25),
-- Exteriores
('Paisagismo', '#27AE60', 'tree-pine', 'exteriores', 30),
('Piscina', '#3498DB', 'waves', 'exteriores', 31)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FOTOGRAFIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_fotografias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Ficheiro
    url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    tamanho_bytes INTEGER,
    largura INTEGER,
    altura INTEGER,

    -- Metadados
    titulo VARCHAR(255),
    descricao TEXT,
    data_fotografia DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Classificação
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    especialidade_id UUID REFERENCES especialidades(id) ON DELETE SET NULL,
    tags TEXT[], -- Tags livres

    -- Origem
    autor VARCHAR(100), -- Quem tirou a foto
    dispositivo VARCHAR(100), -- EXIF se disponível

    -- Organização
    album_id UUID, -- Para futuro
    destaque BOOLEAN DEFAULT false,
    ordem INT DEFAULT 0,

    -- Metadados sistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_fotos_obra ON obra_fotografias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_data ON obra_fotografias(data_fotografia DESC);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_zona ON obra_fotografias(zona_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_espec ON obra_fotografias(especialidade_id);

-- =====================================================
-- RELATÓRIOS DE OBRA
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_relatorios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL, -- Ex: "REL-001"
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'semanal', -- 'semanal', 'quinzenal', 'mensal', 'milestone'

    -- Período
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    -- Conteúdo
    resumo_executivo TEXT,
    trabalhos_realizados TEXT,
    trabalhos_proxima_semana TEXT,
    problemas_identificados TEXT,
    decisoes_pendentes TEXT,
    observacoes TEXT,

    -- Progresso
    progresso_global INT, -- 0-100
    progresso_por_especialidade JSONB, -- {"esp_id": 45, "esp_id2": 30}

    -- Estado
    estado VARCHAR(50) DEFAULT 'rascunho', -- 'rascunho', 'em_revisao', 'publicado'
    data_publicacao TIMESTAMP WITH TIME ZONE,

    -- Responsável
    autor_id UUID REFERENCES utilizadores(id),
    revisor_id UUID REFERENCES utilizadores(id),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fotografias anexas ao relatório
CREATE TABLE IF NOT EXISTS obra_relatorio_fotos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    relatorio_id UUID NOT NULL REFERENCES obra_relatorios(id) ON DELETE CASCADE,
    fotografia_id UUID NOT NULL REFERENCES obra_fotografias(id) ON DELETE CASCADE,
    legenda TEXT,
    ordem INT DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_relatorios_obra ON obra_relatorios(obra_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_estado ON obra_relatorios(estado);

-- =====================================================
-- NÃO CONFORMIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS nao_conformidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50) NOT NULL, -- Ex: "NC-001"
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,

    -- Classificação
    especialidade_id UUID REFERENCES especialidades(id),
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    tipo VARCHAR(50) DEFAULT 'execucao', -- 'execucao', 'material', 'projeto', 'seguranca'
    gravidade VARCHAR(50) DEFAULT 'menor', -- 'menor', 'maior', 'critica'

    -- Datas
    data_identificacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_limite_resolucao DATE,
    data_resolucao DATE,
    data_verificacao DATE,

    -- Estado
    estado VARCHAR(50) DEFAULT 'aberta', -- 'aberta', 'em_resolucao', 'resolvida', 'verificada', 'encerrada'

    -- Responsabilidades
    identificado_por UUID REFERENCES utilizadores(id),
    responsavel_resolucao VARCHAR(255), -- Pode ser externo
    verificado_por UUID REFERENCES utilizadores(id),

    -- Resolução
    acao_corretiva TEXT,
    acao_preventiva TEXT,
    resultado_verificacao TEXT,

    -- Impacto
    impacto_prazo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    impacto_custo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    custo_estimado DECIMAL(10,2),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

-- Fotografias anexas à NC
CREATE TABLE IF NOT EXISTS nc_fotografias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nc_id UUID NOT NULL REFERENCES nao_conformidades(id) ON DELETE CASCADE,
    fotografia_id UUID REFERENCES obra_fotografias(id) ON DELETE CASCADE,
    url TEXT, -- Se upload direto
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'identificacao', -- 'identificacao', 'resolucao', 'verificacao'
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de alterações da NC
CREATE TABLE IF NOT EXISTS nc_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nc_id UUID NOT NULL REFERENCES nao_conformidades(id) ON DELETE CASCADE,

    acao VARCHAR(100) NOT NULL, -- 'criada', 'estado_alterado', 'atribuida', 'comentario', etc.
    descricao TEXT,
    estado_anterior VARCHAR(50),
    estado_novo VARCHAR(50),

    utilizador_id UUID REFERENCES utilizadores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nc_obra ON nao_conformidades(obra_id);
CREATE INDEX IF NOT EXISTS idx_nc_estado ON nao_conformidades(estado);
CREATE INDEX IF NOT EXISTS idx_nc_especialidade ON nao_conformidades(especialidade_id);
CREATE INDEX IF NOT EXISTS idx_nc_data ON nao_conformidades(data_identificacao DESC);

-- =====================================================
-- DIÁRIO DE PROJETO DA OBRA (separado do Diário de Obra)
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_diario_categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20) DEFAULT '#5F5C59',
    icone VARCHAR(50) DEFAULT 'FileText',
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão para diário de projeto de obra
INSERT INTO obra_diario_categorias (nome, cor, icone, ordem) VALUES
  ('Decisão de Design', '#8B5CF6', 'PenTool', 1),
  ('Instrução', '#3B82F6', 'ClipboardList', 2),
  ('Alteração de Âmbito', '#F59E0B', 'AlertTriangle', 3),
  ('Reunião', '#10B981', 'Users', 4),
  ('Comunicação Cliente', '#EC4899', 'Mail', 5),
  ('Pedido de Informação', '#6366F1', 'HelpCircle', 6),
  ('Aprovação', '#059669', 'CheckSquare', 7),
  ('Ocorrência', '#EF4444', 'AlertTriangle', 8)
ON CONFLICT DO NOTHING;

-- Tags para diário de projeto de obra
CREATE TABLE IF NOT EXISTS obra_diario_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(20) DEFAULT '#C3BAAF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tags padrão
INSERT INTO obra_diario_tags (nome, cor) VALUES
  ('Urgente', '#EF4444'),
  ('Aguarda Aprovação', '#F59E0B'),
  ('Impacto Custo', '#8B5CF6'),
  ('Impacto Prazo', '#3B82F6'),
  ('Resolvido', '#10B981'),
  ('Pendente', '#6B7280')
ON CONFLICT DO NOTHING;

-- Entradas do diário de projeto da obra
CREATE TABLE IF NOT EXISTS obra_diario_projeto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

    -- Identificação
    codigo VARCHAR(50), -- Ex: "DP-001"

    -- Conteúdo
    titulo VARCHAR(500) NOT NULL,
    descricao TEXT,

    -- Classificação
    categoria_id UUID REFERENCES obra_diario_categorias(id),
    tipo VARCHAR(50) DEFAULT 'manual',
    fonte VARCHAR(100) DEFAULT 'manual',

    -- Contexto
    participantes TEXT[], -- Pessoas envolvidas
    referencias TEXT[], -- Docs, emails, NCs referenciados

    -- Impacto
    impacto_prazo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    impacto_custo VARCHAR(50), -- 'nenhum', 'menor', 'significativo'
    requer_aprovacao BOOLEAN DEFAULT false,

    -- Follow-up
    accoes_requeridas TEXT,
    responsavel_accao VARCHAR(255),
    data_limite DATE,

    -- Estado
    estado VARCHAR(50) DEFAULT 'registado', -- 'registado', 'em_curso', 'concluido'

    -- Anexos
    anexos JSONB DEFAULT '[]',

    -- Timestamps
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

-- Relação muitos-para-muitos entre entradas e tags
CREATE TABLE IF NOT EXISTS obra_diario_projeto_tags (
    diario_id UUID REFERENCES obra_diario_projeto(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES obra_diario_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (diario_id, tag_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_obra ON obra_diario_projeto(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_categoria ON obra_diario_projeto(categoria_id);
CREATE INDEX IF NOT EXISTS idx_obra_diario_projeto_data ON obra_diario_projeto(data_evento DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_fotografias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_relatorio_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_fotografias ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_projeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_diario_projeto_tags ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para utilizadores autenticados
CREATE POLICY "Allow all for authenticated users" ON especialidades FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_fotografias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_relatorios FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_relatorio_fotos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nao_conformidades FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nc_fotografias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON nc_historico FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_categorias FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_projeto FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON obra_diario_projeto_tags FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_obra_fotografias_updated_at
  BEFORE UPDATE ON obra_fotografias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_obra_relatorios_updated_at
  BEFORE UPDATE ON obra_relatorios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_nao_conformidades_updated_at
  BEFORE UPDATE ON nao_conformidades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_obra_diario_projeto_updated_at
  BEFORE UPDATE ON obra_diario_projeto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
