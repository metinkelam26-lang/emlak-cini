/*
# İlan Fotoğrafları İçin Storage Bucket Oluştur

## Değişiklikler
- "ilan-fotograflari" adında public bir storage bucket oluşturur.
- Bu bucket'a anon + authenticated rolleri için dosya yükleme/okuma/silme izinleri verir.
- Tek kullanıcılı uygulama olduğu için tüm dosyalara erişim serbesttir.

## Güvenlik
- Bucket public olarak işaretlenir (public read).
- Upload, update, delete için anon + authenticated rollerine izin verilir.
- Dosyalar "ilan-fotograflari" bucket'ında saklanır.

## Önemli Notlar
1. İleride çok kullanıcılı sisteme geçişte, storage politikaları user_id bazlı
   sahiplik kontrolü yapacak şekilde güncellenebilir.
2. Dosya yolları "ilan-<uuid>/<filename>" formatında olacaktır.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('ilan-fotograflari', 'ilan-fotograflari', true)
ON CONFLICT (id) DO NOTHING;

-- Storage politikaları
DROP POLICY IF EXISTS "anon_upload_ilan_fotograflari" ON storage.objects;
CREATE POLICY "anon_upload_ilan_fotograflari"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'ilan-fotograflari');

DROP POLICY IF EXISTS "anon_read_ilan_fotograflari" ON storage.objects;
CREATE POLICY "anon_read_ilan_fotograflari"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ilan-fotograflari');

DROP POLICY IF EXISTS "anon_update_ilan_fotograflari" ON storage.objects;
CREATE POLICY "anon_update_ilan_fotograflari"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'ilan-fotograflari')
WITH CHECK (bucket_id = 'ilan-fotograflari');

DROP POLICY IF EXISTS "anon_delete_ilan_fotograflari" ON storage.objects;
CREATE POLICY "anon_delete_ilan_fotograflari"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'ilan-fotograflari');
