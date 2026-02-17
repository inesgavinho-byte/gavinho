-- =====================================================
-- MIGRAÇÃO: obra_diario — Novos campos para design v2
-- Suporta: atividades por especialidade, horários, autor
-- Data: 2026-02-17
-- Seguro: usa ADD COLUMN IF NOT EXISTS
-- =====================================================

-- 1. Atividades estruturadas por especialidade (substitui tarefas simples)
-- Cada atividade: { especialidade_id, especialidade_nome, zona, descricao, fotos, alerta }
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS atividades JSONB DEFAULT '[]'::jsonb;

-- 2. Horário de trabalho
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS hora_inicio TIME;
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS hora_fim TIME;

-- 3. Autor do registo (FK para auth.users ou nome)
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS registado_por_nome TEXT;
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS registado_por_id UUID;

-- 4. Pendentes / bloqueios associados ao dia
-- Cada pendente: { tipo: 'bloqueio'|'nc'|'decisao', descricao, data_registo, estado }
ALTER TABLE obra_diario ADD COLUMN IF NOT EXISTS pendentes JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- Index para queries de timeline (listagem por obra, ordenada por data)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_obra_diario_obra_data_desc
  ON obra_diario (obra_id, data DESC);
