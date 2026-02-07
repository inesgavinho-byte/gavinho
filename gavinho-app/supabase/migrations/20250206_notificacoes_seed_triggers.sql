-- =====================================================
-- NOTIFICACOES - SEED DATA & AUTOMATIC TRIGGERS
-- =====================================================

-- =====================================================
-- SEED DATA - Notificações de exemplo
-- =====================================================

-- Inserir notificações de teste (usa o primeiro utilizador encontrado)
DO $$
DECLARE
  v_user_id UUID;
  v_sender_id UUID;
  v_project_name TEXT := '413_414 OEIRAS';
BEGIN
  -- Buscar utilizadores para seed
  SELECT id INTO v_user_id FROM utilizadores LIMIT 1;
  SELECT id INTO v_sender_id FROM utilizadores WHERE id != v_user_id LIMIT 1;

  -- Se não houver segundo utilizador, usa o mesmo
  IF v_sender_id IS NULL THEN
    v_sender_id := v_user_id;
  END IF;

  -- Só inserir se existir pelo menos um utilizador
  IF v_user_id IS NOT NULL THEN
    -- Limpar notificações existentes de seed
    DELETE FROM notificacoes WHERE context->>'seed' = 'true';

    -- 1. Menção recente (5 min atrás)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, created_at)
    VALUES (
      v_user_id,
      v_sender_id,
      'mention',
      '@Menção em ata',
      'Maria mencionou-te na ata do projeto 413_OEIRAS',
      '{"project": "413_414 OEIRAS", "channel": "Atas", "seed": "true"}'::jsonb,
      '/projetos/413',
      NOW() - INTERVAL '5 minutes'
    );

    -- 2. Nova mensagem (15 min atrás)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, created_at)
    VALUES (
      v_user_id,
      v_sender_id,
      'message',
      'Nova mensagem',
      'Armando enviou uma mensagem no Team Chat',
      '{"project": "GAVINHO ARCH BIM TEAM", "channel": "Team Chat", "seed": "true"}'::jsonb,
      '/workspace',
      NOW() - INTERVAL '15 minutes'
    );

    -- 3. Tarefa atribuída (30 min atrás)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, created_at)
    VALUES (
      v_user_id,
      NULL,
      'task',
      'Tarefa atribuída',
      'Tens uma nova tarefa: Revisão de imagens finais',
      '{"project": "420_VILA REAL", "seed": "true"}'::jsonb,
      '/projetos/420',
      NOW() - INTERVAL '30 minutes'
    );

    -- 4. Comentário (2 horas atrás, já lida)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read, read_at, created_at)
    VALUES (
      v_user_id,
      v_sender_id,
      'comment',
      'Novo comentário',
      'Carolina comentou na ata de reunião',
      '{"project": "464_APARTAMENTO", "channel": "Atas", "seed": "true"}'::jsonb,
      '/projetos/464',
      TRUE,
      NOW() - INTERVAL '1 hour',
      NOW() - INTERVAL '2 hours'
    );

    -- 5. Atualização de projeto (1 dia atrás, já lida)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read, read_at, created_at)
    VALUES (
      v_user_id,
      NULL,
      'project',
      'Atualização de projeto',
      'O projeto 480_MORADIA foi atualizado para fase "Em Execução"',
      '{"project": "480_MORADIA", "seed": "true"}'::jsonb,
      '/projetos/480',
      TRUE,
      NOW() - INTERVAL '20 hours',
      NOW() - INTERVAL '1 day'
    );

    -- 6. Menção antiga (2 dias atrás, já lida)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read, read_at, created_at)
    VALUES (
      v_user_id,
      v_sender_id,
      'mention',
      NULL,
      'Ana mencionou-te: "ponto de situação: estrutura d..."',
      '{"project": "GAVINHO Signature", "channel": "Geral", "seed": "true"}'::jsonb,
      '/workspace',
      TRUE,
      NOW() - INTERVAL '40 hours',
      NOW() - INTERVAL '2 days'
    );

    -- 7. Aprovação pendente (1 hora atrás)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, created_at)
    VALUES (
      v_user_id,
      v_sender_id,
      'approval',
      'Aprovação pendente',
      'Tens um render a aguardar aprovação',
      '{"project": "413_414 OEIRAS", "channel": "Renders", "seed": "true"}'::jsonb,
      '/projetos/413',
      NOW() - INTERVAL '1 hour'
    );

    -- 8. Sistema (3 horas atrás, já lida)
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link, read, read_at, created_at)
    VALUES (
      v_user_id,
      NULL,
      'system',
      'Backup completo',
      'O backup semanal do sistema foi concluído com sucesso',
      '{"seed": "true"}'::jsonb,
      NULL,
      TRUE,
      NOW() - INTERVAL '2 hours',
      NOW() - INTERVAL '3 hours'
    );

    RAISE NOTICE 'Seed data inserido com sucesso para utilizador %', v_user_id;
  ELSE
    RAISE NOTICE 'Nenhum utilizador encontrado para seed data';
  END IF;
END $$;

-- =====================================================
-- TRIGGER: Notificação quando tarefa é atribuída
-- =====================================================

CREATE OR REPLACE FUNCTION notify_tarefa_atribuida()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_criador_nome TEXT;
BEGIN
  -- Só notifica se foi atribuído um responsável (novo ou alterado)
  IF NEW.responsavel_id IS NOT NULL AND
     (OLD IS NULL OR OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id) THEN

    -- Não notificar se o utilizador atribuiu a si mesmo
    IF NEW.responsavel_id = NEW.criado_por_id THEN
      RETURN NEW;
    END IF;

    -- Buscar nome do projeto
    SELECT nome INTO v_projeto_nome
    FROM projetos
    WHERE id = NEW.projeto_id;

    -- Buscar nome do criador
    SELECT nome INTO v_criador_nome
    FROM utilizadores
    WHERE id = NEW.criado_por_id;

    -- Criar notificação
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
    VALUES (
      NEW.responsavel_id,
      NEW.criado_por_id,
      'task',
      'Tarefa atribuída',
      COALESCE(v_criador_nome, 'Alguém') || ' atribuiu-te uma tarefa: ' || NEW.titulo,
      jsonb_build_object(
        'project', COALESCE(v_projeto_nome, 'Sem projeto'),
        'tarefa_id', NEW.id,
        'prioridade', NEW.prioridade
      ),
      CASE
        WHEN NEW.projeto_id IS NOT NULL THEN '/projetos/' || NEW.projeto_id::text
        ELSE '/tarefas'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_tarefa_atribuida ON tarefas;
CREATE TRIGGER trigger_notify_tarefa_atribuida
  AFTER INSERT OR UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION notify_tarefa_atribuida();

-- =====================================================
-- TRIGGER: Notificação quando ata é criada
-- =====================================================

CREATE OR REPLACE FUNCTION notify_ata_criada()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_projeto_id UUID;
  v_criador_nome TEXT;
  v_participante JSONB;
  v_user_id UUID;
BEGIN
  -- Buscar info do projeto
  SELECT nome, id INTO v_projeto_nome, v_projeto_id
  FROM projetos
  WHERE id = NEW.projeto_id;

  -- Buscar nome do criador
  SELECT nome INTO v_criador_nome
  FROM utilizadores
  WHERE id = NEW.criado_por;

  -- Notificar cada participante (se tiverem user_id)
  IF NEW.participantes IS NOT NULL AND jsonb_array_length(NEW.participantes) > 0 THEN
    FOR v_participante IN SELECT * FROM jsonb_array_elements(NEW.participantes)
    LOOP
      -- Verificar se participante tem user_id ou email
      IF v_participante->>'user_id' IS NOT NULL THEN
        v_user_id := (v_participante->>'user_id')::UUID;

        -- Não notificar o criador
        IF v_user_id != NEW.criado_por THEN
          INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
          VALUES (
            v_user_id,
            NEW.criado_por,
            'comment',
            'Nova ata de reunião',
            COALESCE(v_criador_nome, 'Alguém') || ' criou a ata: ' || NEW.titulo,
            jsonb_build_object(
              'project', COALESCE(v_projeto_nome, 'Sem projeto'),
              'channel', 'Atas',
              'ata_id', NEW.id
            ),
            '/projetos/' || v_projeto_id::text || '/atas/' || NEW.id::text
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_ata_criada ON projeto_atas;
CREATE TRIGGER trigger_notify_ata_criada
  AFTER INSERT ON projeto_atas
  FOR EACH ROW
  EXECUTE FUNCTION notify_ata_criada();

-- =====================================================
-- TRIGGER: Notificação quando dúvida é respondida
-- =====================================================

CREATE OR REPLACE FUNCTION notify_duvida_respondida()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_nome TEXT;
  v_respondedor_nome TEXT;
BEGIN
  -- Só notifica quando resposta é adicionada
  IF NEW.resposta IS NOT NULL AND
     (OLD IS NULL OR OLD.resposta IS DISTINCT FROM NEW.resposta) AND
     NEW.created_by IS NOT NULL THEN

    -- Não notificar se respondeu a si mesmo
    IF NEW.respondido_por = NEW.created_by THEN
      RETURN NEW;
    END IF;

    -- Buscar nome do projeto
    SELECT nome INTO v_projeto_nome
    FROM projetos
    WHERE id = NEW.projeto_id;

    -- Buscar nome do respondedor
    SELECT nome INTO v_respondedor_nome
    FROM utilizadores
    WHERE id = NEW.respondido_por;

    -- Criar notificação para quem criou a dúvida
    INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
    VALUES (
      NEW.created_by,
      NEW.respondido_por,
      'comment',
      'Dúvida respondida',
      COALESCE(v_respondedor_nome, 'Alguém') || ' respondeu à tua dúvida: ' || NEW.titulo,
      jsonb_build_object(
        'project', COALESCE(v_projeto_nome, 'Sem projeto'),
        'duvida_id', NEW.id
      ),
      '/projetos/' || NEW.projeto_id::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_duvida_respondida ON projeto_duvidas;
CREATE TRIGGER trigger_notify_duvida_respondida
  AFTER UPDATE ON projeto_duvidas
  FOR EACH ROW
  EXECUTE FUNCTION notify_duvida_respondida();

-- =====================================================
-- TRIGGER: Notificação quando projeto muda de fase
-- =====================================================

CREATE OR REPLACE FUNCTION notify_projeto_fase_alterada()
RETURNS TRIGGER AS $$
DECLARE
  v_membro RECORD;
BEGIN
  -- Só notifica quando fase muda
  IF OLD.fase IS DISTINCT FROM NEW.fase AND NEW.fase IS NOT NULL THEN

    -- Notificar todos os membros da equipa do projeto
    FOR v_membro IN
      SELECT DISTINCT u.id
      FROM utilizadores u
      JOIN projeto_equipa pe ON pe.utilizador_id = u.id
      WHERE pe.projeto_id = NEW.id
    LOOP
      INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
      VALUES (
        v_membro.id,
        NULL,
        'project',
        'Atualização de projeto',
        'O projeto ' || COALESCE(NEW.codigo_interno, NEW.nome) || ' avançou para fase "' || NEW.fase || '"',
        jsonb_build_object(
          'project', COALESCE(NEW.codigo_interno, NEW.nome),
          'projeto_id', NEW.id,
          'fase_anterior', OLD.fase,
          'fase_nova', NEW.fase
        ),
        '/projetos/' || NEW.id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Só criar trigger se tabela projetos existir com coluna fase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projetos' AND column_name = 'fase'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_notify_projeto_fase_alterada ON projetos;
    CREATE TRIGGER trigger_notify_projeto_fase_alterada
      AFTER UPDATE ON projetos
      FOR EACH ROW
      EXECUTE FUNCTION notify_projeto_fase_alterada();
  END IF;
END $$;

-- =====================================================
-- FUNÇÃO HELPER: Criar menção
-- =====================================================

CREATE OR REPLACE FUNCTION criar_mencao(
  p_mentioned_user_id UUID,
  p_sender_id UUID,
  p_message TEXT,
  p_project_name TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_sender_nome TEXT;
BEGIN
  -- Buscar nome do sender
  SELECT nome INTO v_sender_nome
  FROM utilizadores
  WHERE id = p_sender_id;

  INSERT INTO notificacoes (user_id, sender_id, type, title, message, context, link)
  VALUES (
    p_mentioned_user_id,
    p_sender_id,
    'mention',
    '@Menção',
    COALESCE(v_sender_nome, 'Alguém') || ' mencionou-te: "' || LEFT(p_message, 50) || CASE WHEN LENGTH(p_message) > 50 THEN '..."' ELSE '"' END,
    jsonb_build_object(
      'project', p_project_name,
      'channel', p_channel
    ),
    p_link
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION notify_tarefa_atribuida() IS 'Trigger que notifica quando uma tarefa é atribuída';
COMMENT ON FUNCTION notify_ata_criada() IS 'Trigger que notifica participantes quando uma ata é criada';
COMMENT ON FUNCTION notify_duvida_respondida() IS 'Trigger que notifica quando uma dúvida é respondida';
COMMENT ON FUNCTION notify_projeto_fase_alterada() IS 'Trigger que notifica equipa quando projeto muda de fase';
COMMENT ON FUNCTION criar_mencao() IS 'Helper para criar notificações de menção @utilizador';
