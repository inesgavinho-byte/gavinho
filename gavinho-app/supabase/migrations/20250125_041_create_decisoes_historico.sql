-- Tabela de auditoria de alterações
CREATE TABLE IF NOT EXISTS decisoes_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decisao_id UUID NOT NULL REFERENCES decisoes(id) ON DELETE CASCADE,
    campo_alterado TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    alterado_por UUID REFERENCES utilizadores(id),
    alterado_em TIMESTAMPTZ DEFAULT NOW(),
    motivo TEXT
);

CREATE INDEX idx_decisoes_historico_decisao ON decisoes_historico(decisao_id);
CREATE INDEX idx_decisoes_historico_data ON decisoes_historico(alterado_em DESC);

-- Trigger para logging automático
CREATE OR REPLACE FUNCTION log_decisao_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'estado', OLD.estado, NEW.estado, NEW.aprovado_por);
    END IF;
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'titulo', OLD.titulo, NEW.titulo, NEW.aprovado_por);
    END IF;
    IF OLD.impacto_orcamento IS DISTINCT FROM NEW.impacto_orcamento THEN
        INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
        VALUES (NEW.id, 'impacto_orcamento', OLD.impacto_orcamento::TEXT, NEW.impacto_orcamento::TEXT, NEW.aprovado_por);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_log_changes
    AFTER UPDATE ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION log_decisao_changes();

-- Trigger para registar criação
CREATE OR REPLACE FUNCTION log_decisao_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO decisoes_historico (decisao_id, campo_alterado, valor_anterior, valor_novo, alterado_por, motivo)
    VALUES (NEW.id, 'estado', NULL, NEW.estado, NEW.created_by,
        CASE WHEN NEW.fonte = 'manual' THEN 'Criada manualmente' ELSE 'Detectada de ' || NEW.fonte END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decisoes_log_created
    AFTER INSERT ON decisoes
    FOR EACH ROW
    EXECUTE FUNCTION log_decisao_created();
