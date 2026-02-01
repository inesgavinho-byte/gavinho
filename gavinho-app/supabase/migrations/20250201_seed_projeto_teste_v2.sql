-- =====================================================
-- PROJETO DE TESTE SIMPLIFICADO
-- Usa apenas colunas que existem na base de dados
-- =====================================================

-- 1. Criar cliente de teste
INSERT INTO clientes (id, codigo, nome, tipo, email, telefone, nif, morada, cidade, codigo_postal, notas)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'CLI-TEST',
  'Cliente Teste Plataforma',
  'Particular',
  'teste@gavinho.pt',
  '+351 912 345 678',
  '123456789',
  'Rua do Teste, 123',
  'Lisboa',
  '1000-001',
  'Cliente de teste para validacao da plataforma. NAO APAGAR.'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email;

-- 2. Criar projeto de teste
INSERT INTO projetos (
  id, codigo, nome, descricao,
  tipologia, subtipo,
  cliente_id, cliente_nome,
  localizacao, morada, cidade, codigo_postal,
  fase, status, progresso,
  area_bruta, area_exterior, unidade_area,
  orcamento_atual,
  data_inicio, data_prevista_conclusao,
  notas
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'TEST-001',
  'Projeto de Teste Plataforma',
  'Este projeto e utilizado para testar todas as funcionalidades da plataforma Gavinho. NAO APAGAR.',
  'Residencial',
  'Apartamento',
  'a0000000-0000-0000-0000-000000000001',
  'Cliente Teste Plataforma',
  'Restelo, Lisboa',
  'Rua do Teste, 123, 1 Dto',
  'Lisboa',
  '1000-001',
  'Projeto',
  'on_track',
  45,
  180.5,
  25.0,
  'm2',
  150000.00,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '90 days',
  'Projeto de teste para validacao da plataforma.'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  progresso = EXCLUDED.progresso;

-- 3. Criar entregaveis de teste (usando colunas que existem)
INSERT INTO projeto_entregaveis (id, projeto_id, codigo, nome, fase, status, data_inicio, data_conclusao)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENT-001', 'Levantamento Inicial', 'Conceito', 'concluido', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'ENT-002', 'Conceito Design', 'Conceito', 'concluido', CURRENT_DATE - INTERVAL '24 days', CURRENT_DATE - INTERVAL '15 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'ENT-003', 'Plantas Base', 'Projeto Base', 'em_progresso', CURRENT_DATE - INTERVAL '14 days', NULL),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'ENT-004', 'Renders 3D', 'Projeto Base', 'pendente', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'ENT-005', 'Projeto Execucao', 'Projeto Execucao', 'pendente', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status;

-- 4. Criar tarefas de teste
INSERT INTO tarefas (id, projeto_id, titulo, descricao, status, prioridade, data_limite)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Validar medidas com cliente', 'Confirmar medidas do levantamento', 'concluida', 'alta', CURRENT_DATE - INTERVAL '20 days'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Preparar apresentacao conceito', 'Moodboard e imagens de referencia', 'concluida', 'alta', CURRENT_DATE - INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Desenvolver plantas cozinha', 'Layout e equipamentos da cozinha', 'em_progresso', 'alta', CURRENT_DATE + INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Selecionar revestimentos', 'Escolher materiais para pavimentos e paredes', 'pendente', 'media', CURRENT_DATE + INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Reuniao com fornecedor moveis', 'Apresentar projecto e obter orcamento', 'pendente', 'media', CURRENT_DATE + INTERVAL '20 days')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  titulo = EXCLUDED.titulo;

-- 5. Criar decisoes/duvidas de teste
INSERT INTO decisoes (id, projeto_id, titulo, descricao, status, prioridade, categoria)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tipo de pavimento cozinha', 'Cliente indeciso entre ceramico e vinilico. Necessita ver amostras.', 'pendente', 'alta', 'Materiais'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Cor da suite principal', 'Apresentar 3 opcoes de palete de cores', 'resolvido', 'media', 'Design')
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  status = EXCLUDED.status;

-- 6. Criar pagamentos de teste (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projeto_pagamentos') THEN
    INSERT INTO projeto_pagamentos (id, projeto_id, prestacao_numero, descricao, valor, estado, data_prevista, data_pagamento)
    VALUES
      ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'Entrada (30%)', 45000.00, 'pago', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days'),
      ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 2, 'Aprovacao Conceito (20%)', 30000.00, 'pago', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days'),
      ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 3, 'Entrega Projeto Base (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '15 days', NULL),
      ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 4, 'Entrega Final (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '80 days', NULL)
    ON CONFLICT (id) DO UPDATE SET
      estado = EXCLUDED.estado,
      data_pagamento = EXCLUDED.data_pagamento;
  END IF;
END $$;

-- 7. Criar servicos de teste (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projeto_servicos') THEN
    INSERT INTO projeto_servicos (id, projeto_id, nome, descricao, valor, fase)
    VALUES
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Design de Interiores', 'Servico completo de design de interiores', 80000.00, 'Projeto'),
      ('g0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Renders e Visualizacao 3D', 'Pack de renders para apresentacao', 15000.00, 'Projeto'),
      ('g0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Acompanhamento de Obra', 'Visitas semanais durante a execucao', 25000.00, 'Construcao'),
      ('g0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Decoracao e Styling', 'Selecao de mobiliario e acessorios', 30000.00, 'Fit-out')
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      valor = EXCLUDED.valor;
  END IF;
END $$;

-- Log seed execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_seed_projeto_teste_v2', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();

-- Confirmacao
DO $$
BEGIN
  RAISE NOTICE 'Projeto de Teste criado com sucesso!';
  RAISE NOTICE '  Codigo: TEST-001';
  RAISE NOTICE '  ID: b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '';
  RAISE NOTICE 'Dados incluidos:';
  RAISE NOTICE '  - 5 Entregaveis';
  RAISE NOTICE '  - 5 Tarefas';
  RAISE NOTICE '  - 2 Decisoes';
  RAISE NOTICE '  - 4 Pagamentos (se tabela existir)';
  RAISE NOTICE '  - 4 Servicos (se tabela existir)';
END $$;
