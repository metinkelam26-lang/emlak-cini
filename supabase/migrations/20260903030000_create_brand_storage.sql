
INSERT INTO storage.buckets (id, name, public)
VALUES ('marka-dosyalari', 'marka-dosyalari', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "brand_upload_own_files" ON storage.objects;
CREATE POLICY "brand_upload_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marka-dosyalari'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "brand_update_own_files" ON storage.objects;
CREATE POLICY "brand_update_own_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marka-dosyalari'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'marka-dosyalari'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "brand_delete_own_files" ON storage.objects;
CREATE POLICY "brand_delete_own_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'marka-dosyalari'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "brand_read_files" ON storage.objects;
CREATE POLICY "brand_read_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'marka-dosyalari');
