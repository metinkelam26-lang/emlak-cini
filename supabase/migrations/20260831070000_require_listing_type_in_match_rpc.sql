-- P1 Eslesme Motoru
-- AI kullanmadan musteri tercihleri ile portfoyleri puanlar.
-- Girilmemis tercih kriterleri puan kazandirmaz veya kaybettirmez.

CREATE OR REPLACE FUNCTION public.musteriye_uygun_ilanlar(
  p_musteri_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  ilan_id uuid,
  baslik text,
  tur text,
  fiyat numeric,
  il text,
  ilce text,
  mahalle text,
  oda_sayisi text,
  metrekare numeric,
  eslesme_puani integer,
  eslesme_nedenleri text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH musteri AS (
    SELECT m.*
    FROM public.musteriler m
    WHERE m.id = p_musteri_id
      AND m.ofis_id IN (
        SELECT public.kullanici_ofisleri()
      )
  ),
  puanli AS (
    SELECT
      i.id AS ilan_id,
      i.baslik,
      i.tur,
      i.fiyat,
      i.il,
      i.ilce,
      i.mahalle,
      i.oda_sayisi,
      i.metrekare,

      (
        CASE
          WHEN m.ilan_tercihi IS NOT NULL
            AND btrim(m.ilan_tercihi) <> ''
            AND lower(btrim(i.tur)) = lower(btrim(m.ilan_tercihi))
          THEN 25
          ELSE 0
        END
        +
        CASE
          WHEN
            (
              COALESCE(m.butce_min, 0) > 0
              OR COALESCE(m.butce_max, 0) > 0
            )
            AND (COALESCE(m.butce_min, 0) <= 0 OR i.fiyat >= m.butce_min)
            AND (COALESCE(m.butce_max, 0) <= 0 OR i.fiyat <= m.butce_max)
          THEN 30
          ELSE 0
        END
        +
        CASE
          WHEN m.istenen_ilce IS NOT NULL
            AND btrim(m.istenen_ilce) <> ''
            AND lower(btrim(i.ilce)) = lower(btrim(m.istenen_ilce))
          THEN 15
          ELSE 0
        END
        +
        CASE
          WHEN m.istenen_mahalle IS NOT NULL
            AND btrim(m.istenen_mahalle) <> ''
            AND lower(btrim(i.mahalle)) = lower(btrim(m.istenen_mahalle))
          THEN 10
          ELSE 0
        END
        +
        CASE
          WHEN m.istenen_oda_sayisi IS NOT NULL
            AND btrim(m.istenen_oda_sayisi) <> ''
            AND lower(btrim(i.oda_sayisi)) = lower(btrim(m.istenen_oda_sayisi))
          THEN 10
          ELSE 0
        END
        +
        CASE
          WHEN
            (
              COALESCE(m.min_metrekare, 0) > 0
              OR COALESCE(m.max_metrekare, 0) > 0
            )
            AND (COALESCE(m.min_metrekare, 0) <= 0 OR i.metrekare >= m.min_metrekare)
            AND (COALESCE(m.max_metrekare, 0) <= 0 OR i.metrekare <= m.max_metrekare)
          THEN 10
          ELSE 0
        END
      )::integer AS eslesme_puani,

      array_remove(ARRAY[
        CASE
          WHEN m.ilan_tercihi IS NOT NULL
            AND btrim(m.ilan_tercihi) <> ''
            AND lower(btrim(i.tur)) = lower(btrim(m.ilan_tercihi))
          THEN 'Ilan tercihi uyuyor'
        END,
        CASE
          WHEN
            (
              COALESCE(m.butce_min, 0) > 0
              OR COALESCE(m.butce_max, 0) > 0
            )
            AND (COALESCE(m.butce_min, 0) <= 0 OR i.fiyat >= m.butce_min)
            AND (COALESCE(m.butce_max, 0) <= 0 OR i.fiyat <= m.butce_max)
          THEN 'Butceye uygun'
        END,
        CASE
          WHEN m.istenen_ilce IS NOT NULL
            AND btrim(m.istenen_ilce) <> ''
            AND lower(btrim(i.ilce)) = lower(btrim(m.istenen_ilce))
          THEN 'Ilce uyuyor'
        END,
        CASE
          WHEN m.istenen_mahalle IS NOT NULL
            AND btrim(m.istenen_mahalle) <> ''
            AND lower(btrim(i.mahalle)) = lower(btrim(m.istenen_mahalle))
          THEN 'Mahalle uyuyor'
        END,
        CASE
          WHEN m.istenen_oda_sayisi IS NOT NULL
            AND btrim(m.istenen_oda_sayisi) <> ''
            AND lower(btrim(i.oda_sayisi)) = lower(btrim(m.istenen_oda_sayisi))
          THEN 'Oda sayisi uyuyor'
        END,
        CASE
          WHEN
            (
              COALESCE(m.min_metrekare, 0) > 0
              OR COALESCE(m.max_metrekare, 0) > 0
            )
            AND (COALESCE(m.min_metrekare, 0) <= 0 OR i.metrekare >= m.min_metrekare)
            AND (COALESCE(m.max_metrekare, 0) <= 0 OR i.metrekare <= m.max_metrekare)
          THEN 'Metrekare uygun'
        END
      ], NULL) AS eslesme_nedenleri

    FROM musteri m
    JOIN public.ilanlar i
      ON i.ofis_id = m.ofis_id
     AND i.durum = 'aktif'
     AND (
       m.ilan_tercihi IS NULL
       OR btrim(m.ilan_tercihi) = ''
       OR lower(btrim(i.tur)) = lower(btrim(m.ilan_tercihi))
     )
  )

  SELECT *
  FROM puanli
  WHERE eslesme_puani > 0
  ORDER BY
    eslesme_puani DESC,
    fiyat ASC,
    ilan_id
  LIMIT GREATEST(
    1,
    LEAST(COALESCE(p_limit, 20), 100)
  );
$$;

REVOKE EXECUTE
ON FUNCTION public.musteriye_uygun_ilanlar(uuid, integer)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.musteriye_uygun_ilanlar(uuid, integer)
TO authenticated;


