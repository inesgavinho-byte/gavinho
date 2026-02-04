-- Pesquisa semântica
CREATE OR REPLACE FUNCTION search_decisoes(
    query_embedding VECTOR(1536),
    filter_projeto_id UUID DEFAULT NULL,
    filter_estado TEXT DEFAULT 'validada',
    match_count INTEGER DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID, codigo TEXT, titulo TEXT, descricao TEXT,
    tipo TEXT, impacto TEXT, data_decisao DATE,
    decidido_por TEXT, impacto_orcamento DECIMAL,
    divisao TEXT, fonte TEXT, estado TEXT,
    projeto_id UUID, similarity FLOAT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.descricao, d.tipo, d.impacto,
           d.data_decisao, d.decidido_por, d.impacto_orcamento,
           d.divisao, d.fonte, d.estado, d.projeto_id,
           1 - (d.embedding <=> query_embedding) AS similarity
    FROM decisoes d
    WHERE (filter_projeto_id IS NULL OR d.projeto_id = filter_projeto_id)
      AND (filter_estado IS NULL OR d.estado = filter_estado)
      AND d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Pesquisa full-text
CREATE OR REPLACE FUNCTION search_decisoes_fulltext(
    search_query TEXT,
    filter_projeto_id UUID DEFAULT NULL,
    filter_estado TEXT DEFAULT 'validada',
    filter_tipo TEXT DEFAULT NULL,
    filter_impacto TEXT DEFAULT NULL,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID, codigo TEXT, titulo TEXT, descricao TEXT,
    tipo TEXT, impacto TEXT, data_decisao DATE,
    decidido_por TEXT, impacto_orcamento DECIMAL,
    divisao TEXT, fonte TEXT, estado TEXT,
    projeto_id UUID, rank REAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    tsquery_text TSQUERY;
BEGIN
    tsquery_text := plainto_tsquery('portuguese', search_query);
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.descricao, d.tipo, d.impacto,
           d.data_decisao, d.decidido_por, d.impacto_orcamento,
           d.divisao, d.fonte, d.estado, d.projeto_id,
           ts_rank(to_tsvector('portuguese', d.texto_pesquisa), tsquery_text) AS rank
    FROM decisoes d
    WHERE to_tsvector('portuguese', d.texto_pesquisa) @@ tsquery_text
      AND (filter_projeto_id IS NULL OR d.projeto_id = filter_projeto_id)
      AND (filter_estado IS NULL OR d.estado = filter_estado)
      AND (filter_tipo IS NULL OR d.tipo = filter_tipo)
      AND (filter_impacto IS NULL OR d.impacto = filter_impacto)
    ORDER BY rank DESC, d.data_decisao DESC
    LIMIT max_results;
END;
$$;

-- Estatísticas
CREATE OR REPLACE FUNCTION get_decisoes_stats(p_projeto_id UUID)
RETURNS TABLE (
    total INTEGER, validadas INTEGER, pendentes INTEGER,
    impacto_orcamento_total DECIMAL, impacto_prazo_total INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE estado = 'validada')::INTEGER,
        COUNT(*) FILTER (WHERE estado = 'sugerida')::INTEGER,
        COALESCE(SUM(impacto_orcamento) FILTER (WHERE estado = 'validada'), 0),
        COALESCE(SUM(impacto_prazo_dias) FILTER (WHERE estado = 'validada'), 0)::INTEGER
    FROM decisoes WHERE projeto_id = p_projeto_id;
END;
$$;

-- Decisões relacionadas
CREATE OR REPLACE FUNCTION get_decisoes_relacionadas(
    p_decisao_id UUID,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (id UUID, codigo TEXT, titulo TEXT, tipo TEXT, data_decisao DATE, similarity FLOAT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_embedding VECTOR(1536);
    v_projeto_id UUID;
BEGIN
    SELECT embedding, projeto_id INTO v_embedding, v_projeto_id
    FROM decisoes WHERE decisoes.id = p_decisao_id;
    IF v_embedding IS NULL THEN RETURN; END IF;
    RETURN QUERY
    SELECT d.id, d.codigo, d.titulo, d.tipo, d.data_decisao,
           1 - (d.embedding <=> v_embedding) AS similarity
    FROM decisoes d
    WHERE d.id != p_decisao_id AND d.projeto_id = v_projeto_id
      AND d.estado = 'validada' AND d.embedding IS NOT NULL
    ORDER BY d.embedding <=> v_embedding
    LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION search_decisoes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_decisoes_fulltext TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_decisoes_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_decisoes_relacionadas TO anon, authenticated;
