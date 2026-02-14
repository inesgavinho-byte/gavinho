-- ============================================================
-- RESTRICT RLS POLICIES BY USER ROLE / TEAM -- PART 2 of 2
-- 2026-02-14
--
-- Part 2: Chat tables, obra-scoped tables, log migration
-- (Run AFTER part1 which creates helper functions)
-- ============================================================


-- ============================================================
-- 6. CHAT TABLES
--    Access follows project membership via: canal -> projeto
--    chat_canais has projeto_id
--    chat_topicos -> canal_id -> chat_canais.projeto_id
--    chat_mensagens -> topico_id -> chat_topicos -> chat_canais
-- ============================================================

-- -- 6a. chat_canais --
DROP POLICY IF EXISTS "chat_canais_all" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_select" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_insert" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_update" ON chat_canais;
DROP POLICY IF EXISTS "chat_canais_delete" ON chat_canais;

CREATE POLICY "chat_canais_select" ON chat_canais FOR SELECT
  USING (gavinho_can_access_project(projeto_id));

CREATE POLICY "chat_canais_insert" ON chat_canais FOR INSERT
  WITH CHECK (gavinho_can_access_project(projeto_id));

CREATE POLICY "chat_canais_update" ON chat_canais FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "chat_canais_delete" ON chat_canais FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- -- 6b. chat_topicos (via canal_id -> chat_canais) --
DROP POLICY IF EXISTS "chat_topicos_all" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_select" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_insert" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_update" ON chat_topicos;
DROP POLICY IF EXISTS "chat_topicos_delete" ON chat_topicos;

CREATE POLICY "chat_topicos_select" ON chat_topicos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_canais c
    WHERE c.id = chat_topicos.canal_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_topicos_insert" ON chat_topicos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_canais c
    WHERE c.id = chat_topicos.canal_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_topicos_update" ON chat_topicos FOR UPDATE
  USING (
    auth.uid() = criado_por  -- author can update own topic
    OR gavinho_is_gestor_or_above()
  );

CREATE POLICY "chat_topicos_delete" ON chat_topicos FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- -- 6c. chat_mensagens --
DROP POLICY IF EXISTS "chat_mensagens_all" ON chat_mensagens;
DROP POLICY IF EXISTS "allow_all_chat_mensagens" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_select" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_insert" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_update" ON chat_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_delete" ON chat_mensagens;

-- SELECT: project members can see messages in their project's channels
CREATE POLICY "chat_mensagens_select" ON chat_mensagens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_topicos t
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE t.id = chat_mensagens.topico_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- INSERT: project members can post messages
CREATE POLICY "chat_mensagens_insert" ON chat_mensagens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_topicos t
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE t.id = chat_mensagens.topico_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- UPDATE: only the author can edit their own messages
CREATE POLICY "chat_mensagens_update" ON chat_mensagens FOR UPDATE
  USING (
    auth.uid() = autor_id
    OR gavinho_is_gestor_or_above()
  );

-- DELETE: author or gestor+
CREATE POLICY "chat_mensagens_delete" ON chat_mensagens FOR DELETE
  USING (
    auth.uid() = autor_id
    OR gavinho_is_gestor_or_above()
  );


-- -- 6d. chat_reacoes --
DROP POLICY IF EXISTS "chat_reacoes_all" ON chat_reacoes;
DROP POLICY IF EXISTS "allow_all_chat_reacoes" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_select" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_insert" ON chat_reacoes;
DROP POLICY IF EXISTS "chat_reacoes_delete" ON chat_reacoes;

CREATE POLICY "chat_reacoes_select" ON chat_reacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_reacoes.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_reacoes_insert" ON chat_reacoes FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_reacoes_delete" ON chat_reacoes FOR DELETE
  USING (auth.uid() = utilizador_id);


-- -- 6e. chat_mencoes --
DROP POLICY IF EXISTS "chat_mencoes_all" ON chat_mencoes;
DROP POLICY IF EXISTS "allow_all_chat_mencoes" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_select" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_insert" ON chat_mencoes;
DROP POLICY IF EXISTS "chat_mencoes_update" ON chat_mencoes;

-- Users can see mentions directed at them
CREATE POLICY "chat_mencoes_select" ON chat_mencoes FOR SELECT
  USING (auth.uid() = utilizador_id OR gavinho_is_gestor_or_above());

CREATE POLICY "chat_mencoes_insert" ON chat_mencoes FOR INSERT
  WITH CHECK (true);  -- Triggered by message insert

CREATE POLICY "chat_mencoes_update" ON chat_mencoes FOR UPDATE
  USING (auth.uid() = utilizador_id);  -- Mark as read


-- -- 6f. chat_leituras --
DROP POLICY IF EXISTS "chat_leituras_all" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_select" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_insert" ON chat_leituras;
DROP POLICY IF EXISTS "chat_leituras_update" ON chat_leituras;

-- Users manage their own read receipts
CREATE POLICY "chat_leituras_select" ON chat_leituras FOR SELECT
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_leituras_insert" ON chat_leituras FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_leituras_update" ON chat_leituras FOR UPDATE
  USING (auth.uid() = utilizador_id);


-- -- 6g. chat_notificacoes --
DROP POLICY IF EXISTS "chat_notificacoes_all" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_select" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_insert" ON chat_notificacoes;
DROP POLICY IF EXISTS "chat_notificacoes_update" ON chat_notificacoes;

-- Users see their own notifications
CREATE POLICY "chat_notificacoes_select" ON chat_notificacoes FOR SELECT
  USING (auth.uid() = utilizador_id);

-- System/triggers insert notifications (need service_role or SECURITY DEFINER trigger)
CREATE POLICY "chat_notificacoes_insert" ON chat_notificacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "chat_notificacoes_update" ON chat_notificacoes FOR UPDATE
  USING (auth.uid() = utilizador_id);  -- Mark as read


-- -- 6h. chat_subscricoes --
DROP POLICY IF EXISTS "chat_subscricoes_all" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_select" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_insert" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_update" ON chat_subscricoes;
DROP POLICY IF EXISTS "chat_subscricoes_delete" ON chat_subscricoes;

-- Users manage their own subscription preferences
CREATE POLICY "chat_subscricoes_select" ON chat_subscricoes FOR SELECT
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_insert" ON chat_subscricoes FOR INSERT
  WITH CHECK (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_update" ON chat_subscricoes FOR UPDATE
  USING (auth.uid() = utilizador_id);

CREATE POLICY "chat_subscricoes_delete" ON chat_subscricoes FOR DELETE
  USING (auth.uid() = utilizador_id);


-- -- 6i. chat_mensagens_historico --
DROP POLICY IF EXISTS "chat_mensagens_historico_all" ON chat_mensagens_historico;
DROP POLICY IF EXISTS "chat_mensagens_historico_select" ON chat_mensagens_historico;
DROP POLICY IF EXISTS "chat_mensagens_historico_insert" ON chat_mensagens_historico;

CREATE POLICY "chat_mensagens_historico_select" ON chat_mensagens_historico FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_mensagens_historico.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

-- Insert is done by trigger (SECURITY DEFINER)
CREATE POLICY "chat_mensagens_historico_insert" ON chat_mensagens_historico FOR INSERT
  WITH CHECK (true);


-- -- 6j. chat_anexos --
DROP POLICY IF EXISTS "chat_anexos_all" ON chat_anexos;
DROP POLICY IF EXISTS "allow_all_chat_anexos" ON chat_anexos;
DROP POLICY IF EXISTS "chat_anexos_select" ON chat_anexos;
DROP POLICY IF EXISTS "chat_anexos_insert" ON chat_anexos;

CREATE POLICY "chat_anexos_select" ON chat_anexos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_anexos.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));

CREATE POLICY "chat_anexos_insert" ON chat_anexos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_mensagens m
    JOIN chat_topicos t ON t.id = m.topico_id
    JOIN chat_canais c ON c.id = t.canal_id
    WHERE m.id = chat_anexos.mensagem_id
      AND gavinho_can_access_project(c.projeto_id)
  ));


-- -- 6k. chat_presenca -- keep permissive (presence is not sensitive) --
-- Presence and typing are ephemeral and not sensitive
-- Keeping USING(true) for performance on realtime subscriptions
DROP POLICY IF EXISTS "chat_presenca_all" ON chat_presenca;
DROP POLICY IF EXISTS "chat_presenca_select" ON chat_presenca;
DROP POLICY IF EXISTS "chat_presenca_upsert" ON chat_presenca;

CREATE POLICY "chat_presenca_select" ON chat_presenca FOR SELECT
  USING (true);  -- All authenticated can see who's online

CREATE POLICY "chat_presenca_upsert" ON chat_presenca FOR ALL
  USING (auth.uid() = utilizador_id)
  WITH CHECK (auth.uid() = utilizador_id);


-- -- 6l. chat_typing -- keep permissive (ephemeral) --
DROP POLICY IF EXISTS "chat_typing_all" ON chat_typing;
DROP POLICY IF EXISTS "chat_typing_select" ON chat_typing;
DROP POLICY IF EXISTS "chat_typing_upsert" ON chat_typing;

CREATE POLICY "chat_typing_select" ON chat_typing FOR SELECT
  USING (true);

CREATE POLICY "chat_typing_upsert" ON chat_typing FOR ALL
  USING (auth.uid() = utilizador_id)
  WITH CHECK (auth.uid() = utilizador_id);


-- ============================================================
-- 7. OBRA-SCOPED TABLES (most critical ones)
--    Access via: obra_id -> obras.projeto_id -> projeto_equipa
-- ============================================================

-- -- 7a. obra_diario --
DROP POLICY IF EXISTS "Allow all select on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all insert on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all update on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "Allow all delete on obra_diario" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_select" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_insert" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_update" ON obra_diario;
DROP POLICY IF EXISTS "obra_diario_delete" ON obra_diario;

CREATE POLICY "obra_diario_select" ON obra_diario FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_insert" ON obra_diario FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_update" ON obra_diario FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_diario_delete" ON obra_diario FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- -- 7b. obra_autos --
DROP POLICY IF EXISTS "Allow all select on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all insert on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all update on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "Allow all delete on obra_autos" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_select" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_insert" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_update" ON obra_autos;
DROP POLICY IF EXISTS "obra_autos_delete" ON obra_autos;

CREATE POLICY "obra_autos_select" ON obra_autos FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_autos_insert" ON obra_autos FOR INSERT
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "obra_autos_update" ON obra_autos FOR UPDATE
  USING (gavinho_is_gestor_or_above())
  WITH CHECK (gavinho_is_gestor_or_above());

CREATE POLICY "obra_autos_delete" ON obra_autos FOR DELETE
  USING (gavinho_is_admin());


-- -- 7c. obra_items --
DROP POLICY IF EXISTS "Allow all select on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all insert on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all update on obra_items" ON obra_items;
DROP POLICY IF EXISTS "Allow all delete on obra_items" ON obra_items;
DROP POLICY IF EXISTS "obra_items_select" ON obra_items;
DROP POLICY IF EXISTS "obra_items_insert" ON obra_items;
DROP POLICY IF EXISTS "obra_items_update" ON obra_items;
DROP POLICY IF EXISTS "obra_items_delete" ON obra_items;

CREATE POLICY "obra_items_select" ON obra_items FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_insert" ON obra_items FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_update" ON obra_items FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_items_delete" ON obra_items FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- -- 7d. obra_mensagens --
DROP POLICY IF EXISTS "Allow all select on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all insert on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all update on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "Allow all delete on obra_mensagens" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_select" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_insert" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_update" ON obra_mensagens;
DROP POLICY IF EXISTS "obra_mensagens_delete" ON obra_mensagens;

CREATE POLICY "obra_mensagens_select" ON obra_mensagens FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_insert" ON obra_mensagens FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_update" ON obra_mensagens FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_mensagens_delete" ON obra_mensagens FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- -- 7e. obra_especialidades --
DROP POLICY IF EXISTS "Allow all select on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all insert on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all update on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "Allow all delete on obra_especialidades" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_select" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_insert" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_update" ON obra_especialidades;
DROP POLICY IF EXISTS "obra_especialidades_delete" ON obra_especialidades;

CREATE POLICY "obra_especialidades_select" ON obra_especialidades FOR SELECT
  USING (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_insert" ON obra_especialidades FOR INSERT
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_update" ON obra_especialidades FOR UPDATE
  USING (gavinho_can_access_obra(obra_id))
  WITH CHECK (gavinho_can_access_obra(obra_id));

CREATE POLICY "obra_especialidades_delete" ON obra_especialidades FOR DELETE
  USING (gavinho_is_gestor_or_above());


-- ============================================================
-- 8. LOG MIGRATION
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seeds_executados') THEN
    INSERT INTO seeds_executados (seed_key, nome, executado_em)
    VALUES ('20250214_restrict_rls_policies', '20250214_restrict_rls_policies', NOW())
    ON CONFLICT (seed_key) DO UPDATE SET executado_em = NOW();
  END IF;
END $$;
