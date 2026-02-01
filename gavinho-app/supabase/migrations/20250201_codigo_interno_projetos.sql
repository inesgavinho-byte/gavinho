-- Migration: Add internal platform code for projects
-- This code is auto-generated and used for AI/platform identification
-- Separate from the external GAVINHO code (GA00413, etc.)

-- Add codigo_interno column
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS codigo_interno TEXT;

-- Create sequence for auto-generation
CREATE SEQUENCE IF NOT EXISTS projetos_codigo_interno_seq START WITH 1;

-- Function to generate internal code (PRJ-001, PRJ-002, etc.)
CREATE OR REPLACE FUNCTION generate_codigo_interno()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_interno IS NULL THEN
    NEW.codigo_interno := 'PRJ-' || LPAD(nextval('projetos_codigo_interno_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate on insert
DROP TRIGGER IF EXISTS trigger_codigo_interno ON projetos;
CREATE TRIGGER trigger_codigo_interno
  BEFORE INSERT ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION generate_codigo_interno();

-- Update existing projects that don't have codigo_interno
DO $$
DECLARE
  r RECORD;
  counter INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM projetos WHERE codigo_interno IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE projetos
    SET codigo_interno = 'PRJ-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
    counter := counter + 1;
  END LOOP;

  -- Update sequence to start after existing projects
  IF counter > 1 THEN
    PERFORM setval('projetos_codigo_interno_seq', counter);
  END IF;
END $$;

-- Add unique constraint
ALTER TABLE projetos DROP CONSTRAINT IF EXISTS projetos_codigo_interno_unique;
ALTER TABLE projetos ADD CONSTRAINT projetos_codigo_interno_unique UNIQUE (codigo_interno);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projetos_codigo_interno ON projetos(codigo_interno);

COMMENT ON COLUMN projetos.codigo_interno IS 'Internal platform code (auto-generated, e.g., PRJ-0001). Used for AI identification and internal references.';
