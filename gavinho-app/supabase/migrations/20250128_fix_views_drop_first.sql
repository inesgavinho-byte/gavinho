-- ============================================
-- FIX: Drop views before recreating
-- Solves "cannot drop columns from view" error
-- ============================================

-- Drop all views that may have column changes
-- Using CASCADE to handle any dependencies

DROP VIEW IF EXISTS obra_documentos_execucao CASCADE;
DROP VIEW IF EXISTS v_checklist_resumo CASCADE;
DROP VIEW IF EXISTS v_chat_ultimas_mensagens CASCADE;
DROP VIEW IF EXISTS v_tracking_obra CASCADE;
DROP VIEW IF EXISTS v_obra_timeline_completa CASCADE;
DROP VIEW IF EXISTS v_obra_acoes_pendentes CASCADE;
DROP VIEW IF EXISTS v_obra_comunicacoes_stats CASCADE;
DROP VIEW IF EXISTS v_ia_processamento_stats CASCADE;
DROP VIEW IF EXISTS v_ia_mensagens_pendentes CASCADE;
DROP VIEW IF EXISTS v_analises_completas CASCADE;
DROP VIEW IF EXISTS v_estatisticas_concelho CASCADE;
DROP VIEW IF EXISTS mqt_capitulos_totais CASCADE;
DROP VIEW IF EXISTS mqt_mapas_totais CASCADE;

-- ============================================
-- RECREATE: obra_documentos_execucao
-- ============================================

CREATE VIEW obra_documentos_execucao AS
SELECT
  ef.id,
  ef.nome_ficheiro,
  ef.tipo_ficheiro,
  ef.ficheiro_url,
  ef.versao,
  ef.tamanho_bytes,
  ef.aprovado_em,
  ef.aprovado_por,
  ef.aprovado_por_nome,
  ef.notas,
  pe.codigo AS entregavel_codigo,
  pe.nome AS entregavel_descricao,
  pe.escala,
  pe.fase,
  p.id AS projeto_id,
  p.nome AS projeto_nome,
  o.id AS obra_id
FROM entrega_ficheiros ef
JOIN projeto_entregaveis pe ON ef.entregavel_id = pe.id
JOIN projetos p ON ef.projeto_id = p.id
LEFT JOIN obras o ON o.projeto_id = p.id
WHERE ef.aprovado_construcao = true
  AND ef.versao_atual = true
ORDER BY ef.aprovado_em DESC;

-- ============================================
-- RECREATE: v_checklist_resumo
-- ============================================

CREATE VIEW v_checklist_resumo AS
SELECT
  obra_id,
  COUNT(*) FILTER (WHERE estado = 'aberto') as total_abertos,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'urgente') as urgentes,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'esta_semana') as esta_semana,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'proximas_semanas') as proximas_semanas,
  COUNT(*) FILTER (WHERE estado = 'aberto' AND prioridade = 'monitorizacao') as monitorizacao,
  COUNT(*) FILTER (WHERE estado = 'concluido' AND concluido_em > NOW() - INTERVAL '7 days') as concluidos_semana
FROM checklist_items
GROUP BY obra_id;

-- ============================================
-- RECREATE: v_chat_ultimas_mensagens
-- ============================================

CREATE VIEW v_chat_ultimas_mensagens AS
SELECT DISTINCT ON (obra_id)
  obra_id,
  id as ultima_mensagem_id,
  conteudo as ultima_mensagem,
  autor_tipo,
  autor_nome,
  created_at as ultima_mensagem_em
FROM chat_mensagens
ORDER BY obra_id, created_at DESC;

-- ============================================
-- RECREATE: v_tracking_obra
-- ============================================

CREATE VIEW v_tracking_obra AS
SELECT
  o.id as obra_id,
  o.nome as obra_nome,
  p.id as pop_id,
  COALESCE(ml.capitulo, al.capitulo) as capitulo,
  COALESCE(ml.descricao, al.descricao) as descricao,
  COALESCE(pl.preco_cliente_total, al.preco_cliente_total) as valor_contratado,
  COALESCE(e.quantidade_executada, 0) as qtd_executada,
  COALESCE(e.percentagem_execucao, 0) as perc_execucao
FROM obras o
LEFT JOIN pops p ON p.obra_id = o.id AND p.estado = 'contratada'
LEFT JOIN pop_linhas pl ON pl.pop_id = p.id
LEFT JOIN orcamento_linhas ol ON ol.id = pl.orcamento_linha_id
LEFT JOIN mqt_linhas ml ON ml.id = ol.mqt_linha_id
LEFT JOIN adendas a ON a.obra_id = o.id AND a.estado = 'contratada'
LEFT JOIN adenda_linhas al ON al.adenda_id = a.id
LEFT JOIN obras_execucao e ON e.pop_linha_id = pl.id OR e.adenda_linha_id = al.id;

-- ============================================
-- RECREATE: v_obra_timeline_completa
-- ============================================

CREATE VIEW v_obra_timeline_completa AS
SELECT
  t.id,
  t.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  t.canal_id,
  c.nome as canal_nome,
  c.tipo as canal_tipo,
  t.tipo_item,
  t.item_id,
  t.titulo,
  t.resumo,
  t.autor_nome,
  t.autor_contacto,
  t.metadados,
  t.tem_anexos,
  t.anexos_count,
  t.lido,
  t.importante,
  t.tem_accoes,
  t.accoes_count,
  t.data_evento,
  t.created_at
FROM obra_timeline t
JOIN obras o ON t.obra_id = o.id
LEFT JOIN obra_canais c ON t.canal_id = c.id
ORDER BY t.data_evento DESC;

-- ============================================
-- RECREATE: v_obra_acoes_pendentes
-- ============================================

CREATE VIEW v_obra_acoes_pendentes AS
SELECT
  a.id,
  a.obra_id,
  o.codigo as obra_codigo,
  o.codigo_canonico,
  o.nome as obra_nome,
  a.canal_id,
  c.nome as canal_nome,
  a.tipo_acao,
  a.titulo,
  a.descricao,
  a.responsavel_nome,
  a.prazo,
  a.estado,
  a.prioridade,
  a.severidade,
  a.created_at,
  CASE
    WHEN a.prazo < NOW() THEN 'atrasada'
    WHEN a.prazo < NOW() + INTERVAL '1 day' THEN 'urgente'
    WHEN a.prazo < NOW() + INTERVAL '3 days' THEN 'proxima'
    ELSE 'normal'
  END as urgencia
FROM obra_acoes a
JOIN obras o ON a.obra_id = o.id
LEFT JOIN obra_canais c ON a.canal_id = c.id
WHERE a.estado NOT IN ('concluida', 'cancelada')
ORDER BY
  CASE a.prioridade
    WHEN 'urgente' THEN 1
    WHEN 'alta' THEN 2
    WHEN 'media' THEN 3
    ELSE 4
  END,
  a.prazo ASC NULLS LAST;

-- ============================================
-- RECREATE: v_obra_comunicacoes_stats
-- ============================================

CREATE VIEW v_obra_comunicacoes_stats AS
SELECT
  o.id as obra_id,
  o.codigo,
  o.codigo_canonico,
  o.nome,
  COUNT(DISTINCT wm.id) as total_whatsapp,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'recebida') as whatsapp_recebidas,
  COUNT(DISTINCT wm.id) FILTER (WHERE wm.tipo = 'enviada') as whatsapp_enviadas,
  COUNT(DISTINCT e.id) as total_emails,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'recebido') as emails_recebidos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'enviado') as emails_enviados,
  COUNT(DISTINCT a.id) as total_acoes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'pendente') as acoes_pendentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'concluida') as acoes_concluidas,
  COUNT(DISTINCT c.id) as total_canais
FROM obras o
LEFT JOIN whatsapp_mensagens wm ON o.id = wm.obra_id
LEFT JOIN obra_emails e ON o.id = e.obra_id
LEFT JOIN obra_acoes a ON o.id = a.obra_id
LEFT JOIN obra_canais c ON o.id = c.id AND c.ativo = true
GROUP BY o.id, o.codigo, o.codigo_canonico, o.nome;

-- ============================================
-- RECREATE: v_ia_processamento_stats
-- ============================================

CREATE VIEW v_ia_processamento_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as execucoes,
  SUM(whatsapp_processadas) as whatsapp_total,
  SUM(whatsapp_sugestoes) as whatsapp_sugestoes_total,
  SUM(email_processadas) as email_total,
  SUM(email_sugestoes) as email_sugestoes_total,
  AVG(duracao_ms)::INTEGER as duracao_media_ms,
  COUNT(*) FILTER (WHERE sucesso = false) as falhas
FROM ia_processamento_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- ============================================
-- RECREATE: v_ia_mensagens_pendentes
-- ============================================

CREATE VIEW v_ia_mensagens_pendentes AS
SELECT
  'whatsapp' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM whatsapp_mensagens
WHERE processada_ia = false AND tipo = 'recebida' AND conteudo IS NOT NULL

UNION ALL

SELECT
  'email' as fonte,
  COUNT(*) as total,
  MIN(created_at) as mais_antiga,
  MAX(created_at) as mais_recente
FROM obra_emails
WHERE processado_ia = false AND tipo = 'recebido' AND corpo_texto IS NOT NULL;

-- ============================================
-- RECREATE: v_analises_completas
-- ============================================

CREATE VIEW v_analises_completas AS
SELECT
    a.*,
    c.nome as concelho_nome,
    c.codigo as concelho_codigo,
    p.codigo as projeto_codigo,
    p.nome as projeto_nome,
    u.nome as criado_por_nome,
    (SELECT COUNT(*) FROM analise_versoes av WHERE av.analise_id = a.id) as total_versoes,
    (SELECT MAX(versao) FROM analise_versoes av WHERE av.analise_id = a.id) as ultima_versao
FROM analises_viabilidade a
LEFT JOIN concelhos c ON a.concelho_id = c.id
LEFT JOIN projetos p ON a.projeto_id = p.id
LEFT JOIN utilizadores u ON a.created_by = u.id;

-- ============================================
-- RECREATE: v_estatisticas_concelho
-- ============================================

CREATE VIEW v_estatisticas_concelho AS
SELECT
    c.id,
    c.nome,
    c.codigo,
    COUNT(a.id) as total_analises,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel' THEN 1 END) as viaveis,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'viavel_condicionado' THEN 1 END) as condicionados,
    COUNT(CASE WHEN a.resultado->>'classificacao' = 'inviavel' THEN 1 END) as inviaveis
FROM concelhos c
LEFT JOIN analises_viabilidade a ON c.id = a.concelho_id
GROUP BY c.id, c.nome, c.codigo;

-- ============================================
-- RECREATE: mqt_capitulos_totais
-- ============================================

CREATE VIEW mqt_capitulos_totais AS
SELECT
    c.id,
    c.mapa_id,
    c.numero,
    c.nome,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_capitulos c
LEFT JOIN mqt_items i ON i.capitulo_id = c.id
GROUP BY c.id, c.mapa_id, c.numero, c.nome;

-- ============================================
-- RECREATE: mqt_mapas_totais
-- ============================================

CREATE VIEW mqt_mapas_totais AS
SELECT
    m.id,
    m.obra_id,
    m.nome,
    m.status,
    COUNT(DISTINCT c.id) as total_capitulos,
    COUNT(i.id) as total_items,
    COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as valor_total,
    COALESCE(SUM(i.quantidade_executada * i.preco_unitario), 0) as valor_executado,
    CASE
        WHEN SUM(i.quantidade * i.preco_unitario) > 0
        THEN (SUM(i.quantidade_executada * i.preco_unitario) / SUM(i.quantidade * i.preco_unitario)) * 100
        ELSE 0
    END as percentagem_execucao
FROM mqt_mapas m
LEFT JOIN mqt_capitulos c ON c.mapa_id = m.id
LEFT JOIN mqt_items i ON i.mapa_id = m.id
GROUP BY m.id, m.obra_id, m.nome, m.status;
