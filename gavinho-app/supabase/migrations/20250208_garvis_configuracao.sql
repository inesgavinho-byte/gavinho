-- =====================================================
-- G.A.R.V.I.S. Global Configuration (key-value)
-- Stores API keys, global settings, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS garvis_configuracao (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE garvis_configuracao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garvis_config_all" ON garvis_configuracao;
CREATE POLICY "garvis_config_all" ON garvis_configuracao FOR ALL USING (true);
