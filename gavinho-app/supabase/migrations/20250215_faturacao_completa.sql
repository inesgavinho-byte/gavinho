-- ══════════════════════════════════════════════════════════════════
-- FATURAÇÃO COMPLETA — Migration idempotente
-- Evolui facturacao_cliente para suportar CRUD completo de faturas
-- com IVA, ligação a capítulos, estados e numeração automática
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────
-- 1. NOVOS CAMPOS na facturacao_cliente
-- ──────────────────────────────────────────────────

-- Campos de IVA
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS iva_percentagem DECIMAL(5,2) DEFAULT 23;
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS iva_valor DECIMAL(12,2);
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS total DECIMAL(12,2);

-- Ligação a capítulos do orçamento
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS capitulo_id UUID REFERENCES orcamento_capitulos(id) ON DELETE SET NULL;

-- Campos de anulação
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS data_anulacao DATE;
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS motivo_anulacao TEXT;

-- Notas e auditoria
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE facturacao_cliente ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────
-- 2. ATUALIZAR CHECK de estado
--    Adiciona novos estados mantendo compatibilidade
-- ──────────────────────────────────────────────────
ALTER TABLE facturacao_cliente DROP CONSTRAINT IF EXISTS facturacao_cliente_estado_check;
ALTER TABLE facturacao_cliente ADD CONSTRAINT facturacao_cliente_estado_check CHECK (
  estado IN ('prevista', 'facturada', 'paga', 'em_atraso', 'rascunho', 'emitida', 'anulada')
);

-- ──────────────────────────────────────────────────
-- 3. SEQUÊNCIA para numeração automática
-- ──────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS fatura_cliente_seq START 1;

-- ──────────────────────────────────────────────────
-- 4. ÍNDICES adicionais
-- ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_facturacao_cliente_capitulo ON facturacao_cliente(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_facturacao_cliente_estado ON facturacao_cliente(estado);
CREATE INDEX IF NOT EXISTS idx_facturacao_cliente_data_emissao ON facturacao_cliente(data_facturada);

-- ──────────────────────────────────────────────────
-- 5. VIEW: Lista de faturas com joins
-- ──────────────────────────────────────────────────
DROP VIEW IF EXISTS v_faturacao_lista;

CREATE OR REPLACE VIEW v_faturacao_lista AS
SELECT
  fc.id,
  fc.numero_factura,
  fc.projeto_id,
  p.codigo as projeto_codigo,
  p.nome as projeto_nome,
  fc.capitulo_id,
  oc.nome as capitulo_nome,
  fc.descricao,
  fc.percentagem_contrato,
  fc.subtotal,
  fc.iva_percentagem,
  fc.iva_valor,
  fc.total,
  fc.valor,
  fc.estado,
  fc.data_prevista,
  fc.data_facturada,
  fc.data_vencimento,
  fc.data_recebimento,
  fc.data_anulacao,
  fc.motivo_anulacao,
  fc.documento_url,
  fc.condicoes_pagamento_dias,
  fc.notas,
  fc.criado_por,
  u.nome as criado_por_nome,
  fc.created_at,
  fc.updated_at
FROM facturacao_cliente fc
LEFT JOIN projetos p ON p.id = fc.projeto_id
LEFT JOIN orcamento_capitulos oc ON oc.id = fc.capitulo_id
LEFT JOIN utilizadores u ON u.id = fc.criado_por
ORDER BY fc.created_at DESC;

-- ──────────────────────────────────────────────────
-- 6. RLS (já existe, garantir que está ativo)
-- ──────────────────────────────────────────────────
ALTER TABLE facturacao_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facturacao_cliente_all" ON facturacao_cliente;
CREATE POLICY "facturacao_cliente_all"
  ON facturacao_cliente FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────
-- 7. TRIGGER updated_at (já existe, garantir)
-- ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_facturacao_cliente_updated ON facturacao_cliente;
CREATE TRIGGER trg_facturacao_cliente_updated
  BEFORE UPDATE ON facturacao_cliente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
