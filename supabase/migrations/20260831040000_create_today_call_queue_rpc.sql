-- P1 CRM:
-- "Bugun kimi aramalisin?" listesini deterministik kurallarla uretir.
-- AI kullanmaz.

CREATE OR REPLACE FUNCTION public.bugun_aranacak_musteriler(
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  musteri_id uuid,
  ofis_id uuid,
  durum text,
  oncelik text,
  sonraki_aksiyon text,
  sonraki_aksiyon_tarihi date,
  son_etkilesim_at timestamptz,
  puan integer,
  neden text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    m.id AS musteri_id,
    m.ofis_id,
    m.durum,
    m.oncelik,
    m.sonraki_aksiyon,
    m.sonraki_aksiyon_tarihi,
    m.son_etkilesim_at,

    (
      CASE
        WHEN m.durum = 'yeni' THEN 100
        ELSE 0
      END
      +
      CASE
        WHEN m.sonraki_aksiyon_tarihi <= CURRENT_DATE
             AND m.oncelik = 'sicak'
          THEN 90
        WHEN m.sonraki_aksiyon_tarihi <= CURRENT_DATE
             AND m.oncelik = 'ilik'
          THEN 70
        WHEN m.sonraki_aksiyon_tarihi <= CURRENT_DATE
             AND m.oncelik = 'soguk'
          THEN 40
        ELSE 0
      END
      +
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.gorevler g
          WHERE g.musteri_id = m.id
            AND g.ofis_id = m.ofis_id
            AND g.durum = 'acik'
            AND g.son_tarih::date <= CURRENT_DATE
        )
        THEN 20
        ELSE 0
      END
    )::integer AS puan,

    CASE
      WHEN m.durum = 'yeni'
        THEN 'Yeni musteri'
      WHEN m.sonraki_aksiyon_tarihi < CURRENT_DATE
           AND m.oncelik = 'sicak'
        THEN 'Gecikmis sicak takip'
      WHEN m.sonraki_aksiyon_tarihi = CURRENT_DATE
           AND m.oncelik = 'sicak'
        THEN 'Bugun sicak takip'
      WHEN m.sonraki_aksiyon_tarihi <= CURRENT_DATE
        THEN 'Takip zamani geldi'
      WHEN EXISTS (
        SELECT 1
        FROM public.gorevler g
        WHERE g.musteri_id = m.id
          AND g.ofis_id = m.ofis_id
          AND g.durum = 'acik'
          AND g.son_tarih::date <= CURRENT_DATE
      )
        THEN 'Acik gorevin suresi geldi'
      ELSE 'Takip'
    END AS neden

  FROM public.musteriler m

  WHERE
    m.ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
    AND (
      m.durum = 'yeni'
      OR m.sonraki_aksiyon_tarihi <= CURRENT_DATE
      OR EXISTS (
        SELECT 1
        FROM public.gorevler g
        WHERE g.musteri_id = m.id
          AND g.ofis_id = m.ofis_id
          AND g.durum = 'acik'
          AND g.son_tarih::date <= CURRENT_DATE
      )
    )

  ORDER BY
    puan DESC,
    m.sonraki_aksiyon_tarihi NULLS LAST,
    m.created_at ASC

  LIMIT GREATEST(
    1,
    LEAST(COALESCE(p_limit, 20), 100)
  );
$$;

REVOKE EXECUTE
ON FUNCTION public.bugun_aranacak_musteriler(integer)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.bugun_aranacak_musteriler(integer)
TO authenticated;
