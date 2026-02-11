-- =====================================================
-- MIGRATION: Presenças (Attendance) with GPS Location Tracking
-- Creates: presencas, trabalhador_obras tables
-- Alters: trabalhadores (add telefone, pin, cargo)
-- Alters: obras (add latitude, longitude for geofencing)
-- =====================================================

-- 1. Add missing columns to trabalhadores
ALTER TABLE trabalhadores ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE trabalhadores ADD COLUMN IF NOT EXISTS pin VARCHAR(6);
ALTER TABLE trabalhadores ADD COLUMN IF NOT EXISTS cargo TEXT;

CREATE INDEX IF NOT EXISTS idx_trabalhadores_pin ON trabalhadores(pin);
CREATE INDEX IF NOT EXISTS idx_trabalhadores_telefone ON trabalhadores(telefone);

-- 2. Add GPS coordinates to obras for geofencing
ALTER TABLE obras ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS raio_geofence INTEGER DEFAULT 200; -- meters

COMMENT ON COLUMN obras.latitude IS 'GPS latitude da obra para validação de presenças';
COMMENT ON COLUMN obras.longitude IS 'GPS longitude da obra para validação de presenças';
COMMENT ON COLUMN obras.raio_geofence IS 'Raio em metros para validação de check-in (default 200m)';

-- 3. Junction table: trabalhadores <-> obras
CREATE TABLE IF NOT EXISTS trabalhador_obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalhador_id UUID NOT NULL REFERENCES trabalhadores(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trabalhador_id, obra_id)
);

CREATE INDEX IF NOT EXISTS idx_trabalhador_obras_trab ON trabalhador_obras(trabalhador_id);
CREATE INDEX IF NOT EXISTS idx_trabalhador_obras_obra ON trabalhador_obras(obra_id);

ALTER TABLE trabalhador_obras ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trabalhador_obras' AND policyname = 'trabalhador_obras_all') THEN
    CREATE POLICY "trabalhador_obras_all" ON trabalhador_obras FOR ALL USING (true);
  END IF;
END $$;

-- 4. Presenças table with GPS location tracking
CREATE TABLE IF NOT EXISTS presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalhador_id UUID NOT NULL REFERENCES trabalhadores(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Check-in
  hora_entrada TIMESTAMPTZ,
  latitude_entrada DOUBLE PRECISION,
  longitude_entrada DOUBLE PRECISION,
  precisao_entrada DOUBLE PRECISION, -- GPS accuracy in meters
  distancia_entrada DOUBLE PRECISION, -- distance from obra in meters
  dentro_geofence_entrada BOOLEAN DEFAULT FALSE,

  -- Check-out
  hora_saida TIMESTAMPTZ,
  latitude_saida DOUBLE PRECISION,
  longitude_saida DOUBLE PRECISION,
  precisao_saida DOUBLE PRECISION,
  distancia_saida DOUBLE PRECISION,
  dentro_geofence_saida BOOLEAN DEFAULT FALSE,

  -- Metadata
  notas TEXT,
  metodo TEXT DEFAULT 'manual', -- manual, pin, gps_auto
  dispositivo TEXT, -- user agent / device info
  ip_address TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presencas_trabalhador ON presencas(trabalhador_id);
CREATE INDEX IF NOT EXISTS idx_presencas_obra ON presencas(obra_id);
CREATE INDEX IF NOT EXISTS idx_presencas_data ON presencas(data DESC);
CREATE INDEX IF NOT EXISTS idx_presencas_trab_data ON presencas(trabalhador_id, data);
CREATE INDEX IF NOT EXISTS idx_presencas_obra_data ON presencas(obra_id, data);

ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'presencas' AND policyname = 'presencas_all') THEN
    CREATE POLICY "presencas_all" ON presencas FOR ALL USING (true);
  END IF;
END $$;

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_presencas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presencas_updated ON presencas;
CREATE TRIGGER trigger_presencas_updated
  BEFORE UPDATE ON presencas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_presencas_updated_at();

-- 6. Function to calculate distance between two GPS points (Haversine formula)
CREATE OR REPLACE FUNCTION calcular_distancia_gps(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371000; -- Earth radius in meters
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Auto-calculate distance and geofence on insert/update
CREATE OR REPLACE FUNCTION trigger_presencas_geofence()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_lat DOUBLE PRECISION;
  v_obra_lon DOUBLE PRECISION;
  v_raio INTEGER;
BEGIN
  SELECT latitude, longitude, COALESCE(raio_geofence, 200)
  INTO v_obra_lat, v_obra_lon, v_raio
  FROM obras WHERE id = NEW.obra_id;

  -- Calculate check-in distance
  IF NEW.latitude_entrada IS NOT NULL AND v_obra_lat IS NOT NULL THEN
    NEW.distancia_entrada := calcular_distancia_gps(
      NEW.latitude_entrada, NEW.longitude_entrada, v_obra_lat, v_obra_lon
    );
    NEW.dentro_geofence_entrada := (NEW.distancia_entrada <= v_raio);
  END IF;

  -- Calculate check-out distance
  IF NEW.latitude_saida IS NOT NULL AND v_obra_lat IS NOT NULL THEN
    NEW.distancia_saida := calcular_distancia_gps(
      NEW.latitude_saida, NEW.longitude_saida, v_obra_lat, v_obra_lon
    );
    NEW.dentro_geofence_saida := (NEW.distancia_saida <= v_raio);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presencas_geofence ON presencas;
CREATE TRIGGER trigger_presencas_geofence
  BEFORE INSERT OR UPDATE ON presencas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_presencas_geofence();

-- 8. Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE presencas;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9. Comments
COMMENT ON TABLE presencas IS 'Registo de presenças/attendance com tracking GPS para validação de localização';
COMMENT ON TABLE trabalhador_obras IS 'Associação de trabalhadores a obras';
COMMENT ON FUNCTION calcular_distancia_gps IS 'Calcula distância em metros entre dois pontos GPS (Haversine)';
