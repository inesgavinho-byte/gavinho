-- =====================================================
-- DECISION LOG - Sistema de Comentários/Respostas
-- Permite múltiplas respostas numa mesma dúvida
-- =====================================================

-- Tabela de comentários/respostas
CREATE TABLE IF NOT EXISTS decision_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES project_decisions(id) ON DELETE CASCADE,

  -- Conteúdo
  comentario TEXT NOT NULL,

  -- Autor
  autor_id UUID REFERENCES utilizadores(id),
  autor_nome TEXT NOT NULL,

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_decision_comments_decision ON decision_comments(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_comments_criado ON decision_comments(criado_em DESC);

-- RLS
ALTER TABLE decision_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON decision_comments FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_decision_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_comments_updated_at
  BEFORE UPDATE ON decision_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_comments_updated_at();

-- Trigger: Quando há novo comentário, mudar status para 'discussion' se estava 'pending'
CREATE OR REPLACE FUNCTION on_decision_comment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a decisão está pendente, mudar para em discussão
  UPDATE project_decisions
  SET status = 'discussion', updated_at = NOW()
  WHERE id = NEW.decision_id AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_comment_insert
  AFTER INSERT ON decision_comments
  FOR EACH ROW
  EXECUTE FUNCTION on_decision_comment_insert();

-- Adicionar coluna para resolução final (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolucao_final') THEN
    ALTER TABLE project_decisions ADD COLUMN resolucao_final TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_em') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_em TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_por') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_por UUID REFERENCES utilizadores(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_decisions' AND column_name = 'resolvido_por_nome') THEN
    ALTER TABLE project_decisions ADD COLUMN resolvido_por_nome TEXT;
  END IF;
END $$;
