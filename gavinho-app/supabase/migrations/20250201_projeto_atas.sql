-- =====================================================
-- PROJETO ATAS TABLE
-- Atas de reuniao para projetos
-- =====================================================

-- Criar tabela de atas
CREATE TABLE IF NOT EXISTS projeto_atas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  fase VARCHAR(100),

  -- Informacoes da reuniao
  titulo VARCHAR(500) NOT NULL,
  data_reuniao DATE NOT NULL,
  local VARCHAR(255),
  hora_inicio TIME,
  hora_fim TIME,

  -- Participantes (JSON array)
  participantes JSONB DEFAULT '[]',

  -- Conteudo da ata (HTML rich text)
  conteudo TEXT,

  -- Ordem do dia (JSON array)
  ordem_dia JSONB DEFAULT '[]',

  -- Decisoes tomadas (JSON array)
  decisoes JSONB DEFAULT '[]',

  -- Acoes a realizar (JSON array com responsavel e prazo)
  acoes JSONB DEFAULT '[]',

  -- Proxima reuniao
  proxima_reuniao DATE,
  proxima_reuniao_local VARCHAR(255),
  proxima_reuniao_hora TIME,

  -- Metadata
  numero_ata INTEGER,
  status VARCHAR(50) DEFAULT 'rascunho',
  criado_por UUID REFERENCES utilizadores(id),
  aprovado_por UUID REFERENCES utilizadores(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_projeto_atas_projeto ON projeto_atas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_data ON projeto_atas(data_reuniao DESC);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_fase ON projeto_atas(fase);
CREATE INDEX IF NOT EXISTS idx_projeto_atas_status ON projeto_atas(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_projeto_atas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_atas_updated_at ON projeto_atas;
CREATE TRIGGER trigger_projeto_atas_updated_at
  BEFORE UPDATE ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_atas_updated_at();

-- Funcao para auto-incrementar numero_ata por projeto
CREATE OR REPLACE FUNCTION auto_increment_numero_ata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_ata IS NULL THEN
    SELECT COALESCE(MAX(numero_ata), 0) + 1
    INTO NEW.numero_ata
    FROM projeto_atas
    WHERE projeto_id = NEW.projeto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_increment_numero_ata ON projeto_atas;
CREATE TRIGGER trigger_auto_increment_numero_ata
  BEFORE INSERT ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_numero_ata();

-- RLS
ALTER TABLE projeto_atas ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "projeto_atas_select" ON projeto_atas
  FOR SELECT USING (true);

CREATE POLICY "projeto_atas_insert" ON projeto_atas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "projeto_atas_update" ON projeto_atas
  FOR UPDATE USING (true);

CREATE POLICY "projeto_atas_delete" ON projeto_atas
  FOR DELETE USING (true);

-- Comentarios
COMMENT ON TABLE projeto_atas IS 'Atas de reuniao de projetos';
COMMENT ON COLUMN projeto_atas.participantes IS 'Array JSON de participantes [{nome, cargo, entidade}]';
COMMENT ON COLUMN projeto_atas.conteudo IS 'Conteudo HTML da ata (rich text)';
COMMENT ON COLUMN projeto_atas.ordem_dia IS 'Array JSON de pontos da ordem do dia';
COMMENT ON COLUMN projeto_atas.decisoes IS 'Array JSON de decisoes [{texto, responsavel}]';
COMMENT ON COLUMN projeto_atas.acoes IS 'Array JSON de acoes [{descricao, responsavel, prazo, concluida}]';
COMMENT ON COLUMN projeto_atas.status IS 'Status: rascunho, pendente_aprovacao, aprovada, arquivada';
