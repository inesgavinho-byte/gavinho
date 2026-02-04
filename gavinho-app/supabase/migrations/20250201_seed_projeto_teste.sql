-- Seed: Test Project for Platform Testing
-- This project is used for testing all platform features
-- codigo: TEST-001 | codigo_interno: PRJ-TEST

-- First, ensure we have a test client
INSERT INTO clientes (
  id, codigo, nome, tipo, email, telefone, nif,
  morada, cidade, codigo_postal, pais,
  segmento, idioma, notas, created_at
)
VALUES (
  'test-client-0001-0001-000000000001',
  'CLI-TEST',
  'Cliente Teste Plataforma',
  'Particular',
  'teste@gavinho.pt',
  '+351 912 345 678',
  '123456789',
  'Rua do Teste, 123',
  'Lisboa',
  '1000-001',
  'Portugal',
  'Nacional',
  'Português',
  'Cliente de teste para validação da plataforma. NÃO APAGAR.',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email;

-- Create the test project
INSERT INTO projetos (
  id, codigo, codigo_interno, nome, descricao,
  tipologia, subtipo, tipo_apartamento,
  cliente_id, cliente_nome,
  localizacao, morada, cidade, codigo_postal, pais,
  fase, status, progresso,
  area_bruta, area_exterior, unidade_area,
  orcamento_atual,
  data_inicio, data_prevista_conclusao,
  notas, created_at, updated_at
)
VALUES (
  'test-proj-0001-0001-000000000001',
  'TEST-001',
  'PRJ-TEST',
  'Projeto de Teste Plataforma',
  'Este projeto é utilizado para testar todas as funcionalidades da plataforma Gavinho. Inclui dados de exemplo para entregáveis, pagamentos, equipa, e todas as outras funcionalidades. NÃO APAGAR.',
  'Residencial',
  'Apartamento',
  'T3',
  'test-client-0001-0001-000000000001',
  'Cliente Teste Plataforma',
  'Restelo, Lisboa',
  'Rua do Teste, 123, 1º Dto',
  'Lisboa',
  '1000-001',
  'Portugal',
  'Projeto',
  'on_track',
  45,
  180.5,
  25.0,
  'm²',
  150000.00,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '90 days',
  'Projeto de teste para validação da plataforma.',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  progresso = EXCLUDED.progresso,
  updated_at = NOW();

-- Create test entregáveis (deliverables)
INSERT INTO projeto_entregaveis (id, projeto_id, nome, descricao, status, data_prevista, created_at)
VALUES
  ('test-entreg-001-000000000001', 'test-proj-0001-0001-000000000001', 'Levantamento Inicial', 'Levantamento do espaço existente e condições técnicas', 'concluido', CURRENT_DATE - INTERVAL '25 days', NOW()),
  ('test-entreg-002-000000000001', 'test-proj-0001-0001-000000000001', 'Conceito Design', 'Moodboard e conceito visual do projeto', 'concluido', CURRENT_DATE - INTERVAL '15 days', NOW()),
  ('test-entreg-003-000000000001', 'test-proj-0001-0001-000000000001', 'Plantas Base', 'Plantas de distribuição e layout', 'em_progresso', CURRENT_DATE + INTERVAL '5 days', NOW()),
  ('test-entreg-004-000000000001', 'test-proj-0001-0001-000000000001', 'Renders 3D', 'Visualizações 3D dos principais espaços', 'pendente', CURRENT_DATE + INTERVAL '30 days', NOW()),
  ('test-entreg-005-000000000001', 'test-proj-0001-0001-000000000001', 'Projeto Execução', 'Desenhos técnicos e especificações', 'pendente', CURRENT_DATE + INTERVAL '60 days', NOW()),
  ('test-entreg-006-000000000001', 'test-proj-0001-0001-000000000001', 'Caderno de Encargos', 'Documento final com todas as especificações', 'pendente', CURRENT_DATE + INTERVAL '75 days', NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data_prevista = EXCLUDED.data_prevista;

-- Create test pagamentos (payments)
INSERT INTO projeto_pagamentos (id, projeto_id, prestacao_numero, descricao, valor, estado, data_prevista, data_pagamento, created_at)
VALUES
  ('test-pag-001-0000000000001', 'test-proj-0001-0001-000000000001', 1, 'Entrada (30%)', 45000.00, 'pago', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days', NOW()),
  ('test-pag-002-0000000000001', 'test-proj-0001-0001-000000000001', 2, 'Aprovação Conceito (20%)', 30000.00, 'pago', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', NOW()),
  ('test-pag-003-0000000000001', 'test-proj-0001-0001-000000000001', 3, 'Entrega Projeto Base (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '15 days', NULL, NOW()),
  ('test-pag-004-0000000000001', 'test-proj-0001-0001-000000000001', 4, 'Entrega Final (25%)', 37500.00, 'pendente', CURRENT_DATE + INTERVAL '80 days', NULL, NOW())
ON CONFLICT (id) DO UPDATE SET
  estado = EXCLUDED.estado,
  data_pagamento = EXCLUDED.data_pagamento;

-- Create test intervenientes (stakeholders)
INSERT INTO projeto_intervenientes (id, projeto_id, nome, tipo, empresa, email, telefone, notas, created_at)
VALUES
  ('test-interv-001-00000000001', 'test-proj-0001-0001-000000000001', 'João Silva', 'Dono de Obra', NULL, 'joao.silva@email.com', '+351 911 111 111', 'Cliente principal', NOW()),
  ('test-interv-002-00000000001', 'test-proj-0001-0001-000000000001', 'Maria Santos', 'Autor Licenciamento Arquitectura', 'Atelier MS', 'maria@atelierms.pt', '+351 922 222 222', 'Arquitecta responsável pelo licenciamento', NOW()),
  ('test-interv-003-00000000001', 'test-proj-0001-0001-000000000001', 'Pedro Costa', 'Especialidade Estruturas', 'Eng. Costa Lda', 'pedro@engcosta.pt', '+351 933 333 333', 'Engenheiro de estruturas', NOW())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo = EXCLUDED.tipo;

-- Create test serviços (services)
INSERT INTO projeto_servicos (id, projeto_id, nome, descricao, valor, fase, created_at)
VALUES
  ('test-serv-001-000000000001', 'test-proj-0001-0001-000000000001', 'Design de Interiores', 'Serviço completo de design de interiores', 80000.00, 'Projeto', NOW()),
  ('test-serv-002-000000000001', 'test-proj-0001-0001-000000000001', 'Renders e Visualização 3D', 'Pack de renders para apresentação', 15000.00, 'Projeto', NOW()),
  ('test-serv-003-000000000001', 'test-proj-0001-0001-000000000001', 'Acompanhamento de Obra', 'Visitas semanais durante a execução', 25000.00, 'Construção', NOW()),
  ('test-serv-004-000000000001', 'test-proj-0001-0001-000000000001', 'Decoração e Styling', 'Seleção de mobiliário e acessórios', 30000.00, 'Fit-out', NOW())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  valor = EXCLUDED.valor;

-- Create test tarefas (tasks)
INSERT INTO tarefas (id, projeto_id, titulo, descricao, status, prioridade, data_limite, created_at)
VALUES
  ('test-tarefa-001-0000000001', 'test-proj-0001-0001-000000000001', 'Validar medidas com cliente', 'Confirmar medidas do levantamento com o cliente', 'concluida', 'alta', CURRENT_DATE - INTERVAL '20 days', NOW()),
  ('test-tarefa-002-0000000001', 'test-proj-0001-0001-000000000001', 'Preparar apresentação conceito', 'Moodboard e imagens de referência', 'concluida', 'alta', CURRENT_DATE - INTERVAL '10 days', NOW()),
  ('test-tarefa-003-0000000001', 'test-proj-0001-0001-000000000001', 'Desenvolver plantas cozinha', 'Layout e equipamentos da cozinha', 'em_progresso', 'alta', CURRENT_DATE + INTERVAL '3 days', NOW()),
  ('test-tarefa-004-0000000001', 'test-proj-0001-0001-000000000001', 'Selecionar revestimentos', 'Escolher materiais para pavimentos e paredes', 'pendente', 'media', CURRENT_DATE + INTERVAL '10 days', NOW()),
  ('test-tarefa-005-0000000001', 'test-proj-0001-0001-000000000001', 'Reunião com fornecedor móveis', 'Apresentar projecto e obter orçamento', 'pendente', 'media', CURRENT_DATE + INTERVAL '20 days', NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data_limite = EXCLUDED.data_limite;

-- Create a test ata (meeting minutes)
INSERT INTO projeto_atas (id, projeto_id, titulo, data_reuniao, local_reuniao, participantes, conteudo, decisoes, proximas_acoes, created_at)
VALUES (
  'test-ata-001-00000000000001',
  'test-proj-0001-0001-000000000001',
  'Reunião de Kick-off',
  CURRENT_DATE - INTERVAL '25 days',
  'Escritório Gavinho',
  '[{"nome": "João Silva", "funcao": "Cliente"}, {"nome": "Ana Gavinho", "funcao": "Designer"}]',
  '<p>Reunião inicial do projeto para definição de expectativas e timeline.</p><p>Pontos discutidos:</p><ul><li>Orçamento aprovado</li><li>Estilo preferido: contemporâneo com toques clássicos</li><li>Prioridade: cozinha e suite principal</li></ul>',
  '<ul><li>Aprovar conceito até final do mês</li><li>Orçamento final: 150.000€</li></ul>',
  '<ul><li>Enviar moodboard em 5 dias</li><li>Agendar visita ao espaço</li></ul>',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo;

-- Create test blockers/dúvidas
INSERT INTO decisoes (id, projeto_id, titulo, descricao, status, prioridade, categoria, created_at)
VALUES
  ('test-decisao-001-000000001', 'test-proj-0001-0001-000000000001', 'Tipo de pavimento cozinha', 'Cliente indeciso entre cerâmico e vinílico. Necessita ver amostras.', 'pendente', 'alta', 'Materiais', NOW()),
  ('test-decisao-002-000000001', 'test-proj-0001-0001-000000000001', 'Cor da suite principal', 'Apresentar 3 opções de palete de cores', 'resolvido', 'media', 'Design', NOW())
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  status = EXCLUDED.status;

-- Log seed execution
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250201_seed_projeto_teste', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Projeto de Teste criado com sucesso!';
  RAISE NOTICE '   Código: TEST-001';
  RAISE NOTICE '   Código Interno: PRJ-TEST';
  RAISE NOTICE '   Cliente: Cliente Teste Plataforma';
  RAISE NOTICE '';
  RAISE NOTICE '   Dados incluídos:';
  RAISE NOTICE '   - 6 Entregáveis (2 concluídos, 1 em progresso, 3 pendentes)';
  RAISE NOTICE '   - 4 Pagamentos (2 pagos, 2 pendentes)';
  RAISE NOTICE '   - 3 Intervenientes';
  RAISE NOTICE '   - 4 Serviços';
  RAISE NOTICE '   - 5 Tarefas';
  RAISE NOTICE '   - 1 Ata de Reunião';
  RAISE NOTICE '   - 2 Decisões/Dúvidas';
END $$;
