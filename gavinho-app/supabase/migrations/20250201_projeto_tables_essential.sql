-- =====================================================
-- TABELAS ESSENCIAIS DE PROJETO
-- Tabelas que dependem apenas de 'projetos' e 'clientes'
-- =====================================================

-- =====================================================
-- 1. projeto_pagamentos
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  prestacao_numero INTEGER,
  descricao TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendente', -- pendente, pago, atrasado, cancelado
  data_prevista DATE,
  data_pagamento DATE,
  metodo_pagamento TEXT,
  comprovativo_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_projeto_id ON projeto_pagamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_pagamentos_estado ON projeto_pagamentos(estado);

ALTER TABLE projeto_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_pagamentos_select" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_insert" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_update" ON projeto_pagamentos;
DROP POLICY IF EXISTS "projeto_pagamentos_delete" ON projeto_pagamentos;

CREATE POLICY "projeto_pagamentos_select" ON projeto_pagamentos FOR SELECT USING (true);
CREATE POLICY "projeto_pagamentos_insert" ON projeto_pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_pagamentos_update" ON projeto_pagamentos FOR UPDATE USING (true);
CREATE POLICY "projeto_pagamentos_delete" ON projeto_pagamentos FOR DELETE USING (true);

-- =====================================================
-- 2. projeto_servicos
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  valor DECIMAL(12,2) DEFAULT 0,
  fase TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_servicos_projeto_id ON projeto_servicos(projeto_id);

ALTER TABLE projeto_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_servicos_select" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_insert" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_update" ON projeto_servicos;
DROP POLICY IF EXISTS "projeto_servicos_delete" ON projeto_servicos;

CREATE POLICY "projeto_servicos_select" ON projeto_servicos FOR SELECT USING (true);
CREATE POLICY "projeto_servicos_insert" ON projeto_servicos FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_servicos_update" ON projeto_servicos FOR UPDATE USING (true);
CREATE POLICY "projeto_servicos_delete" ON projeto_servicos FOR DELETE USING (true);

-- =====================================================
-- 3. projeto_duvidas (para archviz questions)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_duvidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  utilizador_id UUID,
  entregavel_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_referencia TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, em_analise, respondido, fechado
  resposta TEXT,
  respondido_por UUID,
  respondido_em TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projeto_duvidas_projeto_id ON projeto_duvidas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_duvidas_status ON projeto_duvidas(status);

ALTER TABLE projeto_duvidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_duvidas_select" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_insert" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_update" ON projeto_duvidas;
DROP POLICY IF EXISTS "projeto_duvidas_delete" ON projeto_duvidas;

CREATE POLICY "projeto_duvidas_select" ON projeto_duvidas FOR SELECT USING (true);
CREATE POLICY "projeto_duvidas_insert" ON projeto_duvidas FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_duvidas_update" ON projeto_duvidas FOR UPDATE USING (true);
CREATE POLICY "projeto_duvidas_delete" ON projeto_duvidas FOR DELETE USING (true);

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_projeto_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projeto_pagamentos_updated_at ON projeto_pagamentos;
CREATE TRIGGER trigger_projeto_pagamentos_updated_at
  BEFORE UPDATE ON projeto_pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_projeto_pagamentos_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE projeto_pagamentos IS 'Pagamentos/prestacoes do projeto';
COMMENT ON TABLE projeto_servicos IS 'Servicos contratados para o projeto';
COMMENT ON TABLE projeto_duvidas IS 'Duvidas e pedidos de definicao sobre renders/entregaveis';

-- Log migration (guarded: table may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, nome, executado_em)
    VALUES ('20250201_projeto_tables_essential', '20250201_projeto_tables_essential', NOW())
    ON CONFLICT (seed_key) DO UPDATE SET executado_em = NOW();
  END IF;
END $$;
