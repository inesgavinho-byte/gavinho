-- =====================================================
-- Storage bucket for deal room quote files (PDF, docs)
-- =====================================================

-- Create the 'orcamentos' bucket (public for download links)
INSERT INTO storage.buckets (id, name, public)
VALUES ('orcamentos', 'orcamentos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "orcamentos_upload" ON storage.objects;
CREATE POLICY "orcamentos_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'orcamentos');

-- Allow public read access (download links)
DROP POLICY IF EXISTS "orcamentos_read" ON storage.objects;
CREATE POLICY "orcamentos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'orcamentos');

-- Allow delete by authenticated users
DROP POLICY IF EXISTS "orcamentos_delete" ON storage.objects;
CREATE POLICY "orcamentos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'orcamentos');
