-- =====================================================
-- GAVINHO Platform - Licenciamentos Module
-- Database Schema Migration
-- =====================================================

-- 1. Tabela: concelhos
-- Armazena a configuração de cada concelho suportado
CREATE TABLE IF NOT EXISTS concelhos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    codigo TEXT UNIQUE NOT NULL,           -- 'sintra', 'lisboa'
    nome TEXT NOT NULL,                    -- 'Sintra', 'Lisboa'
    activo BOOLEAN DEFAULT true,

    -- Configuração específica do concelho
    config JSONB NOT NULL DEFAULT '{}',

    -- Metadados
    data_referencia_normativa DATE,        -- Data de referência do PDM
    versao_pdm TEXT,
    notas TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO concelhos (codigo, nome, data_referencia_normativa, versao_pdm, activo) VALUES
('sintra', 'Sintra', '2024-01-01', 'PDM 1999 (alterado)', true),
('lisboa', 'Lisboa', NULL, NULL, false)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Tabela: analises_viabilidade
-- Armazena cada análise de viabilidade urbanística
CREATE TABLE IF NOT EXISTS analises_viabilidade (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    codigo TEXT UNIQUE,                    -- 'VU-2025-001'

    -- Associação (uma das duas obrigatória)
    projeto_id TEXT REFERENCES projetos(id) ON DELETE SET NULL,
    lead_id TEXT,                          -- Para prospecção (sem FK por enquanto)

    -- Contexto territorial
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    -- Identificação do imóvel
    localizacao JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "morada": "...",
        "freguesia": "...",
        "artigo_matricial": "...",
        "descricao_predial": "..."
    }
    */

    -- Classificação do solo (INPUT normalizado)
    solo JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "classificacao": "urbano" | "rustico",
        "qualificacao": "...",
        "categoria_espaco": "..."
    }
    */

    -- Regimes aplicáveis
    regimes JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "ren": true/false,
        "ran": true/false,
        "natura2000": true/false,
        "pnsc": true/false,
        "cheias": true/false,
        "incendio": true/false,
        "patrimonio": {
            "classificado": true/false,
            "inventariado": true/false,
            "arqueologia": true/false
        }
    }
    */

    -- Preexistência
    preexistencia JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "existe": true/false,
        "valida": true/false,
        "ano_construcao": 1985,
        "titulo": "...",
        "area_construcao": 120
    }
    */

    -- Operação pretendida
    operacao JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "tipo": "construcao_nova" | "ampliacao" | "legalizacao",
        "uso": "habitacao" | "turismo" | "equipamento" | "atividades_economicas",
        "programa": "...",
        "area_pretendida": 250
    }
    */

    -- Resultado da análise
    resultado JSONB,
    /*
    {
        "classificacao": "viavel" | "viavel_condicionado" | "inviavel",
        "nivel_confianca": "alta" | "media" | "baixa",
        "fundamentacao": [...],
        "condicionantes": [...],
        "pareceres_necessarios": [...],
        "proximos_passos": [...]
    }
    */

    -- Histórico de interacções com IA
    historico_ia JSONB DEFAULT '[]',

    -- Estado do workflow
    estado TEXT DEFAULT 'rascunho',        -- 'rascunho', 'em_analise', 'validado', 'finalizado'
    validado_por TEXT REFERENCES utilizadores(id),
    validado_em TIMESTAMPTZ,

    -- Metadados
    created_by TEXT NOT NULL REFERENCES utilizadores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analises_projeto ON analises_viabilidade(projeto_id);
CREATE INDEX IF NOT EXISTS idx_analises_concelho ON analises_viabilidade(concelho_id);
CREATE INDEX IF NOT EXISTS idx_analises_estado ON analises_viabilidade(estado);
CREATE INDEX IF NOT EXISTS idx_analises_resultado ON analises_viabilidade((resultado->>'classificacao'));

-- Trigger para código automático
CREATE OR REPLACE FUNCTION generate_analise_codigo()
RETURNS TRIGGER AS $$
DECLARE
    ano TEXT;
    seq INTEGER;
BEGIN
    ano := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'VU-' || ano || '-(\d+)') AS INTEGER)), 0) + 1
    INTO seq
    FROM analises_viabilidade
    WHERE codigo LIKE 'VU-' || ano || '-%';

    NEW.codigo := 'VU-' || ano || '-' || LPAD(seq::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_analise_codigo ON analises_viabilidade;
CREATE TRIGGER tr_analise_codigo
    BEFORE INSERT ON analises_viabilidade
    FOR EACH ROW
    WHEN (NEW.codigo IS NULL)
    EXECUTE FUNCTION generate_analise_codigo();

-- 3. Tabela: analise_versoes
-- Versionamento de cada relatório gerado
CREATE TABLE IF NOT EXISTS analise_versoes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    analise_id TEXT NOT NULL REFERENCES analises_viabilidade(id) ON DELETE CASCADE,

    versao INTEGER NOT NULL,               -- 1, 2, 3...

    -- Snapshot dos dados no momento da geração
    snapshot_dados JSONB NOT NULL,

    -- Conteúdo do relatório
    conteudo_relatorio JSONB NOT NULL DEFAULT '{}',

    -- Ficheiro gerado
    ficheiro_url TEXT,                     -- URL no Supabase Storage
    ficheiro_nome TEXT,                    -- 'VU-2025-001_v1.docx'

    -- Modo de geração
    modo TEXT NOT NULL DEFAULT 'interno',  -- 'interno' | 'cliente'

    -- Metadados
    gerado_por TEXT NOT NULL REFERENCES utilizadores(id),
    gerado_em TIMESTAMPTZ DEFAULT NOW(),
    notas TEXT,

    UNIQUE(analise_id, versao)
);

-- Trigger para versão automática
CREATE OR REPLACE FUNCTION generate_versao_numero()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(versao), 0) + 1
    INTO NEW.versao
    FROM analise_versoes
    WHERE analise_id = NEW.analise_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_versao_numero ON analise_versoes;
CREATE TRIGGER tr_versao_numero
    BEFORE INSERT ON analise_versoes
    FOR EACH ROW
    WHEN (NEW.versao IS NULL)
    EXECUTE FUNCTION generate_versao_numero();

-- 4. Tabela: analise_downloads
-- Rastreabilidade de downloads
CREATE TABLE IF NOT EXISTS analise_downloads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    versao_id TEXT NOT NULL REFERENCES analise_versoes(id) ON DELETE CASCADE,

    user_id TEXT NOT NULL REFERENCES utilizadores(id),
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contexto do download
    ip_address TEXT,
    user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_downloads_versao ON analise_downloads(versao_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON analise_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_data ON analise_downloads(downloaded_at);

-- 5. Tabela: concelho_matrizes
-- Base de conhecimento por concelho (matrizes de decisão)
CREATE TABLE IF NOT EXISTS concelho_matrizes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    tipo TEXT NOT NULL,                    -- 'solo_uso', 'preexistencias', 'turismo', 'regimes_ambientais'
    nome TEXT NOT NULL,
    descricao TEXT,

    -- Regras da matriz em formato estruturado
    regras JSONB NOT NULL,

    -- Metadados
    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único por concelho e tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_matrizes_concelho_tipo
ON concelho_matrizes(concelho_id, tipo) WHERE activo = true;

-- 6. Tabela: concelho_fluxo_decisao
-- Árvore de decisão por concelho
CREATE TABLE IF NOT EXISTS concelho_fluxo_decisao (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    -- Estrutura do fluxo
    fluxo JSONB NOT NULL,

    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: concelho_prompts
-- Prompts normalizados por concelho
CREATE TABLE IF NOT EXISTS concelho_prompts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    concelho_id TEXT NOT NULL REFERENCES concelhos(id),

    codigo TEXT NOT NULL,                  -- 'viabilidade_geral_interno', 'turismo_cliente'
    nome TEXT NOT NULL,
    modo TEXT NOT NULL,                    -- 'interno' | 'cliente'
    categoria TEXT NOT NULL,               -- 'analise' | 'validacao' | 'geracao'

    -- Template do prompt (com placeholders)
    template TEXT NOT NULL,

    -- Metadados
    activo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_concelho_codigo
ON concelho_prompts(concelho_id, codigo) WHERE activo = true;

-- =====================================================
-- Views úteis
-- =====================================================

-- View: Análises com dados completos
CREATE OR REPLACE VIEW v_analises_completas AS
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

-- View: Estatísticas por concelho
CREATE OR REPLACE VIEW v_estatisticas_concelho AS
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

-- =====================================================
-- Row Level Security
-- =====================================================

-- Habilitar RLS
ALTER TABLE analises_viabilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE analise_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analise_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_matrizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_fluxo_decisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE concelho_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas para concelhos (leitura pública para utilizadores autenticados)
CREATE POLICY "Concelhos visíveis para autenticados" ON concelhos
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins editam concelhos" ON concelhos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role = 'admin'
        )
    );

-- Políticas para matrizes e prompts (leitura para GP e admin)
CREATE POLICY "Matrizes visíveis para GP e admin" ON concelho_matrizes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "Prompts visíveis para GP e admin" ON concelho_prompts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "Fluxo visível para GP e admin" ON concelho_fluxo_decisao
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para analises_viabilidade
CREATE POLICY "Analises visíveis para GP e admin" ON analises_viabilidade
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem criar analises" ON analises_viabilidade
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem editar analises" ON analises_viabilidade
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para versões (herda da análise pai)
CREATE POLICY "Versões visíveis para GP e admin" ON analise_versoes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

CREATE POLICY "GP e admin podem criar versões" ON analise_versoes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role IN ('admin', 'gp')
        )
    );

-- Políticas para downloads
CREATE POLICY "Registar próprios downloads" ON analise_downloads
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Ver downloads (admin)" ON analise_downloads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM utilizadores
            WHERE id = auth.uid()::TEXT
            AND role = 'admin'
        )
    );

-- =====================================================
-- Dados iniciais para Sintra
-- =====================================================

-- Inserir matriz de solo x uso para Sintra
INSERT INTO concelho_matrizes (concelho_id, tipo, nome, descricao, regras)
SELECT
    id,
    'solo_uso',
    'Matriz Solo x Uso',
    'Compatibilidade entre classificação/qualificação do solo e usos pretendidos',
    '{
        "urbano": {
            "espacos_centrais": {
                "habitacao": "admissivel",
                "turismo": "admissivel",
                "atividades_economicas": "admissivel",
                "equipamentos": "admissivel"
            },
            "espacos_habitacionais": {
                "habitacao": "admissivel",
                "turismo": "condicionado",
                "atividades_economicas": "condicionado",
                "equipamentos": "condicionado"
            },
            "espacos_baixa_densidade": {
                "habitacao": "admissivel",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_atividades_economicas": {
                "habitacao": "inviavel",
                "turismo": "condicionado",
                "atividades_economicas": "admissivel",
                "equipamentos": "admissivel"
            }
        },
        "rustico": {
            "espacos_naturais": {
                "habitacao": "inviavel",
                "turismo": "inviavel",
                "atividades_economicas": "inviavel",
                "equipamentos": "excecional"
            },
            "espacos_florestais": {
                "habitacao": "inviavel",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_agricolas": {
                "habitacao": "condicionado",
                "turismo": "condicionado",
                "atividades_economicas": "inviavel",
                "equipamentos": "condicionado"
            },
            "espacos_ocupacao_turistica": {
                "habitacao": "inviavel",
                "turismo": "admissivel",
                "atividades_economicas": "condicionado",
                "equipamentos": "condicionado"
            },
            "aglomerados_rurais": {
                "habitacao": "admissivel",
                "turismo": "admissivel",
                "atividades_economicas": "condicionado",
                "equipamentos": "admissivel"
            }
        }
    }'::jsonb
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;

-- Inserir prompt base para análise interna
INSERT INTO concelho_prompts (concelho_id, codigo, nome, modo, categoria, template)
SELECT
    id,
    'viabilidade_geral_interno',
    'Análise de Viabilidade Geral (Interno)',
    'interno',
    'analise',
    'Analisa a viabilidade urbanística do imóvel com os seguintes dados:

{{INPUT_NORMALIZADO}}

Segue obrigatoriamente o Fluxo Global de Decisão da GAVINHO e as Matrizes aplicáveis.

PRINCÍPIOS OBRIGATÓRIOS:
1. Hierarquia normativa prevalece sempre (Lei > PDM > Regulamentos > Interpretação)
2. Regime mais restritivo prevalece sempre que existam múltiplos regimes
3. Cumulatividade absoluta — nenhum regime elimina outro
4. Ausência de proibição ≠ permissão
5. Índices máximos não geram direitos adquiridos
6. Contexto territorial > conveniência programática

PIPELINE OBRIGATÓRIO:
1. Identificação do solo
2. Qualificação do solo
3. Identificação de regimes ambientais
4. Verificação de preexistência válida
5. Identificação do uso pretendido
6. Aplicação das matrizes relevantes
7. Verificação de pareceres vinculativos
8. Classificação final da viabilidade

Responde em formato JSON estruturado com:
- classificacao: "viavel" | "viavel_condicionado" | "inviavel"
- fundamentacao: array de objetos com norma_aplicavel, matriz_aplicada, regime_determinante
- condicionantes: array de strings
- pareceres_necessarios: array de objetos com entidade e natureza
- proximos_passos: array de strings
- nivel_confianca: "alta" | "media" | "baixa"

{{INPUT_ADICIONAL}}'
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;

-- Inserir prompt para modo cliente
INSERT INTO concelho_prompts (concelho_id, codigo, nome, modo, categoria, template)
SELECT
    id,
    'viabilidade_geral_cliente',
    'Análise de Viabilidade Geral (Cliente)',
    'cliente',
    'analise',
    'Com base na análise técnica realizada, prepara um resumo executivo para o cliente sobre a viabilidade do projeto:

{{INPUT_NORMALIZADO}}

RESULTADO DA ANÁLISE TÉCNICA:
{{RESULTADO_INTERNO}}

INSTRUÇÕES:
- Usa linguagem clara e acessível, sem jargão técnico excessivo
- Foca nos pontos principais e nas próximas etapas
- Não menciones nomenclatura interna de matrizes ou fluxos
- Sê objetivo mas profissional
- Destaca claramente a conclusão principal

Estrutura a resposta em:
1. Síntese executiva (2-3 frases)
2. Principais condicionantes (se aplicável)
3. Próximos passos recomendados
4. Nota sobre prazos/custos estimados (se relevante)'
FROM concelhos WHERE codigo = 'sintra'
ON CONFLICT DO NOTHING;
