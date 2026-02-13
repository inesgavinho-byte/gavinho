-- Migration: Ensure projeto_renders has all columns needed by the frontend
-- The original table may have been created with a flat schema (versao, imagem_url, is_final)
-- but the migration 20250201_projeto_renders_tables.sql creates a normalized schema.
-- This migration adds the missing flat columns if they don't exist.

ALTER TABLE projeto_renders ADD COLUMN IF NOT EXISTS versao INTEGER DEFAULT 1;
ALTER TABLE projeto_renders ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE projeto_renders ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
ALTER TABLE projeto_renders ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE projeto_renders ADD COLUMN IF NOT EXISTS data_upload DATE;

-- Log migration
INSERT INTO seeds_executados (nome, executed_at)
VALUES ('20250213_fix_projeto_renders_columns', NOW())
ON CONFLICT (nome) DO UPDATE SET executed_at = NOW();
