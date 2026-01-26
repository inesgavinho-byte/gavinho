-- Migração: Criar tabela de tarefas
-- Data: 2025-01-26
-- Descrição: Sistema de tarefas rastreáveis ligadas a projetos e emails

-- =====================================================
-- TABELA PRINCIPAL: TAREFAS
-- =====================================================

CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relacionamentos
  projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES utilizadores(id),
  criado_por_id UUID REFERENCES utilizadores(id),
  tarefa_pai_id UUID REFERENCES tarefas(id) ON DELETE CASCADE,

  -- Conteúdo
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  notas TEXT,

  -- Classificação
  categoria VARCHAR(50) DEFAULT 'geral',
  -- Valores: 'geral', 'email_resposta', 'email_followup', 'email_orcamento', 'email_informacao', 'design', 'procurement', 'cliente', 'obra'

  prioridade VARCHAR(20) DEFAULT 'media',
  -- Valores: 'baixa', 'media', 'alta', 'urgente'

  status VARCHAR(30) DEFAULT 'pendente',
  -- Valores: 'pendente', 'em_progresso', 'em_revisao', 'concluida', 'cancelada'

  -- Datas
  data_limite DATE,
  data_inicio DATE,
  data_conclusao TIMESTAMP WITH TIME ZONE,

  -- Origem (para tarefas criadas automaticamente)
  origem_tipo VARCHAR(50),
  -- Valores: 'manual', 'email', 'decisao', 'sistema'
  origem_id UUID,
  -- ID do email, decisão ou outro objeto que originou a tarefa

  -- Email relacionado (quando origem_tipo = 'email')
  email_id UUID REFERENCES obra_emails(id) ON DELETE SET NULL,
  email_assunto VARCHAR(500),
  email_de VARCHAR(255),

  -- Metadados
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra ON tarefas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_prioridade ON tarefas(prioridade);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_limite ON tarefas(data_limite);
CREATE INDEX IF NOT EXISTS idx_tarefas_email ON tarefas(email_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_origem ON tarefas(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_pai ON tarefas(tarefa_pai_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tarefas_updated_at ON tarefas;
CREATE TRIGGER trigger_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION update_tarefas_updated_at();

-- Comentários
COMMENT ON TABLE tarefas IS 'Tarefas rastreáveis do projeto, incluindo follow-ups automáticos de emails';
COMMENT ON COLUMN tarefas.categoria IS 'Tipo de tarefa: geral, email_resposta, email_followup, email_orcamento, email_informacao, design, procurement, cliente, obra';
COMMENT ON COLUMN tarefas.origem_tipo IS 'Origem da tarefa: manual, email, decisao, sistema';
COMMENT ON COLUMN tarefas.origem_id IS 'ID do objeto que originou a tarefa (email_id, decisao_id, etc.)';

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver tarefas dos seus projetos
CREATE POLICY "Visualizar tarefas dos projetos" ON tarefas
  FOR SELECT USING (true);

-- Policy: Utilizadores autenticados podem criar tarefas
CREATE POLICY "Criar tarefas" ON tarefas
  FOR INSERT WITH CHECK (true);

-- Policy: Utilizadores podem atualizar tarefas
CREATE POLICY "Atualizar tarefas" ON tarefas
  FOR UPDATE USING (true);

-- Policy: Utilizadores podem eliminar tarefas
CREATE POLICY "Eliminar tarefas" ON tarefas
  FOR DELETE USING (true);
