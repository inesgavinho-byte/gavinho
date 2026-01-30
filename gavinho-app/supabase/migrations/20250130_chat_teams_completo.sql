-- =====================================================
-- CHAT TEAMS - Sistema completo tipo Microsoft Teams
-- Canais, Mensagens, Presenca, Typing, Leituras, etc.
-- =====================================================

-- =====================================================
-- 1. CANAIS DE CHAT (por projeto)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_canais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

    -- Identificacao
    nome TEXT NOT NULL,
    descricao TEXT,
    icone TEXT DEFAULT 'hash',              -- hash, megaphone, lock, users

    -- Configuracao
    tipo TEXT DEFAULT 'publico',            -- 'publico', 'privado'
    ordem INTEGER DEFAULT 0,

    -- Estado
    arquivado BOOLEAN DEFAULT false,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_canais_projeto ON chat_canais(projeto_id);
CREATE INDEX IF NOT EXISTS idx_chat_canais_ordem ON chat_canais(ordem);

-- =====================================================
-- 2. TOPICOS DE CHAT (threads dentro de canais)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_topicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    canal_id UUID NOT NULL REFERENCES chat_canais(id) ON DELETE CASCADE,

    -- Identificacao
    titulo TEXT NOT NULL,
    descricao TEXT,

    -- Estado
    fixado BOOLEAN DEFAULT false,
    fechado BOOLEAN DEFAULT false,

    -- Contadores (desnormalizados)
    total_mensagens INTEGER DEFAULT 0,
    total_respostas INTEGER DEFAULT 0,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES utilizadores(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_topicos_canal ON chat_topicos(canal_id);
CREATE INDEX IF NOT EXISTS idx_chat_topicos_fixado ON chat_topicos(fixado DESC);
CREATE INDEX IF NOT EXISTS idx_chat_topicos_updated ON chat_topicos(updated_at DESC);

-- =====================================================
-- 3. MENSAGENS DE CHAT
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES chat_mensagens(id) ON DELETE SET NULL, -- Para replies em thread

    -- Conteudo
    conteudo TEXT NOT NULL,
    conteudo_formatado TEXT,                -- HTML renderizado do markdown/rich text
    tipo TEXT DEFAULT 'texto',              -- 'texto', 'imagem', 'ficheiro', 'sistema'

    -- Ficheiros (quando tipo = imagem ou ficheiro)
    ficheiro_url TEXT,
    ficheiro_nome TEXT,
    ficheiro_tamanho INTEGER,
    ficheiro_tipo TEXT,                     -- MIME type

    -- Edicao
    editado BOOLEAN DEFAULT false,
    editado_at TIMESTAMP WITH TIME ZONE,
    versao_atual INTEGER DEFAULT 1,

    -- Eliminacao (soft delete)
    eliminado BOOLEAN DEFAULT false,
    eliminado_at TIMESTAMP WITH TIME ZONE,
    eliminado_por UUID REFERENCES utilizadores(id),

    -- Metadados
    autor_id UUID REFERENCES utilizadores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_topico ON chat_mensagens(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_parent ON chat_mensagens(parent_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_autor ON chat_mensagens(autor_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON chat_mensagens(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_eliminado ON chat_mensagens(eliminado);

-- Full text search nas mensagens
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_search ON chat_mensagens
    USING gin(to_tsvector('portuguese', coalesce(conteudo, '')));

-- =====================================================
-- 4. HISTORICO DE EDICOES DE MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mensagens_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,

    -- Conteudo anterior
    conteudo_anterior TEXT NOT NULL,
    versao INTEGER NOT NULL,

    -- Quem editou
    editado_por UUID REFERENCES utilizadores(id),
    editado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_hist_mensagem ON chat_mensagens_historico(mensagem_id);

-- =====================================================
-- 5. REACOES A MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_reacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Um utilizador so pode reagir uma vez com o mesmo emoji
    UNIQUE(mensagem_id, utilizador_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reacoes_mensagem ON chat_reacoes(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_chat_reacoes_utilizador ON chat_reacoes(utilizador_id);

-- =====================================================
-- 6. MENCOES (@utilizador)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_mencoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Estado de leitura
    lido BOOLEAN DEFAULT false,
    lido_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_mencoes_mensagem ON chat_mencoes(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_chat_mencoes_utilizador ON chat_mencoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_mencoes_nao_lidas ON chat_mencoes(utilizador_id, lido) WHERE NOT lido;

-- =====================================================
-- 7. ANEXOS DE MENSAGENS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_anexos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,

    -- Ficheiro
    url TEXT NOT NULL,
    nome TEXT NOT NULL,
    tamanho INTEGER,
    tipo TEXT,                              -- MIME type

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_anexos_mensagem ON chat_anexos(mensagem_id);

-- =====================================================
-- 8. LEITURA DE MENSAGENS (para "nao lidas")
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_leituras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Ultima mensagem lida
    ultima_mensagem_id UUID REFERENCES chat_mensagens(id) ON DELETE SET NULL,
    ultima_leitura_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(topico_id, utilizador_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_leituras_topico ON chat_leituras(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_leituras_utilizador ON chat_leituras(utilizador_id);

-- =====================================================
-- 9. PRESENCA ONLINE DOS UTILIZADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_presenca (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE UNIQUE,

    -- Estado
    estado TEXT DEFAULT 'offline',          -- 'online', 'away', 'busy', 'offline'
    estado_custom TEXT,                     -- Mensagem de estado personalizada

    -- Ultima actividade
    ultima_actividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Dispositivo/contexto
    dispositivo TEXT,                       -- 'web', 'mobile', 'desktop'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_presenca_estado ON chat_presenca(estado);
CREATE INDEX IF NOT EXISTS idx_chat_presenca_actividade ON chat_presenca(ultima_actividade DESC);

-- =====================================================
-- 10. TYPING INDICATOR (quem esta a escrever)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_typing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES chat_topicos(id) ON DELETE CASCADE,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Timestamp de quando comecou a escrever
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Expira automaticamente (TTL de 5 segundos)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 seconds'),

    -- Unique constraint - um utilizador so pode estar a escrever num topico de cada vez
    UNIQUE(topico_id, utilizador_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_typing_topico ON chat_typing(topico_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_expires ON chat_typing(expires_at);

-- =====================================================
-- 11. NOTIFICACOES PUSH
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Tipo e referencia
    tipo TEXT NOT NULL,                     -- 'mensagem', 'mencao', 'reacao', 'resposta'
    mensagem_id UUID REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    topico_id UUID REFERENCES chat_topicos(id) ON DELETE CASCADE,
    canal_id UUID REFERENCES chat_canais(id) ON DELETE CASCADE,

    -- Conteudo
    titulo TEXT NOT NULL,
    corpo TEXT,

    -- Quem originou
    originado_por UUID REFERENCES utilizadores(id),

    -- Estado
    lido BOOLEAN DEFAULT false,
    lido_at TIMESTAMP WITH TIME ZONE,

    -- Push notification
    push_enviado BOOLEAN DEFAULT false,
    push_enviado_at TIMESTAMP WITH TIME ZONE,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_notif_utilizador ON chat_notificacoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_notif_nao_lidas ON chat_notificacoes(utilizador_id, lido) WHERE NOT lido;
CREATE INDEX IF NOT EXISTS idx_chat_notif_created ON chat_notificacoes(created_at DESC);

-- =====================================================
-- 12. SUBSCRICOES DE NOTIFICACAO (preferencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_subscricoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Referencia (pode ser canal ou topico)
    canal_id UUID REFERENCES chat_canais(id) ON DELETE CASCADE,
    topico_id UUID REFERENCES chat_topicos(id) ON DELETE CASCADE,

    -- Preferencias
    notificar BOOLEAN DEFAULT true,
    notificar_mencoes BOOLEAN DEFAULT true,
    notificar_respostas BOOLEAN DEFAULT true,

    -- Silenciar ate
    silenciado_ate TIMESTAMP WITH TIME ZONE,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Apenas uma subscricao por utilizador/canal ou utilizador/topico
    UNIQUE(utilizador_id, canal_id),
    UNIQUE(utilizador_id, topico_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_subs_utilizador ON chat_subscricoes(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_chat_subs_canal ON chat_subscricoes(canal_id);
CREATE INDEX IF NOT EXISTS idx_chat_subs_topico ON chat_subscricoes(topico_id);

-- =====================================================
-- 13. PUSH SUBSCRIPTION (Web Push API)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utilizador_id UUID NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,

    -- Web Push subscription data
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,                   -- Public key
    auth TEXT NOT NULL,                     -- Auth secret

    -- Dispositivo
    user_agent TEXT,
    dispositivo TEXT,                       -- 'chrome', 'firefox', 'safari', etc.

    -- Estado
    activo BOOLEAN DEFAULT true,
    ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_utilizador ON chat_push_subscriptions(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_activo ON chat_push_subscriptions(activo) WHERE activo;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Funcao generica para updated_at (se nao existir)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_chat_canais_updated ON chat_canais;
CREATE TRIGGER trigger_chat_canais_updated
    BEFORE UPDATE ON chat_canais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_topicos_updated ON chat_topicos;
CREATE TRIGGER trigger_chat_topicos_updated
    BEFORE UPDATE ON chat_topicos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_mensagens_updated ON chat_mensagens;
CREATE TRIGGER trigger_chat_mensagens_updated
    BEFORE UPDATE ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_presenca_updated ON chat_presenca;
CREATE TRIGGER trigger_chat_presenca_updated
    BEFORE UPDATE ON chat_presenca
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar contadores de mensagens no topico
CREATE OR REPLACE FUNCTION update_topico_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_id IS NULL THEN
            UPDATE chat_topicos SET total_mensagens = total_mensagens + 1, updated_at = NOW() WHERE id = NEW.topico_id;
        ELSE
            UPDATE chat_topicos SET total_respostas = total_respostas + 1, updated_at = NOW() WHERE id = NEW.topico_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.parent_id IS NULL THEN
            UPDATE chat_topicos SET total_mensagens = GREATEST(total_mensagens - 1, 0), updated_at = NOW() WHERE id = OLD.topico_id;
        ELSE
            UPDATE chat_topicos SET total_respostas = GREATEST(total_respostas - 1, 0), updated_at = NOW() WHERE id = OLD.topico_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_topico_counters ON chat_mensagens;
CREATE TRIGGER trigger_update_topico_counters
    AFTER INSERT OR DELETE ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_topico_counters();

-- Trigger para guardar historico de edicoes
CREATE OR REPLACE FUNCTION save_mensagem_historico()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.conteudo IS DISTINCT FROM NEW.conteudo THEN
        INSERT INTO chat_mensagens_historico (mensagem_id, conteudo_anterior, versao, editado_por, editado_at)
        VALUES (OLD.id, OLD.conteudo, OLD.versao_atual, NEW.autor_id, NOW());

        NEW.editado = true;
        NEW.editado_at = NOW();
        NEW.versao_atual = OLD.versao_atual + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_save_mensagem_historico ON chat_mensagens;
CREATE TRIGGER trigger_save_mensagem_historico
    BEFORE UPDATE OF conteudo ON chat_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION save_mensagem_historico();

-- Funcao para limpar typing indicators expirados
CREATE OR REPLACE FUNCTION cleanup_expired_typing()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_typing WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Funcao para actualizar presenca para "away" apos inactividade
CREATE OR REPLACE FUNCTION update_away_presence()
RETURNS void AS $$
BEGIN
    UPDATE chat_presenca
    SET estado = 'away', updated_at = NOW()
    WHERE estado = 'online'
    AND ultima_actividade < NOW() - INTERVAL '5 minutes';

    UPDATE chat_presenca
    SET estado = 'offline', updated_at = NOW()
    WHERE estado IN ('online', 'away')
    AND ultima_actividade < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCOES UTILITARIAS
-- =====================================================

-- Funcao para contar mensagens nao lidas num topico
CREATE OR REPLACE FUNCTION get_unread_count(p_topico_id UUID, p_utilizador_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_ultima_leitura TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    -- Obter ultima leitura
    SELECT ultima_leitura_at INTO v_ultima_leitura
    FROM chat_leituras
    WHERE topico_id = p_topico_id AND utilizador_id = p_utilizador_id;

    -- Se nunca leu, conta todas
    IF v_ultima_leitura IS NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM chat_mensagens
        WHERE topico_id = p_topico_id AND eliminado = false AND autor_id != p_utilizador_id;
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM chat_mensagens
        WHERE topico_id = p_topico_id
        AND eliminado = false
        AND autor_id != p_utilizador_id
        AND created_at > v_ultima_leitura;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Funcao para pesquisar mensagens
CREATE OR REPLACE FUNCTION search_chat_messages(
    p_projeto_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    mensagem_id UUID,
    topico_id UUID,
    canal_id UUID,
    canal_nome TEXT,
    topico_titulo TEXT,
    conteudo TEXT,
    autor_nome TEXT,
    autor_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS mensagem_id,
        m.topico_id,
        c.id AS canal_id,
        c.nome AS canal_nome,
        t.titulo AS topico_titulo,
        m.conteudo,
        u.nome AS autor_nome,
        u.avatar_url AS autor_avatar,
        m.created_at,
        ts_rank(to_tsvector('portuguese', m.conteudo), plainto_tsquery('portuguese', p_query)) AS rank
    FROM chat_mensagens m
    JOIN chat_topicos t ON m.topico_id = t.id
    JOIN chat_canais c ON t.canal_id = c.id
    LEFT JOIN utilizadores u ON m.autor_id = u.id
    WHERE c.projeto_id = p_projeto_id
    AND m.eliminado = false
    AND to_tsvector('portuguese', m.conteudo) @@ plainto_tsquery('portuguese', p_query)
    ORDER BY rank DESC, m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE chat_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_subscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies - permitir acesso a utilizadores autenticados
-- (Numa implementacao mais robusta, verificariamos se o utilizador pertence ao projeto)

CREATE POLICY "chat_canais_all" ON chat_canais FOR ALL USING (true);
CREATE POLICY "chat_topicos_all" ON chat_topicos FOR ALL USING (true);
CREATE POLICY "chat_mensagens_all" ON chat_mensagens FOR ALL USING (true);
CREATE POLICY "chat_mensagens_historico_all" ON chat_mensagens_historico FOR ALL USING (true);
CREATE POLICY "chat_reacoes_all" ON chat_reacoes FOR ALL USING (true);
CREATE POLICY "chat_mencoes_all" ON chat_mencoes FOR ALL USING (true);
CREATE POLICY "chat_anexos_all" ON chat_anexos FOR ALL USING (true);
CREATE POLICY "chat_leituras_all" ON chat_leituras FOR ALL USING (true);
CREATE POLICY "chat_presenca_all" ON chat_presenca FOR ALL USING (true);
CREATE POLICY "chat_typing_all" ON chat_typing FOR ALL USING (true);
CREATE POLICY "chat_notificacoes_all" ON chat_notificacoes FOR ALL USING (true);
CREATE POLICY "chat_subscricoes_all" ON chat_subscricoes FOR ALL USING (true);
CREATE POLICY "chat_push_subscriptions_all" ON chat_push_subscriptions FOR ALL USING (true);

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================
-- Habilitar realtime para as tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presenca;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_notificacoes;
