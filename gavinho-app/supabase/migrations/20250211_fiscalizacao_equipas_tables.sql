-- =====================================================
-- MIGRATION: Fiscalizacao + Equipas tables
-- Creates: obra_hso, obra_ocorrencias, obra_subempreiteiros
-- =====================================================

-- 1. HSO (Higiene, Seguranca, Obra) inspections
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

-- 2. Ocorrencias (incidents/events on site)
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

-- 3. SubEmpreiteiros
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
