-- =====================================================
-- ADD SECAO COLUMN TO PROJETO ATAS
-- Para organizar atas em separadores do documento
-- =====================================================

-- Adicionar coluna secao
ALTER TABLE projeto_atas
ADD COLUMN IF NOT EXISTS secao VARCHAR(100) DEFAULT 'diario_bordo';

-- Indice para secao
CREATE INDEX IF NOT EXISTS idx_projeto_atas_secao ON projeto_atas(secao);

-- Comentario
COMMENT ON COLUMN projeto_atas.secao IS 'Secao/separador do documento: diario_bordo, reunioes_equipa, reunioes_cliente, reunioes_obra, outras';
