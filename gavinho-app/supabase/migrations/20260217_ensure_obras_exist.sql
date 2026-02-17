-- =====================================================
-- Garantir que as 4 obras principais existem
-- Data: 2026-02-17
-- Usar INSERT ON CONFLICT para ser idempotente
-- =====================================================

-- Verificar se a coluna 'codigo' existe na tabela obras
-- (assumimos que sim, baseado no código existente)

-- GB00402 — Maria Residences
INSERT INTO obras (id, codigo, nome, status)
VALUES (
  gen_random_uuid(),
  'GB00402',
  'Maria Residences',
  'em_curso'
)
ON CONFLICT (codigo) DO NOTHING;

-- GB00462 — Restelo Villa
INSERT INTO obras (id, codigo, nome, status)
VALUES (
  gen_random_uuid(),
  'GB00462',
  'Restelo Villa',
  'em_curso'
)
ON CONFLICT (codigo) DO NOTHING;

-- GB00464 — Miraflores IG
INSERT INTO obras (id, codigo, nome, status)
VALUES (
  gen_random_uuid(),
  'GB00464',
  'Miraflores IG',
  'em_curso'
)
ON CONFLICT (codigo) DO NOTHING;

-- GB00466 — Saldanha
INSERT INTO obras (id, codigo, nome, status)
VALUES (
  gen_random_uuid(),
  'GB00466',
  'Saldanha',
  'em_curso'
)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- NOTA: Se 'codigo' não tiver UNIQUE constraint,
-- descomenta e corre primeiro:
-- =====================================================
-- ALTER TABLE obras ADD CONSTRAINT obras_codigo_unique UNIQUE (codigo);
--
-- Se preferires usar INSERT simples (sem ON CONFLICT),
-- verifica primeiro:
-- SELECT codigo, nome FROM obras WHERE codigo IN ('GB00402', 'GB00462', 'GB00464', 'GB00466');

-- =====================================================
-- Storage bucket obra-fotos (se não existir)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('obra-fotos', 'obra-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para permitir uploads autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'obra-fotos-insert'
  ) THEN
    CREATE POLICY "obra-fotos-insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'obra-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'obra-fotos-select'
  ) THEN
    CREATE POLICY "obra-fotos-select" ON storage.objects
      FOR SELECT USING (bucket_id = 'obra-fotos');
  END IF;
END $$;
