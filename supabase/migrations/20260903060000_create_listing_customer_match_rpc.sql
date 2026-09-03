-- Listing -> customer reverse lookup.
-- Scoring is NOT recalculated here.
-- Single scoring authority remains public.musteriye_uygun_ilanlar().

CREATE OR REPLACE FUNCTION public.ilana_uygun_musteriler(
  p_ilan_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  musteri_id uuid,
  ad_soyad text,
  telefon text,
  eslesme_puani integer,
  profil_guveni integer,
  eslesme_nedenleri text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    m.id AS musteri_id,
    m.ad_soyad,
    m.telefon,
    e.eslesme_puani,
    e.profil_guveni,
    e.eslesme_nedenleri
  FROM public.musteriler m
  CROSS JOIN LATERAL public.musteriye_uygun_ilanlar(m.id, 100) e
  WHERE
    m.ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
    AND m.tip IN ('alici', 'kiraci')
    AND m.durum IN ('yeni', 'aktif')
    AND e.ilan_id = p_ilan_id
  ORDER BY
    e.eslesme_puani DESC,
    e.profil_guveni DESC,
    m.id
  LIMIT GREATEST(
    1,
    LEAST(COALESCE(p_limit, 20), 100)
  );
$$;

REVOKE EXECUTE
ON FUNCTION public.ilana_uygun_musteriler(uuid, integer)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.ilana_uygun_musteriler(uuid, integer)
TO authenticated;
