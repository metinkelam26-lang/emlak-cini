CREATE OR REPLACE FUNCTION public.takip_olustur(
  p_musteri_id uuid,
  p_sonraki_aksiyon text,
  p_son_tarih date,
  p_aciklama text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_ofis_id uuid;
  v_gorev_id uuid;
BEGIN
  IF p_musteri_id IS NULL THEN
    RAISE EXCEPTION 'Müşteri ID zorunludur';
  END IF;

  IF p_sonraki_aksiyon IS NULL OR btrim(p_sonraki_aksiyon) = '' THEN
    RAISE EXCEPTION 'Sonraki aksiyon zorunludur';
  END IF;

  IF p_son_tarih IS NULL THEN
    RAISE EXCEPTION 'Sonraki takip tarihi zorunludur';
  END IF;

  SELECT m.ofis_id
  INTO v_ofis_id
  FROM public.musteriler m
  WHERE m.id = p_musteri_id
    AND m.ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müşteri bulunamadı veya erişim yetkiniz yok';
  END IF;

  UPDATE public.musteriler
  SET
    sonraki_aksiyon = btrim(p_sonraki_aksiyon),
    sonraki_aksiyon_tarihi = p_son_tarih,
    updated_at = now()
  WHERE id = p_musteri_id
    AND ofis_id = v_ofis_id;

  SELECT g.id
  INTO v_gorev_id
  FROM public.gorevler g
  WHERE g.musteri_id = p_musteri_id
    AND g.ofis_id = v_ofis_id
    AND g.durum = 'acik'
    AND (
      g.baslik = 'Takip'
      OR g.baslik LIKE 'Takip:%'
    )
  ORDER BY g.updated_at DESC, g.created_at DESC, g.id DESC
  LIMIT 1;

  IF v_gorev_id IS NOT NULL THEN
    UPDATE public.gorevler
    SET
      baslik = 'Takip',
      aciklama = p_aciklama,
      son_tarih = p_son_tarih,
      durum = 'acik',
      updated_at = now()
    WHERE id = v_gorev_id
      AND ofis_id = v_ofis_id;

    UPDATE public.gorevler
    SET
      durum = 'tamamlandi',
      updated_at = now()
    WHERE musteri_id = p_musteri_id
      AND ofis_id = v_ofis_id
      AND durum = 'acik'
      AND id <> v_gorev_id
      AND (
        baslik = 'Takip'
        OR baslik LIKE 'Takip:%'
      );
  ELSE
    INSERT INTO public.gorevler (
      baslik,
      aciklama,
      son_tarih,
      saat,
      oncelik,
      durum,
      musteri_id,
      ofis_id
    )
    VALUES (
      'Takip',
      p_aciklama,
      p_son_tarih,
      '',
      'orta',
      'acik',
      p_musteri_id,
      v_ofis_id
    )
    RETURNING id INTO v_gorev_id;
  END IF;

  RETURN v_gorev_id;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.takip_olustur(uuid, text, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.takip_olustur(uuid, text, date, text)
TO authenticated;
