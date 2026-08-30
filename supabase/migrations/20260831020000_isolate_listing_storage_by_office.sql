-- Ilan fotograflari Storage write islemlerini ofis bazinda izole et.
--
-- Yeni object path formati:
--   <ofis_uuid>/ilanlar/<filename>
--
-- Public bucket/read davranisi korunur.
-- Legacy "ilanlar/<filename>" nesneleri bu policy ile update/delete edilemez.

DROP POLICY IF EXISTS "authenticated_upload_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_ilan_fotograflari" ON storage.objects;

-- Eski migrationlardan kalmis olabilecek write policy'lerini de kapat.
DROP POLICY IF EXISTS "anon_upload_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "anon_update_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_ilan_fotograflari" ON storage.objects;

CREATE POLICY "ofis_upload_ilan_fotograflari"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ilan-fotograflari'
  AND split_part(name, '/', 2) = 'ilanlar'
  AND split_part(name, '/', 3) <> ''
  AND EXISTS (
    SELECT 1
    FROM public.kullanici_ofisleri() AS kullanici_ofisi(ofis_id)
    WHERE kullanici_ofisi.ofis_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "ofis_update_ilan_fotograflari"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ilan-fotograflari'
  AND split_part(name, '/', 2) = 'ilanlar'
  AND split_part(name, '/', 3) <> ''
  AND EXISTS (
    SELECT 1
    FROM public.kullanici_ofisleri() AS kullanici_ofisi(ofis_id)
    WHERE kullanici_ofisi.ofis_id::text = split_part(name, '/', 1)
  )
)
WITH CHECK (
  bucket_id = 'ilan-fotograflari'
  AND split_part(name, '/', 2) = 'ilanlar'
  AND split_part(name, '/', 3) <> ''
  AND EXISTS (
    SELECT 1
    FROM public.kullanici_ofisleri() AS kullanici_ofisi(ofis_id)
    WHERE kullanici_ofisi.ofis_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "ofis_delete_ilan_fotograflari"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ilan-fotograflari'
  AND split_part(name, '/', 2) = 'ilanlar'
  AND split_part(name, '/', 3) <> ''
  AND EXISTS (
    SELECT 1
    FROM public.kullanici_ofisleri() AS kullanici_ofisi(ofis_id)
    WHERE kullanici_ofisi.ofis_id::text = split_part(name, '/', 1)
  )
);

