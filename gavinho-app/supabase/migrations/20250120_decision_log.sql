-- =====================================================
-- DECISION LOG - Schema
-- Registo de dúvidas e decisões do projeto
-- =====================================================

-- Sequência para IDs
CREATE SEQUENCE IF NOT EXISTS decision_seq START 1;

-- Tabela principal de decisões
CREATE TABLE IF NOT EXISTS project_decisions (
  id TEXT PRIMARY KEY DEFAULT ('DEC-' || LPAD(nextval('decision_seq')::TEXT, 5, '0')),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  entregavel_id UUID REFERENCES projeto_entregaveis(id) ON DELETE SET NULL,

  -- Dúvida
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  imagem_url TEXT,

  -- Estado: 'pending', 'discussion', 'resolved'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'discussion', 'resolved')),

  -- Submissão
  submetido_por UUID REFERENCES utilizadores(id),
  submetido_por_nome TEXT,
  submetido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Resposta
  resposta TEXT,
  respondido_por UUID REFERENCES utilizadores(id),
  respondido_por_nome TEXT,
  respondido_em TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_decisions_projeto ON project_decisions(projeto_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON project_decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_entregavel ON project_decisions(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_decisions_submetido_em ON project_decisions(submetido_em DESC);

-- RLS Policies
ALTER TABLE project_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON project_decisions FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisions_updated_at
  BEFORE UPDATE ON project_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_decisions_updated_at();

-- Trigger: Registar submissão no diário de bordo
CREATE OR REPLACE FUNCTION log_decision_submission()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  -- Buscar categoria "Tarefa" ou criar entrada sem categoria
  SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

  INSERT INTO projeto_diario (
    projeto_id,
    categoria_id,
    titulo,
    descricao,
    tipo,
    fonte,
    data_evento
  ) VALUES (
    NEW.projeto_id,
    categoria_id,
    'Nova dúvida: ' || NEW.titulo,
    'Dúvida submetida para análise por ' || COALESCE(NEW.submetido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.descricao, 200),
    'auto',
    'decision_log',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_decision_submitted
  AFTER INSERT ON project_decisions
  FOR EACH ROW EXECUTE FUNCTION log_decision_submission();

-- Trigger: Registar resposta no diário de bordo
CREATE OR REPLACE FUNCTION log_decision_response()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  IF NEW.resposta IS NOT NULL AND (OLD.resposta IS NULL OR OLD.resposta != NEW.resposta) THEN
    -- Buscar categoria "Tarefa"
    SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

    INSERT INTO projeto_diario (
      projeto_id,
      categoria_id,
      titulo,
      descricao,
      tipo,
      fonte,
      data_evento
    ) VALUES (
      NEW.projeto_id,
      categoria_id,
      'Decisão: ' || NEW.titulo,
      'Resposta de ' || COALESCE(NEW.respondido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.resposta, 200),
      'auto',
      'decision_log',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_decision_responded
  AFTER UPDATE ON project_decisions
  FOR EACH ROW EXECUTE FUNCTION log_decision_response();
