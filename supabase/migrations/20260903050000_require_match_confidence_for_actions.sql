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
  puan integer,
  ilan_id uuid
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
      q.puan,
      NULL::uuid AS ilan_id
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
      END::integer AS puan,
      NULL::uuid AS ilan_id
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

  guclu_eslesmeler_aday AS (
    SELECT
      m.id AS musteri_id,
      m.ad_soyad,
      m.telefon,
      e.ilan_id,
      e.baslik,
      e.eslesme_puani,
      e.eslesme_nedenleri,
      ROW_NUMBER() OVER (
        PARTITION BY m.id
        ORDER BY e.eslesme_puani DESC, e.ilan_id
      ) AS sira
    FROM public.musteriler m
    CROSS JOIN LATERAL public.musteriye_uygun_ilanlar(m.id, 100) e
    WHERE
      m.ofis_id IN (
        SELECT public.kullanici_ofisleri()
      )
      AND m.tip IN ('alici', 'kiraci')
      AND m.durum IN ('yeni', 'aktif')
      AND m.ilan_tercihi IN ('satilik', 'kiralik')
      AND e.eslesme_puani >= 80
      AND e.profil_guveni >= 50
      AND NOT EXISTS (
        SELECT 1
        FROM public.musteri_ilan_etkilesimleri x
        WHERE x.musteri_id = m.id
          AND x.ilan_id = e.ilan_id
          AND x.aksiyon IN ('gosterildi', 'teklif_edildi')
      )
  ),

  guclu_eslesmeler AS (
    SELECT
      'eslesme:' || a.musteri_id::text || ':' || a.ilan_id::text AS aksiyon_id,
      'eslesme'::text AS aksiyon_tipi,
      a.musteri_id,
      NULL::uuid AS randevu_id,
      a.ad_soyad,
      a.telefon,
      a.baslik,
      'Güçlü eşleşme (' || a.eslesme_puani || ' puan): ' ||
        COALESCE(NULLIF(array_to_string(a.eslesme_nedenleri, ', '), ''), 'Kriterler uyuşuyor') AS neden,
      CURRENT_DATE AS aksiyon_tarihi,
      NULL::text AS aksiyon_saati,
      a.eslesme_puani AS puan,
      a.ilan_id
    FROM guclu_eslesmeler_aday a
    WHERE a.sira = 1
  ),

  tum_aksiyonlar AS (
    SELECT * FROM musteri_aksiyonlari
    UNION ALL
    SELECT * FROM randevu_aksiyonlari
    UNION ALL
    SELECT * FROM guclu_eslesmeler
  ),

  aciliyetli_aksiyonlar AS (
    SELECT
      *,
      CASE
        WHEN aksiyon_tipi = 'randevu_sonucu' THEN 1
        WHEN aksiyon_tipi = 'takip' AND aksiyon_tarihi < CURRENT_DATE THEN 2
        WHEN aksiyon_tipi = 'randevu' AND aksiyon_tarihi = CURRENT_DATE THEN 3
        WHEN aksiyon_tipi = 'takip' AND (aksiyon_tarihi = CURRENT_DATE OR aksiyon_tarihi IS NULL) THEN 4
        WHEN aksiyon_tipi = 'randevu' AND aksiyon_tarihi = CURRENT_DATE + 1 THEN 5
        WHEN aksiyon_tipi = 'eslesme' THEN 6
        ELSE 7
      END AS aciliyet_sirasi
    FROM tum_aksiyonlar
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
    puan,
    ilan_id
  FROM aciliyetli_aksiyonlar
  ORDER BY
    aciliyet_sirasi ASC,
    CASE
      WHEN aciliyet_sirasi IN (1, 2) THEN aksiyon_tarihi
    END ASC NULLS LAST,
    CASE
      WHEN aciliyet_sirasi = 3 THEN NULLIF(aksiyon_saati, '')
    END ASC NULLS LAST,
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
