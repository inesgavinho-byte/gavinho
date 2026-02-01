-- =====================================================
-- MIGRAÇÃO: Renomear project_decisions para projeto_duvidas
-- Clarificar a diferença entre:
--   - decisoes: Decisões formais com impacto (orçamento, prazo)
--   - projeto_duvidas: Sistema Q&A/Dúvidas que precisam resposta
-- =====================================================

-- 1. Renomear tabela principal de project_decisions para projeto_duvidas
ALTER TABLE IF EXISTS project_decisions RENAME TO projeto_duvidas;

-- 2. Renomear tabela de comentários
ALTER TABLE IF EXISTS decision_comments RENAME TO duvida_comentarios;

-- 3. Renomear coluna decision_id para duvida_id na tabela de comentários
ALTER TABLE IF EXISTS duvida_comentarios
  RENAME COLUMN decision_id TO duvida_id;

-- 4. Renomear a sequência
ALTER SEQUENCE IF EXISTS decision_seq RENAME TO duvida_seq;

-- 5. Atualizar os índices com novos nomes
DROP INDEX IF EXISTS idx_decisions_projeto;
DROP INDEX IF EXISTS idx_decisions_status;
DROP INDEX IF EXISTS idx_decisions_entregavel;
DROP INDEX IF EXISTS idx_decisions_submetido_em;
DROP INDEX IF EXISTS idx_decision_comments_decision;
DROP INDEX IF EXISTS idx_decision_comments_criado;

CREATE INDEX IF NOT EXISTS idx_duvidas_projeto ON projeto_duvidas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_duvidas_status ON projeto_duvidas(status);
CREATE INDEX IF NOT EXISTS idx_duvidas_entregavel ON projeto_duvidas(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_duvidas_submetido_em ON projeto_duvidas(submetido_em DESC);
CREATE INDEX IF NOT EXISTS idx_duvida_comentarios_duvida ON duvida_comentarios(duvida_id);
CREATE INDEX IF NOT EXISTS idx_duvida_comentarios_criado ON duvida_comentarios(criado_em DESC);

-- 6. Atualizar triggers para usar novos nomes

-- Trigger para atualizar status quando há comentário
CREATE OR REPLACE FUNCTION on_duvida_comment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a dúvida está pendente, mudar para em discussão
  UPDATE projeto_duvidas
  SET status = 'discussion', updated_at = NOW()
  WHERE id = NEW.duvida_id AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decision_comment_insert ON duvida_comentarios;
CREATE TRIGGER trigger_duvida_comment_insert
  AFTER INSERT ON duvida_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION on_duvida_comment_insert();

-- Trigger: Registar submissão no diário de bordo
CREATE OR REPLACE FUNCTION log_duvida_submission()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
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
    'duvidas_log',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_decision_submitted ON projeto_duvidas;
CREATE TRIGGER on_duvida_submitted
  AFTER INSERT ON projeto_duvidas
  FOR EACH ROW EXECUTE FUNCTION log_duvida_submission();

-- Trigger: Registar resposta no diário de bordo
CREATE OR REPLACE FUNCTION log_duvida_response()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
BEGIN
  IF NEW.resolucao_final IS NOT NULL AND (OLD.resolucao_final IS NULL OR OLD.resolucao_final != NEW.resolucao_final) THEN
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
      'Dúvida resolvida: ' || NEW.titulo,
      'Resposta de ' || COALESCE(NEW.resolvido_por_nome, 'Utilizador') || ': ' || LEFT(NEW.resolucao_final, 200),
      'auto',
      'duvidas_log',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_decision_responded ON projeto_duvidas;
CREATE TRIGGER on_duvida_responded
  AFTER UPDATE ON projeto_duvidas
  FOR EACH ROW EXECUTE FUNCTION log_duvida_response();

-- 7. Atualizar RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projeto_duvidas;
CREATE POLICY "Allow all for authenticated users" ON projeto_duvidas FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON duvida_comentarios;
CREATE POLICY "Allow all for authenticated users" ON duvida_comentarios FOR ALL USING (true);

-- 8. Adicionar comentários às tabelas para documentação
COMMENT ON TABLE projeto_duvidas IS 'Sistema Q&A de dúvidas do projeto que precisam de resposta/definição. NÃO confundir com a tabela "decisoes" que guarda decisões formais com impacto.';
COMMENT ON TABLE duvida_comentarios IS 'Comentários/respostas às dúvidas do projeto. Thread de discussão.';
COMMENT ON TABLE decisoes IS 'Decisões formais do projeto com tracking de impacto (orçamento, prazo). NÃO confundir com "projeto_duvidas" que é um sistema Q&A.';
