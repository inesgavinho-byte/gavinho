-- MQT (Mapa de Quantidades de Trabalho) Tables
-- ============================================

-- Tabela principal de mapas
CREATE TABLE IF NOT EXISTS mqt_mapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    versao VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'em_execucao', 'concluido')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de capítulos
CREATE TABLE IF NOT EXISTS mqt_capitulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapa_id UUID REFERENCES mqt_mapas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mapa_id, numero)
);

-- Tabela de items (linhas do MQT)
CREATE TABLE IF NOT EXISTS mqt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapa_id UUID REFERENCES mqt_mapas(id) ON DELETE CASCADE,
    capitulo_id UUID REFERENCES mqt_capitulos(id) ON DELETE CASCADE,
    referencia VARCHAR(50) NOT NULL,
    tipo VARCHAR(255),
    subtipo VARCHAR(255),
    zona VARCHAR(255),
    descricao TEXT NOT NULL,
    unidade VARCHAR(20) NOT NULL CHECK (unidade IN ('m²', 'm³', 'ml', 'un', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç')),
    quantidade DECIMAL(12,2) DEFAULT 0,
    preco_unitario DECIMAL(12,2) DEFAULT 0,
    -- Campos de execução
    quantidade_executada DECIMAL(12,2) DEFAULT 0,
    percentagem_execucao DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN quantidade > 0 THEN LEAST((quantidade_executada / quantidade) * 100, 100) ELSE 0 END
    ) STORED,
    data_inicio DATE,
    data_conclusao DATE,
    -- Organização
    ordem INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    item_pai_id UUID REFERENCES mqt_items(id) ON DELETE SET NULL,
    -- Metadata
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mqt_mapas_obra ON mqt_mapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_mapa ON mqt_items(mapa_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_capitulo ON mqt_items(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_mqt_items_referencia ON mqt_items(referencia);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_mqt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mqt_mapas_updated
    BEFORE UPDATE ON mqt_mapas
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

CREATE TRIGGER trigger_mqt_capitulos_updated
    BEFORE UPDATE ON mqt_capitulos
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

CREATE TRIGGER trigger_mqt_items_updated
    BEFORE UPDATE ON mqt_items
    FOR EACH ROW EXECUTE FUNCTION update_mqt_updated_at();

-- View para totais por capítulo
CREATE OR REPLACE VIEW mqt_capitulos_totais AS
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

-- View para totais do mapa
CREATE OR REPLACE VIEW mqt_mapas_totais AS
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

-- RLS Policies
ALTER TABLE mqt_mapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqt_capitulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura MQT mapas" ON mqt_mapas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT mapas" ON mqt_mapas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT mapas" ON mqt_mapas FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT mapas" ON mqt_mapas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura MQT capitulos" ON mqt_capitulos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT capitulos" ON mqt_capitulos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT capitulos" ON mqt_capitulos FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT capitulos" ON mqt_capitulos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura MQT items" ON mqt_items FOR SELECT USING (true);
CREATE POLICY "Permitir inserção MQT items" ON mqt_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização MQT items" ON mqt_items FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminação MQT items" ON mqt_items FOR DELETE USING (true);

-- Comentários
COMMENT ON TABLE mqt_mapas IS 'Mapas de Quantidades de Trabalho principais';
COMMENT ON TABLE mqt_capitulos IS 'Capítulos do MQT (ex: Demolições, Alvenarias, etc.)';
COMMENT ON TABLE mqt_items IS 'Items individuais do MQT com quantidades e preços';
