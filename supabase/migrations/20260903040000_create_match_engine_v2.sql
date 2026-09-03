-- P1 Eslesme Motoru sertlestirme
-- Puanlama ve eslesme_nedenleri degismez; sadece JOIN'e kosullu hard filtreler eklenir.
-- Girilmemis tercih kriterleri hala hard filtre olusturmaz (yalnizca mahalle her zaman esnek kriter olarak kalir).

DROP FUNCTION IF EXISTS public.musteriye_uygun_ilanlar(uuid, integer);

CREATE FUNCTION public.musteriye_uygun_ilanlar(
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
  profil_guveni integer,
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

      CASE
        WHEN NOT (
          COALESCE(m.butce_min, 0) > 0
          OR COALESCE(m.butce_max, 0) > 0
        ) THEN 0
        WHEN COALESCE(m.butce_min, 0) > 0
         AND COALESCE(m.butce_max, 0) > 0
         AND m.butce_max > m.butce_min
        THEN ROUND(
          30.0 * (0.6 + 0.4 * GREATEST(
            0.0,
            1.0 - (
              ABS(i.fiyat - ((m.butce_min + m.butce_max) / 2.0))
              /
              GREATEST((m.butce_max - m.butce_min) / 2.0, 1)
            )
          ))
        )::integer
        ELSE 30
      END AS butce_puani,

      CASE
        WHEN NULLIF(btrim(m.istenen_ilce), '') IS NOT NULL THEN 20
        ELSE 0
      END AS ilce_puani,

      CASE
        WHEN NULLIF(btrim(m.istenen_mahalle), '') IS NOT NULL
         AND lower(btrim(i.mahalle)) = lower(btrim(m.istenen_mahalle))
        THEN 15
        ELSE 0
      END AS mahalle_puani,

      CASE
        WHEN NULLIF(btrim(m.istenen_oda_sayisi), '') IS NOT NULL THEN 15
        ELSE 0
      END AS oda_puani,

      CASE
        WHEN NOT (
          COALESCE(m.min_metrekare, 0) > 0
          OR COALESCE(m.max_metrekare, 0) > 0
        ) THEN 0
        WHEN COALESCE(m.min_metrekare, 0) > 0
         AND COALESCE(m.max_metrekare, 0) > 0
         AND m.max_metrekare > m.min_metrekare
        THEN ROUND(
          20.0 * (0.6 + 0.4 * GREATEST(
            0.0,
            1.0 - (
              ABS(i.metrekare - ((m.min_metrekare + m.max_metrekare) / 2.0))
              /
              GREATEST((m.max_metrekare - m.min_metrekare) / 2.0, 1)
            )
          ))
        )::integer
        ELSE 20
      END AS metrekare_puani,

      (
        CASE WHEN COALESCE(m.butce_min, 0) > 0 OR COALESCE(m.butce_max, 0) > 0 THEN 30 ELSE 0 END
        + CASE WHEN NULLIF(btrim(m.istenen_ilce), '') IS NOT NULL THEN 20 ELSE 0 END
        + CASE WHEN NULLIF(btrim(m.istenen_mahalle), '') IS NOT NULL THEN 15 ELSE 0 END
        + CASE WHEN NULLIF(btrim(m.istenen_oda_sayisi), '') IS NOT NULL THEN 15 ELSE 0 END
        + CASE WHEN COALESCE(m.min_metrekare, 0) > 0 OR COALESCE(m.max_metrekare, 0) > 0 THEN 20 ELSE 0 END
      )::integer AS mevcut_agirlik,

      ROUND(
        100.0 *
        (
          CASE WHEN NULLIF(btrim(m.ilan_tercihi), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN COALESCE(m.butce_min, 0) > 0 OR COALESCE(m.butce_max, 0) > 0 THEN 1 ELSE 0 END
          + CASE WHEN NULLIF(btrim(m.istenen_ilce), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN NULLIF(btrim(m.istenen_mahalle), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN NULLIF(btrim(m.istenen_oda_sayisi), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN COALESCE(m.min_metrekare, 0) > 0 OR COALESCE(m.max_metrekare, 0) > 0 THEN 1 ELSE 0 END
        ) / 6.0
      )::integer AS profil_guveni,

      CASE
        WHEN COALESCE(m.butce_min, 0) > 0
         AND COALESCE(m.butce_max, 0) > 0
        THEN ABS(i.fiyat - ((m.butce_min + m.butce_max) / 2.0))
        ELSE 0
      END AS butce_mesafe,

      CASE
        WHEN COALESCE(m.min_metrekare, 0) > 0
         AND COALESCE(m.max_metrekare, 0) > 0
        THEN ABS(i.metrekare - ((m.min_metrekare + m.max_metrekare) / 2.0))
        ELSE 0
      END AS metrekare_mesafe,

      array_remove(ARRAY[
        CASE WHEN COALESCE(m.butce_min, 0) > 0 OR COALESCE(m.butce_max, 0) > 0 THEN 'Butce araliginda' END,
        CASE WHEN NULLIF(btrim(m.istenen_ilce), '') IS NOT NULL THEN 'Ilce uyuyor' END,
        CASE
          WHEN NULLIF(btrim(m.istenen_mahalle), '') IS NOT NULL
           AND lower(btrim(i.mahalle)) = lower(btrim(m.istenen_mahalle))
          THEN 'Mahalle uyuyor'
        END,
        CASE WHEN NULLIF(btrim(m.istenen_oda_sayisi), '') IS NOT NULL THEN 'Oda sayisi uyuyor' END,
        CASE WHEN COALESCE(m.min_metrekare, 0) > 0 OR COALESCE(m.max_metrekare, 0) > 0 THEN 'Metrekare araliginda' END
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
     AND (COALESCE(m.butce_min, 0) <= 0 OR i.fiyat >= m.butce_min)
     AND (COALESCE(m.butce_max, 0) <= 0 OR i.fiyat <= m.butce_max)
     AND (
       m.istenen_ilce IS NULL
       OR btrim(m.istenen_ilce) = ''
       OR lower(btrim(i.ilce)) = lower(btrim(m.istenen_ilce))
     )
     AND (
       m.istenen_oda_sayisi IS NULL
       OR btrim(m.istenen_oda_sayisi) = ''
       OR lower(btrim(i.oda_sayisi)) = lower(btrim(m.istenen_oda_sayisi))
     )
     AND (COALESCE(m.min_metrekare, 0) <= 0 OR i.metrekare >= m.min_metrekare)
     AND (COALESCE(m.max_metrekare, 0) <= 0 OR i.metrekare <= m.max_metrekare)
  ),

  sonuc AS (
    SELECT
      p.*,
      CASE
        WHEN p.mevcut_agirlik = 0 THEN 100
        ELSE ROUND(
          100.0 * (
            p.butce_puani
            + p.ilce_puani
            + p.mahalle_puani
            + p.oda_puani
            + p.metrekare_puani
          ) / p.mevcut_agirlik
        )::integer
      END AS eslesme_puani
    FROM puanli p
  )

  SELECT
    s.ilan_id,
    s.baslik,
    s.tur,
    s.fiyat,
    s.il,
    s.ilce,
    s.mahalle,
    s.oda_sayisi,
    s.metrekare,
    s.eslesme_puani,
    s.profil_guveni,
    s.eslesme_nedenleri
  FROM sonuc s
  WHERE s.eslesme_puani > 0
  ORDER BY
    s.eslesme_puani DESC,
    s.profil_guveni DESC,
    s.butce_mesafe ASC,
    s.metrekare_mesafe ASC,
    s.fiyat ASC,
    s.ilan_id
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
