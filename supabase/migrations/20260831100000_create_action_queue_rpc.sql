CREATE OR REPLACE FUNCTION public.aksiyon_bekleyenler(
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  aksiyon_id text,
  aksiyon_tipi text,
  musteri_id uuid,
  randevu_id uuid,
  ad_soyad text,
  telefon text,
  baslik text,
  neden text,
  aksiyon_tarihi date,
  aksiyon_saati text,
  puan integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH musteri_aksiyonlari AS (
    SELECT
      'takip:' || q.musteri_id::text AS aksiyon_id,
      'takip'::text AS aksiyon_tipi,
      q.musteri_id,
      NULL::uuid AS randevu_id,
      m.ad_soyad,
      m.telefon,
      COALESCE(NULLIF(q.sonraki_aksiyon, ''), 'Müşteriyi takip et') AS baslik,
      q.neden,
      q.sonraki_aksiyon_tarihi AS aksiyon_tarihi,
      NULL::text AS aksiyon_saati,
      q.puan
    FROM public.bugun_aranacak_musteriler(100) q
    JOIN public.musteriler m
      ON m.id = q.musteri_id
     AND m.ofis_id = q.ofis_id
  ),

  randevu_aksiyonlari AS (
    SELECT
      'randevu:' || r.id::text AS aksiyon_id,
      CASE
        WHEN r.tarih < CURRENT_DATE
          THEN 'randevu_sonucu'
        ELSE 'randevu'
      END::text AS aksiyon_tipi,
      r.musteri_id,
      r.id AS randevu_id,
      COALESCE(m.ad_soyad, 'Müşteri belirtilmemiş') AS ad_soyad,
      COALESCE(m.telefon, '') AS telefon,
      CASE
        WHEN r.tarih < CURRENT_DATE
          THEN 'Randevu sonucunu gir'
        ELSE 'Yaklaşan randevu'
      END::text AS baslik,
      CASE
        WHEN r.tarih < CURRENT_DATE
          THEN 'Geçmiş randevunun sonucu girilmedi'
        WHEN r.tarih = CURRENT_DATE
          THEN 'Bugünkü randevu'
        ELSE 'Yarınki randevu'
      END::text AS neden,
      r.tarih AS aksiyon_tarihi,
      r.saat AS aksiyon_saati,
      CASE
        WHEN r.tarih < CURRENT_DATE THEN 110
        WHEN r.tarih = CURRENT_DATE THEN 105
        ELSE 80
      END::integer AS puan
    FROM public.randevular r
    LEFT JOIN public.musteriler m
      ON m.id = r.musteri_id
     AND m.ofis_id = r.ofis_id
    WHERE
      r.ofis_id IN (
        SELECT public.kullanici_ofisleri()
      )
      AND r.durum = 'planlandi'
      AND r.tarih <= CURRENT_DATE + 1
  ),

  tum_aksiyonlar AS (
    SELECT * FROM musteri_aksiyonlari
    UNION ALL
    SELECT * FROM randevu_aksiyonlari
  )

  SELECT
    aksiyon_id,
    aksiyon_tipi,
    musteri_id,
    randevu_id,
    ad_soyad,
    telefon,
    baslik,
    neden,
    aksiyon_tarihi,
    aksiyon_saati,
    puan
  FROM tum_aksiyonlar
  ORDER BY
    puan DESC,
    aksiyon_tarihi NULLS LAST,
    aksiyon_saati NULLS LAST,
    aksiyon_id
  LIMIT GREATEST(
    1,
    LEAST(COALESCE(p_limit, 30), 100)
  );
$$;

REVOKE EXECUTE
ON FUNCTION public.aksiyon_bekleyenler(integer)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.aksiyon_bekleyenler(integer)
TO authenticated;
