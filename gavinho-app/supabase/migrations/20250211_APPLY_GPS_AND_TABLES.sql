-- =====================================================
-- APPLY: GPS coordinates for GB00402 + Pending tables
-- Run in Supabase SQL Editor
-- Date: 2025-02-11
-- =====================================================

-- =====================================================
-- PART 1: Set GPS coordinates for obra GB00402
-- =====================================================
UPDATE obras
SET latitude = 38.721908,
    longitude = -9.133819,
    raio_geofence = 30
WHERE codigo = 'GB00402';

-- =====================================================
-- PART 2: Acompanhamento tables (IF NOT EXISTS)
-- Creates: obra_zonas, especialidades, obra_fotografias,
--          nao_conformidades, obra_relatorios
-- =====================================================

-- Zonas de Obra
CREATE TABLE IF NOT EXISTS obra_zonas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(100) NOT NULL,
    piso VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'Divisão',
    area_m2 DECIMAL(10,2),
    progresso INT DEFAULT 0,
    notas TEXT,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_zonas_obra ON obra_zonas(obra_id);

ALTER TABLE obra_zonas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_zonas' AND policyname = 'obra_zonas_all') THEN
    CREATE POLICY "obra_zonas_all" ON obra_zonas FOR ALL USING (true);
  END IF;
END $$;

-- Especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20) NOT NULL DEFAULT '#8B8670',
    icone VARCHAR(50) DEFAULT 'wrench',
    categoria VARCHAR(50),
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO especialidades (nome, cor, icone, categoria, ordem) VALUES
('Estrutura', '#8B7355', 'building-2', 'estrutura', 1),
('Alvenarias', '#A0855B', 'brick-wall', 'estrutura', 2),
('Impermeabilização', '#7A6B5A', 'shield-check', 'estrutura', 3),
('AVAC', '#5B8BA0', 'wind', 'mep', 10),
('Elétrico', '#D4A84B', 'zap', 'mep', 11),
('Hidráulica', '#6B8E8E', 'droplets', 'mep', 12),
('Gás', '#E07B54', 'flame', 'mep', 13),
('Carpintaria', '#A67C52', 'layers', 'acabamentos', 20),
('Serralharia', '#7A7A7A', 'wrench', 'acabamentos', 21),
('Pintura', '#9B8B7A', 'paintbrush', 'acabamentos', 22),
('Revestimentos', '#6B7280', 'grid-3x3', 'acabamentos', 23),
('Caixilharia', '#5D6D7E', 'square', 'acabamentos', 24),
('Vidros', '#85C1E9', 'maximize-2', 'acabamentos', 25),
('Paisagismo', '#27AE60', 'tree-pine', 'exteriores', 30),
('Piscina', '#3498DB', 'waves', 'exteriores', 31)
ON CONFLICT DO NOTHING;

ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'especialidades' AND policyname = 'especialidades_all') THEN
    CREATE POLICY "especialidades_all" ON especialidades FOR ALL USING (true);
  END IF;
END $$;

-- Fotografias
CREATE TABLE IF NOT EXISTS obra_fotografias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    tamanho_bytes INTEGER,
    largura INTEGER,
    altura INTEGER,
    titulo VARCHAR(255),
    descricao TEXT,
    data_fotografia TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    especialidade_id UUID REFERENCES especialidades(id) ON DELETE SET NULL,
    autor_id UUID REFERENCES utilizadores(id),
    autor_nome VARCHAR(255),
    tags TEXT[],
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    visivel_cliente BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_fotografias_obra ON obra_fotografias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotografias_data ON obra_fotografias(data_fotografia DESC);

ALTER TABLE obra_fotografias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_fotografias' AND policyname = 'obra_fotografias_all') THEN
    CREATE POLICY "obra_fotografias_all" ON obra_fotografias FOR ALL USING (true);
  END IF;
END $$;

-- Nao Conformidades
CREATE TABLE IF NOT EXISTS nao_conformidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    codigo VARCHAR(50),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'execucao',
    gravidade VARCHAR(50) DEFAULT 'menor',
    estado VARCHAR(50) DEFAULT 'aberta',
    data_identificacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
    especialidade_id UUID REFERENCES especialidades(id) ON DELETE SET NULL,
    identificado_por UUID REFERENCES utilizadores(id),
    data_limite_resolucao DATE,
    responsavel_resolucao VARCHAR(255),
    acao_corretiva TEXT,
    acao_preventiva TEXT,
    verificado_por UUID REFERENCES utilizadores(id),
    verificado_em TIMESTAMP WITH TIME ZONE,
    fotos TEXT[],
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_obra ON nao_conformidades(obra_id);
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_estado ON nao_conformidades(estado);

ALTER TABLE nao_conformidades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nao_conformidades' AND policyname = 'nao_conformidades_all') THEN
    CREATE POLICY "nao_conformidades_all" ON nao_conformidades FOR ALL USING (true);
  END IF;
END $$;

-- Relatorios
CREATE TABLE IF NOT EXISTS obra_relatorios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    codigo VARCHAR(50),
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'semanal',
    data_inicio DATE,
    data_fim DATE,
    estado VARCHAR(50) DEFAULT 'rascunho',
    resumo_executivo TEXT,
    trabalhos_realizados TEXT,
    trabalhos_proxima_semana TEXT,
    problemas_identificados TEXT,
    progresso_global INTEGER DEFAULT 0,
    criado_por UUID REFERENCES utilizadores(id),
    aprovado_por UUID REFERENCES utilizadores(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_relatorios_obra ON obra_relatorios(obra_id);

ALTER TABLE obra_relatorios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_relatorios' AND policyname = 'obra_relatorios_all') THEN
    CREATE POLICY "obra_relatorios_all" ON obra_relatorios FOR ALL USING (true);
  END IF;
END $$;

-- =====================================================
-- PART 3: Fiscalizacao + Equipas tables
-- Creates: obra_hso, obra_ocorrencias, obra_subempreiteiros
-- =====================================================

-- HSO (Higiene, Seguranca, Obra) inspections
CREATE TABLE IF NOT EXISTS obra_hso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo VARCHAR(50),
  data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(50) DEFAULT 'rotina',
  inspector VARCHAR(255),
  area_inspecionada TEXT,
  conforme BOOLEAN,
  observacoes TEXT,
  acoes_corretivas TEXT,
  prazo_resolucao DATE,
  estado VARCHAR(50) DEFAULT 'pendente',
  gravidade VARCHAR(50) DEFAULT 'baixa',
  resolvido_em DATE,
  created_by UUID REFERENCES utilizadores(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_hso_obra ON obra_hso(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_hso_data ON obra_hso(data_inspecao DESC);
CREATE INDEX IF NOT EXISTS idx_obra_hso_estado ON obra_hso(estado);

ALTER TABLE obra_hso ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_hso' AND policyname = 'obra_hso_all') THEN
    CREATE POLICY "obra_hso_all" ON obra_hso FOR ALL USING (true);
  END IF;
END $$;

-- Ocorrencias
CREATE TABLE IF NOT EXISTS obra_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo VARCHAR(50),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  data_ocorrencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(50) DEFAULT 'incidente',
  gravidade VARCHAR(50) DEFAULT 'baixa',
  zona_id UUID REFERENCES obra_zonas(id) ON DELETE SET NULL,
  envolvidos TEXT,
  acao_imediata TEXT,
  acao_corretiva TEXT,
  estado VARCHAR(50) DEFAULT 'registada',
  reportado_por UUID REFERENCES utilizadores(id),
  resolvido_em TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_ocorrencias_obra ON obra_ocorrencias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_ocorrencias_data ON obra_ocorrencias(data_ocorrencia DESC);
CREATE INDEX IF NOT EXISTS idx_obra_ocorrencias_estado ON obra_ocorrencias(estado);

ALTER TABLE obra_ocorrencias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_ocorrencias' AND policyname = 'obra_ocorrencias_all') THEN
    CREATE POLICY "obra_ocorrencias_all" ON obra_ocorrencias FOR ALL USING (true);
  END IF;
END $$;

-- SubEmpreiteiros
CREATE TABLE IF NOT EXISTS obra_subempreiteiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  nif VARCHAR(20),
  contacto VARCHAR(100),
  email VARCHAR(255),
  especialidade_id UUID REFERENCES especialidades(id),
  contrato_valor DECIMAL(12,2),
  contrato_inicio DATE,
  contrato_fim DATE,
  estado VARCHAR(50) DEFAULT 'ativo',
  avaliacao INTEGER,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_subempreiteiros_obra ON obra_subempreiteiros(obra_id);

ALTER TABLE obra_subempreiteiros ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obra_subempreiteiros' AND policyname = 'obra_subempreiteiros_all') THEN
    CREATE POLICY "obra_subempreiteiros_all" ON obra_subempreiteiros FOR ALL USING (true);
  END IF;
END $$;

-- =====================================================
-- DONE! Verify:
-- SELECT codigo, latitude, longitude, raio_geofence FROM obras WHERE codigo = 'GB00402';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('obra_hso', 'obra_ocorrencias', 'obra_subempreiteiros', 'obra_zonas', 'especialidades', 'obra_fotografias', 'nao_conformidades', 'obra_relatorios');
-- =====================================================
