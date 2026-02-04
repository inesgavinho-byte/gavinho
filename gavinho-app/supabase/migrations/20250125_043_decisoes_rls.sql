-- Activar RLS
ALTER TABLE decisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisoes_anexos ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_has_project_access(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM projeto_equipa
        WHERE projeto_id = p_projeto_id AND utilizador_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para decisoes
CREATE POLICY "decisoes_select_policy" ON decisoes
    FOR SELECT USING (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_insert_policy" ON decisoes
    FOR INSERT WITH CHECK (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_update_policy" ON decisoes
    FOR UPDATE USING (user_has_project_access(projeto_id))
    WITH CHECK (user_has_project_access(projeto_id));

CREATE POLICY "decisoes_delete_policy" ON decisoes
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM utilizadores WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para histórico
CREATE POLICY "decisoes_historico_select_policy" ON decisoes_historico
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

CREATE POLICY "decisoes_historico_insert_policy" ON decisoes_historico
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

-- Políticas para anexos
CREATE POLICY "decisoes_anexos_select_policy" ON decisoes_anexos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

CREATE POLICY "decisoes_anexos_insert_policy" ON decisoes_anexos
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM decisoes d WHERE d.id = decisao_id AND user_has_project_access(d.projeto_id))
    );

-- Grants
GRANT SELECT, INSERT, UPDATE ON decisoes TO anon, authenticated;
GRANT SELECT, INSERT ON decisoes_historico TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON decisoes_anexos TO anon, authenticated;
