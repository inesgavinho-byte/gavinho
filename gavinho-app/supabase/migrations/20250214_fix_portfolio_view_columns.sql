-- ============================================================================
-- FIX: v_financeiro_portfolio view — wrong column names
--
-- Bug: The view referenced `valor_total` in purchase_orders and
--      procurement_facturas subqueries, but the actual column is `total`.
--      Also fixed invalid `estado` filter values:
--      - purchase_orders: 'paga'/'parcial' don't exist → use NOT IN (rascunho, cancelada)
--      - procurement_facturas: 'validada' doesn't exist → use verificada/aprovada/em_pagamento/paga
--
-- Date: 2026-02-14
-- ============================================================================

DROP VIEW IF EXISTS v_financeiro_portfolio;

CREATE OR REPLACE VIEW v_financeiro_portfolio AS
SELECT
  p.id AS projeto_id,
  p.nome,
  p.codigo,
  p.status,
  p.fase,
  p.tipologia,
  COALESCE(o.valor_total, 0) AS orcamento_revisto,
  COALESCE(o.margem_global, 25) AS margem_global,
  COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0) AS orcamento_custo,
  COALESCE(po_agg.total_comprometido, 0) AS comprometido,
  COALESCE(f_agg.total_facturado, 0) AS facturado,
  CASE
    WHEN COALESCE(o.valor_total, 0) > 0
    THEN ((COALESCE(o.valor_total, 0) - COALESCE(po_agg.total_comprometido, 0)) / o.valor_total * 100)
    ELSE 0
  END AS margem_actual_pct,
  CASE
    WHEN COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0) > 0
    THEN ((COALESCE(po_agg.total_comprometido, 0) - COALESCE(o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0), 0))
          / (o.valor_total * (1 - COALESCE(o.margem_global, 25) / 100.0)) * 100)
    ELSE 0
  END AS desvio_pct,
  COALESCE(a_agg.alertas_activos, 0) AS alertas_activos,
  COALESCE(a_agg.alertas_urgentes, 0) AS alertas_urgentes,
  COALESCE(a_agg.alertas_criticos, 0) AS alertas_criticos,
  COALESCE(ext_agg.extras_pendentes, 0) AS extras_pendentes,
  COALESCE(ext_agg.extras_valor, 0) AS extras_valor_pendente,
  fc_agg.total_recebido,
  fc_agg.total_facturado AS total_facturado_cliente,
  fc_agg.proximo_vencimento
FROM projetos p
-- Orcamento mais recente aprovado
LEFT JOIN LATERAL (
  SELECT total AS valor_total, margem_percentagem AS margem_global
  FROM orcamentos
  WHERE projeto_id = p.id AND status = 'aprovado'
  ORDER BY created_at DESC
  LIMIT 1
) o ON true
-- POs agregados por projeto (column is `total`, not `valor_total`)
LEFT JOIN (
  SELECT projeto_id, SUM(total) AS total_comprometido
  FROM purchase_orders
  WHERE estado NOT IN ('rascunho', 'cancelada')
  GROUP BY projeto_id
) po_agg ON po_agg.projeto_id = p.id
-- Facturas agregadas por projeto (column is `total`, not `valor_total`)
LEFT JOIN (
  SELECT projeto_id, SUM(total) AS total_facturado
  FROM procurement_facturas
  WHERE estado IN ('verificada', 'aprovada', 'em_pagamento', 'paga')
  GROUP BY projeto_id
) f_agg ON f_agg.projeto_id = p.id
-- Alertas agregados por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    COUNT(*) FILTER (WHERE estado = 'activo') AS alertas_activos,
    COUNT(*) FILTER (WHERE estado = 'activo' AND gravidade = 'urgente') AS alertas_urgentes,
    COUNT(*) FILTER (WHERE estado = 'activo' AND gravidade = 'critico') AS alertas_criticos
  FROM alertas_financeiros
  GROUP BY projeto_id
) a_agg ON a_agg.projeto_id = p.id
-- Extras agregados por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    COUNT(*) FILTER (WHERE estado = 'pendente') AS extras_pendentes,
    SUM(preco_cliente) FILTER (WHERE estado = 'pendente') AS extras_valor
  FROM extras
  GROUP BY projeto_id
) ext_agg ON ext_agg.projeto_id = p.id
-- Facturação cliente agregada por projeto
LEFT JOIN (
  SELECT
    projeto_id,
    SUM(valor) FILTER (WHERE estado = 'paga') AS total_recebido,
    SUM(valor) FILTER (WHERE estado = 'facturada') AS total_facturado,
    MIN(data_prevista) FILTER (WHERE estado NOT IN ('paga')) AS proximo_vencimento
  FROM facturacao_cliente
  GROUP BY projeto_id
) fc_agg ON fc_agg.projeto_id = p.id
WHERE p.status IN ('ativo', 'em_curso', 'em_progresso', 'active');


-- Seed tracking
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, executado_em)
    VALUES ('20250214_fix_portfolio_view_columns', now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
