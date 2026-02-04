-- Tabela principal de decisões
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS decisoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    codigo TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    justificacao TEXT,
    alternativas_consideradas JSONB,
    tipo TEXT NOT NULL,
    categoria TEXT,
    impacto TEXT NOT NULL DEFAULT 'medio',
    tags TEXT[],
    decidido_por TEXT NOT NULL,
    decidido_por_tipo TEXT DEFAULT 'cliente',
    aprovado_por UUID REFERENCES utilizadores(id),
    data_decisao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    impacto_orcamento DECIMAL(12,2),
    impacto_orcamento_percentagem DECIMAL(5,2),
    categoria_orcamento TEXT,
    impacto_prazo_dias INTEGER,
    fase_afectada TEXT,
    fonte TEXT NOT NULL DEFAULT 'manual',
    fonte_referencia TEXT,
    fonte_url TEXT,
    fonte_excerto TEXT,
    estado TEXT NOT NULL DEFAULT 'sugerida',
    superseded_by UUID REFERENCES decisoes(id),
    supersedes UUID REFERENCES decisoes(id),
    obra_id UUID REFERENCES obras(id),
    divisao TEXT,
    fornecedor_id UUID REFERENCES fornecedores(id),
    texto_pesquisa TEXT GENERATED ALWAYS AS (
        COALESCE(titulo, '') || ' ' ||
        COALESCE(descricao, '') || ' ' ||
        COALESCE(justificacao, '') || ' ' ||
        COALESCE(divisao, '') || ' ' ||
        COALESCE(categoria, '') || ' ' ||
        COALESCE(array_to_string(tags, ' '), '')
    ) STORED,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    CONSTRAINT valid_tipo CHECK (tipo IN ('design', 'material', 'tecnico', 'financeiro', 'prazo', 'fornecedor', 'alteracao')),
    CONSTRAINT valid_impacto CHECK (impacto IN ('critico', 'alto', 'medio', 'baixo')),
    CONSTRAINT valid_estado CHECK (estado IN ('sugerida', 'validada', 'superseded', 'rejeitada')),
    CONSTRAINT valid_fonte CHECK (fonte IN ('email', 'reuniao', 'chat', 'manual')),
    CONSTRAINT valid_decidido_por_tipo CHECK (decidido_por_tipo IN ('cliente', 'gavinho', 'conjunto'))
);

-- Índices
CREATE INDEX idx_decisoes_projeto ON decisoes(projeto_id);
CREATE INDEX idx_decisoes_estado ON decisoes(estado);
CREATE INDEX idx_decisoes_tipo ON decisoes(tipo);
CREATE INDEX idx_decisoes_data ON decisoes(data_decisao DESC);
CREATE INDEX idx_decisoes_pesquisa ON decisoes USING gin(to_tsvector('portuguese', texto_pesquisa));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION generate_decisao_codigo()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE WHEN codigo ~ '^DEC-[0-9]+$'
        THEN CAST(SUBSTRING(codigo FROM 5) AS INTEGER) ELSE 0 END
    ), 0) + 1 INTO next_num
    FROM decisoes WHERE projeto_id = NEW.projeto_id;
    NEW.codigo := 'DEC-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisao_codigo
    BEFORE INSERT ON decisoes
    FOR EACH ROW WHEN (NEW.codigo IS NULL)
    EXECUTE FUNCTION generate_decisao_codigo();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_decisoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_updated
    BEFORE UPDATE ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION update_decisoes_updated_at();
