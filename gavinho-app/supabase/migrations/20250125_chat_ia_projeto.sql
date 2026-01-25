-- =====================================================
-- CHAT IA POR PROJECTO - Schema completo
-- Skills, Contexto, Chats e Mensagens
-- =====================================================

-- =====================================================
-- 1. SKILLS (conhecimento especializado)
-- =====================================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identificacao
    codigo TEXT NOT NULL UNIQUE,           -- 'licenciamento-sintra', 'orcamentacao-luxo'
    nome TEXT NOT NULL,                    -- 'Licenciamento Sintra'
    descricao TEXT,

    -- Classificacao
    tipo TEXT NOT NULL DEFAULT 'global',   -- 'global', 'municipio', 'especialidade', 'tipologia'
    categoria TEXT,                        -- Para agrupamento na UI
    icone TEXT,                            -- Nome do icone lucide-react

    -- Conteudo da skill
    prompt_sistema TEXT NOT NULL,          -- Instrucoes detalhadas para a IA
    exemplos JSONB,                        -- Exemplos de uso [{pergunta, resposta}]

    -- Configuracao
    requer_config BOOLEAN DEFAULT false,   -- Se precisa de parametros por projecto
    config_schema JSONB,                   -- JSON Schema dos parametros

    -- Estado
    activo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_tipo ON skills(tipo);
CREATE INDEX IF NOT EXISTS idx_skills_activo ON skills(activo);

-- =====================================================
-- 2. PROJETO CONTEXTO (instrucoes, documentos, regras)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_contexto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    tipo TEXT NOT NULL,                    -- 'instrucao', 'documento', 'regra', 'briefing'
    titulo TEXT NOT NULL,

    -- Conteudo
    conteudo TEXT NOT NULL,                -- Markdown ou texto

    -- Configuracao
    activo BOOLEAN DEFAULT true,
    incluir_sempre BOOLEAN DEFAULT true,   -- Se deve ser incluido em todos os chats
    ordem INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_contexto_projeto ON projeto_contexto(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_contexto_activo ON projeto_contexto(activo);

-- =====================================================
-- 3. PROJETO SKILLS (skills activadas por projecto)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

    -- Configuracao especifica para este projecto
    config JSONB,                          -- Parametros da skill

    -- Estado
    activo BOOLEAN DEFAULT true,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_by UUID REFERENCES utilizadores(id),

    -- Constraint unica
    UNIQUE(projeto_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_skills_projeto ON projeto_skills(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_skills_skill ON projeto_skills(skill_id);

-- =====================================================
-- 4. PROJETO CHATS (chats por assunto)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    titulo TEXT NOT NULL,                  -- 'Discussao Cozinha', 'Duvidas AVAC'
    descricao TEXT,

    -- Categorizacao
    categoria TEXT,                        -- 'design', 'tecnico', 'cliente', 'obra', 'geral'
    tags TEXT[],

    -- Skills especificas deste chat (opcional, herda do projecto se vazio)
    skills_override UUID[],                -- IDs de skills para usar neste chat especifico

    -- Estado
    estado TEXT DEFAULT 'activo',          -- 'activo', 'arquivado', 'resolvido'
    fixado BOOLEAN DEFAULT false,          -- Para aparecer no topo

    -- Contadores (desnormalizados para performance)
    total_mensagens INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id),
    last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_projeto_chats_projeto ON projeto_chats(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_chats_estado ON projeto_chats(estado);
CREATE INDEX IF NOT EXISTS idx_projeto_chats_last_message ON projeto_chats(last_message_at DESC);

-- =====================================================
-- 5. PROJETO CHAT MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_chat_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES projeto_chats(id) ON DELETE CASCADE,

    -- Conteudo
    role TEXT NOT NULL,                    -- 'user', 'assistant', 'system'
    conteudo TEXT NOT NULL,

    -- Metadados do utilizador
    autor_id UUID REFERENCES utilizadores(id),
    autor_nome TEXT,                       -- Desnormalizado para historico

    -- Metadados da IA (quando role='assistant')
    modelo TEXT,                           -- 'claude-sonnet-4-20250514'
    tokens_input INTEGER,
    tokens_output INTEGER,
    tempo_resposta_ms INTEGER,

    -- Contexto usado (para debugging/auditoria)
    contexto_usado JSONB,                  -- {skills: [...], contexto: [...]}

    -- Anexos
    anexos JSONB,                          -- [{tipo, url, nome, tamanho}]

    -- Feedback
    feedback TEXT,                         -- 'positivo', 'negativo', null
    feedback_comentario TEXT,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_chat ON projeto_chat_mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON projeto_chat_mensagens(created_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para updated_at em skills
DROP TRIGGER IF EXISTS trigger_skills_updated_at ON skills;
CREATE TRIGGER trigger_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at em projeto_contexto
DROP TRIGGER IF EXISTS trigger_projeto_contexto_updated_at ON projeto_contexto;
CREATE TRIGGER trigger_projeto_contexto_updated_at
    BEFORE UPDATE ON projeto_contexto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at em projeto_chats
DROP TRIGGER IF EXISTS trigger_projeto_chats_updated_at ON projeto_chats;
CREATE TRIGGER trigger_projeto_chats_updated_at
    BEFORE UPDATE ON projeto_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar contadores no chat
CREATE OR REPLACE FUNCTION update_chat_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projeto_chats
        SET total_mensagens = total_mensagens + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.chat_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projeto_chats
        SET total_mensagens = GREATEST(total_mensagens - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.chat_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_counters ON projeto_chat_mensagens;
CREATE TRIGGER trigger_update_chat_counters
    AFTER INSERT OR DELETE ON projeto_chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_counters();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_contexto ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Policies para skills
DROP POLICY IF EXISTS "Skills visiveis para autenticados" ON skills;
DROP POLICY IF EXISTS "Skills editaveis por admins" ON skills;
CREATE POLICY "Skills visiveis para autenticados" ON skills FOR SELECT USING (true);
CREATE POLICY "Skills editaveis por admins" ON skills FOR ALL USING (true);

-- Policies para projeto_contexto
DROP POLICY IF EXISTS "Contexto acessivel para autenticados" ON projeto_contexto;
CREATE POLICY "Contexto acessivel para autenticados" ON projeto_contexto FOR ALL USING (true);

-- Policies para projeto_skills
DROP POLICY IF EXISTS "Projeto skills acessivel para autenticados" ON projeto_skills;
CREATE POLICY "Projeto skills acessivel para autenticados" ON projeto_skills FOR ALL USING (true);

-- Policies para projeto_chats
DROP POLICY IF EXISTS "Chats acessiveis para autenticados" ON projeto_chats;
CREATE POLICY "Chats acessiveis para autenticados" ON projeto_chats FOR ALL USING (true);

-- Policies para projeto_chat_mensagens
DROP POLICY IF EXISTS "Mensagens acessiveis para autenticados" ON projeto_chat_mensagens;
CREATE POLICY "Mensagens acessiveis para autenticados" ON projeto_chat_mensagens FOR ALL USING (true);

-- =====================================================
-- SEED: Skills Base
-- =====================================================
INSERT INTO skills (codigo, nome, descricao, tipo, categoria, icone, prompt_sistema, activo, ordem) VALUES

-- LICENCIAMENTOS
('licenciamento-sintra', 'Licenciamento Sintra', 'Conhecimento especializado sobre PDM de Sintra, regulamentos urbanisticos e processos de licenciamento no concelho.', 'municipio', 'Licenciamentos', 'map-pin',
'Es um especialista em licenciamento urbanistico no concelho de Sintra, Portugal.

CONHECIMENTO BASE:
- PDM de Sintra (Revisao 2019)
- RGEU e RJUE actualizados
- Regulamentos municipais especificos
- Processos de licenciamento, comunicacao previa e autorizacao
- Condicionantes (REN, RAN, Patrimonio, Servidoes)

COMPORTAMENTO:
- Responde sempre em portugues de Portugal
- Cita artigos especificos quando relevante
- Alerta para condicionantes que possam afectar o projecto
- Sugere documentacao necessaria para submissoes
- Indica prazos legais quando aplicavel

LIMITACOES:
- Nao tens acesso a processos em curso na camara
- Recomenda sempre confirmacao junto dos servicos municipais para casos especificos',
true, 1),

('licenciamento-lisboa', 'Licenciamento Lisboa', 'Conhecimento sobre PDM de Lisboa e processos de licenciamento no concelho.', 'municipio', 'Licenciamentos', 'map-pin',
'Es um especialista em licenciamento urbanistico no concelho de Lisboa, Portugal.

CONHECIMENTO BASE:
- PDM de Lisboa (2012, com alteracoes)
- Regulamento Municipal de Urbanizacao e Edificacao
- RGEU e RJUE actualizados
- Zonas historicas e proteccao do patrimonio

COMPORTAMENTO:
- Responde sempre em portugues de Portugal
- Considera especificidades das zonas historicas
- Alerta para condicionantes de patrimonio
- Indica documentacao especifica para Lisboa',
true, 2),

-- ORCAMENTACAO
('orcamentacao-luxo', 'Orcamentacao Luxo', 'Especialista em orcamentacao de projectos residenciais de luxo, margens, markups e estrutura de propostas.', 'global', 'Financeiro', 'calculator',
'Es um especialista em orcamentacao de projectos de arquitectura e construcao de luxo.

CONHECIMENTO BASE:
- Estrutura de custos: projecto, licenciamento, construcao, equipamentos, contingencia
- Margens tipicas: 15-25% em Design & Build
- Markups por especialidade
- Custos de referencia do mercado portugues
- Fornecedores premium e suas faixas de preco

COMPORTAMENTO:
- Apresenta valores em Euros (EUR)
- Usa formato portugues: 1.234,56 EUR
- Inclui sempre contingencia (8-12%)
- Alerta para custos frequentemente subestimados
- Sugere alternativas quando budget e limitado

CALCULOS:
- Custo/m2 construcao nova luxo: 2.500-4.000 EUR/m2
- Custo/m2 remodelacao luxo: 1.500-3.000 EUR/m2
- Honorarios arquitectura: 8-12% do valor de construcao
- Fiscalizacao: 3-5% do valor de construcao',
true, 10),

-- ESPECIALIDADES TECNICAS
('avac-residencial', 'AVAC Residencial', 'Conhecimento sobre sistemas de climatizacao para habitacao unifamiliar de luxo.', 'especialidade', 'Tecnico', 'thermometer',
'Es um especialista em sistemas AVAC para habitacao residencial de luxo.

CONHECIMENTO BASE:
- Sistemas VRV/VRF (Daikin, Mitsubishi, LG)
- Piso radiante e tecto radiante
- Ventilacao mecanica com recuperacao de calor
- Desumidificacao para piscinas interiores
- Integracao com domotica (KNX, Loxone)
- Eficiencia energetica e classe A+

DIMENSIONAMENTO:
- Cargas termicas tipicas
- Caudais de ar por divisao
- Potencias de referencia

COMPORTAMENTO:
- Sugere solucoes silenciosas para zonas de dormir
- Considera integracao arquitectonica (grelhas, difusores)
- Alerta para necessidades de espaco tecnico',
true, 20),

('estruturas-residencial', 'Estruturas Residencial', 'Conhecimento sobre solucoes estruturais para habitacao unifamiliar.', 'especialidade', 'Tecnico', 'building',
'Es um engenheiro de estruturas especializado em habitacao unifamiliar.

CONHECIMENTO BASE:
- Betao armado, estruturas metalicas, madeira lamelada
- Vaos e consolas tipicos
- Fundacoes (directas, indirectas, contencoes)
- Lajes (macicas, fungiformes, colaborantes)
- Sismorresistencia (zona sismica portuguesa)

COMPORTAMENTO:
- Valida viabilidade de solucoes arquitectonicas
- Alerta para condicionantes estruturais
- Sugere solucoes para vaos grandes
- Considera integracao de instalacoes',
true, 21),

-- CLIENTE E COMUNICACAO
('comunicacao-cliente-premium', 'Comunicacao Cliente Premium', 'Tom e estilo de comunicacao para clientes de alto valor.', 'global', 'Comunicacao', 'message-circle',
'Adoptas um tom de comunicacao adequado a clientes de alto valor (HNW - High Net Worth).

CARACTERISTICAS:
- Tom profissional mas caloroso
- Nunca uses linguagem tecnica sem explicacao
- Antecipa questoes e preocupacoes
- Demonstra atencao ao detalhe
- Personaliza a comunicacao

ESTRUTURA DE EMAILS:
- Saudacao personalizada
- Contexto breve
- Informacao principal (clara e organizada)
- Proximos passos concretos
- Disponibilidade para esclarecer

EVITAR:
- Jargao tecnico excessivo
- Respostas genericas
- Tom demasiado formal ou distante
- Promessas que nao possam ser cumpridas',
true, 30),

-- GESTAO DE PROJECTO
('gestao-projeto-db', 'Gestao Projeto Design & Build', 'Metodologias e boas praticas para gestao de projectos Design & Build.', 'global', 'Gestao', 'clipboard-list',
'Es um gestor de projectos senior especializado em Design & Build residencial de luxo.

CONHECIMENTO BASE:
- Fases de projecto: Briefing -> Conceito -> Desenvolvimento -> Execucao -> Obra -> Entrega
- Gestao de stakeholders
- Controlo de ambito, prazo e custo
- Gestao de alteracoes e decisoes
- Coordenacao de equipas multidisciplinares

FERRAMENTAS:
- Planning e milestones
- Gestao de riscos
- Reporting ao cliente
- Reunioes de obra

COMPORTAMENTO:
- Foca em solucoes, nao em problemas
- Documenta tudo
- Antecipa conflitos
- Mantem cliente informado',
true, 40)

ON CONFLICT (codigo) DO NOTHING;
