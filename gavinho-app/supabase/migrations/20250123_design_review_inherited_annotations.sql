-- =====================================================
-- Design Review - Herança de Comentários entre Versões
-- Permite que comentários não resolvidos sejam copiados
-- automaticamente para novas versões do desenho
-- =====================================================

-- Adicionar coluna para rastrear comentários herdados
ALTER TABLE design_review_annotations
ADD COLUMN IF NOT EXISTS herdado_de UUID REFERENCES design_review_annotations(id);

-- Índice para melhor performance em queries de herança
CREATE INDEX IF NOT EXISTS idx_annotations_herdado
ON design_review_annotations(herdado_de)
WHERE herdado_de IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN design_review_annotations.herdado_de IS 'Referência ao comentário original de uma versão anterior. NULL se for um comentário original.';
