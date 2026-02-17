-- =====================================================
-- OBRA PENDENTES — Tabela para rastrear tarefas bloqueadas
-- e não conformes criadas automaticamente a partir do diário
-- =====================================================

-- Tabela obra_pendentes
-- Cada entrada representa um pendente (bloqueio ou NC) criado
-- automaticamente quando uma tarefa do diário tem estado
-- 'bloqueado' ou 'nao_conforme'. Fica aberto até ser resolvido
-- num diário futuro.
CREATE TABLE IF NOT EXISTS obra_pendentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    diario_entrada_id UUID REFERENCES obra_diario(id) ON DELETE SET NULL,
    tarefa_index INT NOT NULL DEFAULT 0,

    -- Tipo: 'bloqueio' ou 'nao_conforme'
    tipo TEXT NOT NULL CHECK (tipo IN ('bloqueio', 'nao_conforme')),

    -- Descricao da tarefa / problema
    descricao TEXT NOT NULL,

    -- Especialidade e zona (copiadas da tarefa para fácil consulta)
    especialidade TEXT,
    zona TEXT,

    -- Estado: 'aberto' ou 'resolvido'
    estado TEXT NOT NULL DEFAULT 'aberto' CHECK (estado IN ('aberto', 'resolvido')),

    -- Datas
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_resolucao DATE,

    -- Quem resolveu (entrada de diário onde foi marcado como concluído)
    resolved_by_diario_id UUID REFERENCES obra_diario(id) ON DELETE SET NULL,
    resolved_by_user TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obra_pendentes_obra ON obra_pendentes(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_pendentes_estado ON obra_pendentes(estado);
CREATE INDEX IF NOT EXISTS idx_obra_pendentes_obra_aberto ON obra_pendentes(obra_id, estado) WHERE estado = 'aberto';
CREATE INDEX IF NOT EXISTS idx_obra_pendentes_diario ON obra_pendentes(diario_entrada_id);

-- RLS
ALTER TABLE obra_pendentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON obra_pendentes;
CREATE POLICY "Allow all for authenticated users" ON obra_pendentes FOR ALL USING (true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_obra_pendentes_updated_at ON obra_pendentes;
CREATE TRIGGER trigger_obra_pendentes_updated_at
  BEFORE UPDATE ON obra_pendentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
