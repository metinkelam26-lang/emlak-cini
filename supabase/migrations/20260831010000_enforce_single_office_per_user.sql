-- MVP kararı: Bir kullanıcı yalnızca tek bir ofise üye olabilir.
-- Mevcut duplicate üyelik varsa migration veri değiştirmek yerine durur.

DO $$
BEGIN
  IF EXISTS (
    SELECT kullanici_id
    FROM public.ofis_uyeleri
    GROUP BY kullanici_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'ofis_uyeleri tablosunda birden fazla ofise bagli kullanicilar var. Migration uygulanmadi.';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ofis_uyeleri_kullanici_id_unique'
      AND conrelid = 'public.ofis_uyeleri'::regclass
  ) THEN
    ALTER TABLE public.ofis_uyeleri
      ADD CONSTRAINT ofis_uyeleri_kullanici_id_unique
      UNIQUE (kullanici_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.baslat_ofis(ofis_adi text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  mevcut_ofis uuid;
  yeni_ofis uuid;
  kullanici_adi text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz erisim: oturum acilmamis.';
  END IF;

  -- UNIQUE(kullanici_id) nedeniyle en fazla tek satir gelebilir.
  SELECT ofis_id
  INTO mevcut_ofis
  FROM public.ofis_uyeleri
  WHERE kullanici_id = auth.uid();

  IF mevcut_ofis IS NOT NULL THEN
    RETURN mevcut_ofis;
  END IF;

  kullanici_adi :=
    COALESCE(
      NULLIF(btrim(ofis_adi), ''),
      split_part(
        COALESCE(auth.jwt() ->> 'email', 'REIS EMLAK'),
        '@',
        1
      ) || ' Ofisi'
    );

  -- Exception bloğu eşzamanlı iki baslat_ofis çağrısını güvenli ele alır.
  BEGIN
    INSERT INTO public.ofisler (ad)
    VALUES (kullanici_adi)
    RETURNING id INTO yeni_ofis;

    INSERT INTO public.ofis_uyeleri (ofis_id, kullanici_id, rol)
    VALUES (yeni_ofis, auth.uid(), 'sahip');

    RETURN yeni_ofis;

  EXCEPTION
    WHEN unique_violation THEN
      -- Diğer eşzamanlı çağrı üyeliği önce oluşturduysa,
      -- bu alt transaction içindeki yeni ofis INSERT'i geri alınır.
      SELECT ofis_id
      INTO mevcut_ofis
      FROM public.ofis_uyeleri
      WHERE kullanici_id = auth.uid();

      IF mevcut_ofis IS NULL THEN
        RAISE;
      END IF;

      RETURN mevcut_ofis;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.baslat_ofis(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.baslat_ofis(text) TO authenticated;
