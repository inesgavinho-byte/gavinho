-- =====================================================
-- ACOMPANHAMENTO DE PROJETO (Monitoring when GAVINHO doesn't execute)
-- Tables: visitas + fotos for site photography
--         desenhos_obra + anotacoes for construction drawings
-- =====================================================

-- =====================================================
-- 1. VISITAS DE ACOMPANHAMENTO (site visits for monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_acompanhamento_visitas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id TEXT NOT NULL,

    -- Identification
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_visita DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Classification
    tipo VARCHAR(50) DEFAULT 'rotina', -- 'rotina', 'milestone', 'problema', 'entrega'

    -- Metadata
    participantes TEXT[],
    notas TEXT,
    ordem INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_acomp_visitas_projeto ON projeto_acompanhamento_visitas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_acomp_visitas_data ON projeto_acompanhamento_visitas(data_visita DESC);

-- =====================================================
-- 2. FOTOGRAFIAS DE ACOMPANHAMENTO (photos per visit)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_acompanhamento_fotos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visita_id UUID NOT NULL REFERENCES projeto_acompanhamento_visitas(id) ON DELETE CASCADE,
    projeto_id TEXT NOT NULL,

    -- File
    url TEXT NOT NULL,
    file_path TEXT,
    filename VARCHAR(255),

    -- Metadata
    titulo VARCHAR(255),
    descricao TEXT,
    tags TEXT[],
    destaque BOOLEAN DEFAULT false,
    ordem INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_acomp_fotos_visita ON projeto_acompanhamento_fotos(visita_id);
CREATE INDEX IF NOT EXISTS idx_acomp_fotos_projeto ON projeto_acompanhamento_fotos(projeto_id);

-- =====================================================
-- 3. DESENHOS EM USO OBRA (drawing packages for construction)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_desenhos_obra (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id TEXT NOT NULL,

    -- File
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    url TEXT NOT NULL,
    file_path TEXT,
    filename VARCHAR(255),

    -- Classification
    tipo VARCHAR(50) DEFAULT 'planta', -- 'planta', 'corte', 'alcado', 'detalhe', 'mapa_quantidades'
    especialidade VARCHAR(100), -- 'Arquitetura', 'Estruturas', 'Elétrico', etc.
    versao VARCHAR(20) DEFAULT 'v1',
    data_entrega DATE DEFAULT CURRENT_DATE,

    -- Status
    estado VARCHAR(50) DEFAULT 'em_uso', -- 'em_uso', 'substituido', 'anulado'

    -- Metadata
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_desenhos_obra_projeto ON projeto_desenhos_obra(projeto_id);
CREATE INDEX IF NOT EXISTS idx_desenhos_obra_tipo ON projeto_desenhos_obra(tipo);

-- =====================================================
-- 4. ANOTAÇÕES EM DESENHOS (handwritten + text annotations)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_desenho_anotacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    desenho_id UUID NOT NULL REFERENCES projeto_desenhos_obra(id) ON DELETE CASCADE,

    -- Page reference (for multi-page PDFs)
    pagina INT DEFAULT 1,

    -- Annotation data
    tipo VARCHAR(50) DEFAULT 'desenho', -- 'desenho' (freehand), 'texto', 'pin'
    dados JSONB NOT NULL, -- For 'desenho': {paths: [...], color, width}
                          -- For 'texto': {x, y, text, fontSize}
                          -- For 'pin': {x, y, foto_url, descricao}

    -- Visual
    cor VARCHAR(20) DEFAULT '#EF4444',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    created_by_name VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_desenho_anotacoes_desenho ON projeto_desenho_anotacoes(desenho_id);
CREATE INDEX IF NOT EXISTS idx_desenho_anotacoes_pagina ON projeto_desenho_anotacoes(pagina);

-- =====================================================
-- 5. PINS COM FOTOS EM DESENHOS (photo pins on floor plans)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_desenho_pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    desenho_id UUID NOT NULL REFERENCES projeto_desenhos_obra(id) ON DELETE CASCADE,

    -- Position (percentage-based for responsiveness)
    pos_x DECIMAL(8,4) NOT NULL, -- 0-100 percentage
    pos_y DECIMAL(8,4) NOT NULL, -- 0-100 percentage
    pagina INT DEFAULT 1,

    -- Photo
    foto_url TEXT NOT NULL,
    foto_path TEXT,

    -- Content
    titulo VARCHAR(255),
    descricao TEXT,
    cor VARCHAR(20) DEFAULT '#4a5d4a',

    -- Metadata
    data_foto DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_desenho_pins_desenho ON projeto_desenho_pins(desenho_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE projeto_acompanhamento_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_acompanhamento_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_desenhos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_desenho_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_desenho_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_acompanhamento_visitas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_acompanhamento_fotos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_desenhos_obra;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_desenho_anotacoes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_desenho_pins;

CREATE POLICY "Allow all for authenticated users" ON projeto_acompanhamento_visitas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_acompanhamento_fotos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_desenhos_obra FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_desenho_anotacoes FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projeto_desenho_pins FOR ALL USING (true);

-- =====================================================
-- TRIGGERS (updated_at)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_acomp_visitas_updated_at ON projeto_acompanhamento_visitas;
DROP TRIGGER IF EXISTS trigger_desenhos_obra_updated_at ON projeto_desenhos_obra;
DROP TRIGGER IF EXISTS trigger_desenho_anotacoes_updated_at ON projeto_desenho_anotacoes;
DROP TRIGGER IF EXISTS trigger_desenho_pins_updated_at ON projeto_desenho_pins;

CREATE TRIGGER trigger_acomp_visitas_updated_at
  BEFORE UPDATE ON projeto_acompanhamento_visitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_desenhos_obra_updated_at
  BEFORE UPDATE ON projeto_desenhos_obra
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_desenho_anotacoes_updated_at
  BEFORE UPDATE ON projeto_desenho_anotacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_desenho_pins_updated_at
  BEFORE UPDATE ON projeto_desenho_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
