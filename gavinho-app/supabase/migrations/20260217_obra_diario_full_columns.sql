-- =====================================================
-- MIGRAÇÃO: obra_diario — Adicionar colunas em falta
-- Alinha a tabela com o código DiarioObra.jsx (desktop + mobile)
-- Data: 2026-02-17
-- Seguro: usa ADD COLUMN IF NOT EXISTS
-- =====================================================

-- 1. Condições meteorológicas (código usa condicoes_meteo, não condicoes_meteorologicas)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS condicoes_meteo TEXT;

-- 2. Temperatura única (código usa um campo só, não min/max)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS temperatura DECIMAL(4,1);

-- 3. Observações meteorológicas
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS observacoes_meteo TEXT;

-- 4. Função do autor (Encarregado, Director, etc.)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS funcao TEXT;

-- 5. Trabalhadores como JSONB (array de objectos com nome, funcao, tipo, estado)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS trabalhadores JSONB DEFAULT '[]'::jsonb;

-- 6. Tarefas executadas como JSONB
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS tarefas JSONB DEFAULT '[]'::jsonb;

-- 7. Ocorrências/incidentes como JSONB
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS ocorrencias JSONB DEFAULT '[]'::jsonb;

-- 8. Não conformidades como JSONB
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS nao_conformidades JSONB DEFAULT '[]'::jsonb;

-- 9. Fotos como JSONB (array de URLs do Storage)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb;

-- 10. Próximos passos como JSONB
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS proximos_passos JSONB DEFAULT '[]'::jsonb;

-- 11. Status (rascunho, submetido)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho';

-- 12. Updated at (para tracking de última gravação)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 13. Contadores rápidos para queries (desktop preenche via JSON, mobile usa directo)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS trabalhadores_gavinho INTEGER DEFAULT 0;
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS trabalhadores_subempreiteiros INTEGER DEFAULT 0;

-- =====================================================
-- Migrar dados existentes se condicoes_meteorologicas tiver dados
-- =====================================================
UPDATE obra_diario
SET condicoes_meteo = LOWER(condicoes_meteorologicas)
WHERE condicoes_meteorologicas IS NOT NULL
  AND condicoes_meteo IS NULL;

-- Migrar temperatura_min para temperatura (se existir)
UPDATE obra_diario
SET temperatura = temperatura_min
WHERE temperatura_min IS NOT NULL
  AND temperatura IS NULL;

-- Migrar mao_obra_propria → trabalhadores_gavinho
UPDATE obra_diario
SET trabalhadores_gavinho = mao_obra_propria
WHERE mao_obra_propria IS NOT NULL
  AND mao_obra_propria > 0
  AND trabalhadores_gavinho = 0;

-- Migrar mao_obra_subempreiteiro → trabalhadores_subempreiteiros
UPDATE obra_diario
SET trabalhadores_subempreiteiros = mao_obra_subempreiteiro
WHERE mao_obra_subempreiteiro IS NOT NULL
  AND mao_obra_subempreiteiro > 0
  AND trabalhadores_subempreiteiros = 0;

-- =====================================================
-- Trigger para auto-update do updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_obra_diario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_obra_diario_updated_at ON obra_diario;
CREATE TRIGGER trigger_obra_diario_updated_at
  BEFORE UPDATE ON obra_diario
  FOR EACH ROW
  EXECUTE FUNCTION update_obra_diario_updated_at();

-- =====================================================
-- Constraint: uma entrada por obra por dia
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'obra_diario_obra_data_unique'
  ) THEN
    ALTER TABLE obra_diario ADD CONSTRAINT obra_diario_obra_data_unique UNIQUE (obra_id, data);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Unique constraint already exists or conflicting data. Skipping.';
END $$;

-- =====================================================
-- Storage bucket obra-fotos (run in Dashboard if needed)
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('obra-fotos', 'obra-fotos', true)
-- ON CONFLICT (id) DO NOTHING;
