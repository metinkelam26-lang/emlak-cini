-- Güvenli baslat_ofis fonksiyonu:
-- legacy kayıtları yeni ofise topluca bağlamaz.

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
    RAISE EXCEPTION 'Yetkisiz erişim: oturum açılmamış.';
  END IF;

  SELECT ofis_id
  INTO mevcut_ofis
  FROM public.ofis_uyeleri
  WHERE kullanici_id = auth.uid()
  LIMIT 1;

  IF mevcut_ofis IS NOT NULL THEN
    RETURN mevcut_ofis;
  END IF;

  kullanici_adi :=
    COALESCE(
      NULLIF(ofis_adi, ''),
      split_part(
        COALESCE(auth.jwt() ->> 'email', 'REİS EMLAK'),
        '@',
        1
      ) || ' Ofisi'
    );

  INSERT INTO public.ofisler (ad)
  VALUES (kullanici_adi)
  RETURNING id INTO yeni_ofis;

  INSERT INTO public.ofis_uyeleri (ofis_id, kullanici_id, rol)
  VALUES (yeni_ofis, auth.uid(), 'sahip');

  RETURN yeni_ofis;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.baslat_ofis(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.baslat_ofis(text) TO authenticated;
