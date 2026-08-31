CREATE OR REPLACE FUNCTION public.takip_sonucu_kaydet(
  p_musteri_id uuid,
  p_sonuc text,
  p_son_tarih date,
  p_randevu_tarihi date DEFAULT NULL,
  p_randevu_saat text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_ofis_id uuid;
  v_sonraki_aksiyon text;
  v_oncelik text;
BEGIN
  IF p_musteri_id IS NULL THEN
    RAISE EXCEPTION 'Müşteri ID zorunludur';
  END IF;

  IF p_sonuc IS NULL OR btrim(p_sonuc) = '' THEN
    RAISE EXCEPTION 'Takip sonucu zorunludur';
  END IF;

  IF p_son_tarih IS NULL THEN
    RAISE EXCEPTION 'Sonraki takip tarihi zorunludur';
  END IF;

  CASE p_sonuc
    WHEN 'Ulaşamadım' THEN
      v_sonraki_aksiyon := 'Tekrar ara';
      v_oncelik := 'ilik';

    WHEN 'Görüştüm' THEN
      v_sonraki_aksiyon := 'Takip et';
      v_oncelik := 'ilik';

    WHEN 'Randevu oluştu' THEN
      v_sonraki_aksiyon := 'Randevu öncesi teyit';
      v_oncelik := 'sicak';

      IF p_randevu_tarihi IS NULL THEN
        RAISE EXCEPTION 'Randevu tarihi zorunludur';
      END IF;

      IF p_randevu_saat IS NULL OR btrim(p_randevu_saat) = '' THEN
        RAISE EXCEPTION 'Randevu saati zorunludur';
      END IF;

    WHEN 'İlgilenmiyor' THEN
      v_sonraki_aksiyon := 'Düşük öncelikli takip';
      v_oncelik := 'soguk';

    ELSE
      RAISE EXCEPTION 'Geçersiz takip sonucu: %', p_sonuc;
  END CASE;

  UPDATE public.musteriler
  SET
    sonraki_aksiyon = v_sonraki_aksiyon,
    sonraki_aksiyon_tarihi = p_son_tarih,
    oncelik = v_oncelik,
    son_etkilesim_at = now(),
    updated_at = now()
  WHERE id = p_musteri_id
    AND ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
  RETURNING ofis_id INTO v_ofis_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müşteri bulunamadı veya erişim yetkiniz yok';
  END IF;

  UPDATE public.gorevler
  SET
    durum = 'tamamlandi',
    updated_at = now()
  WHERE musteri_id = p_musteri_id
    AND ofis_id = v_ofis_id
    AND durum = 'acik'
    AND (
      baslik = 'Takip'
      OR baslik LIKE 'Takip:%'
    );

  IF p_sonuc <> 'Randevu oluştu' THEN
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
      'Sonuç: ' || p_sonuc,
      p_son_tarih,
      '',
      'orta',
      'acik',
      p_musteri_id,
      v_ofis_id
    );
  END IF;

  IF p_sonuc = 'Randevu oluştu' THEN
    IF EXISTS (
      SELECT 1
      FROM public.randevular r
      WHERE r.ofis_id = v_ofis_id
        AND r.tarih = p_randevu_tarihi
        AND r.saat = btrim(p_randevu_saat)
        AND r.durum = 'planlandi'
    ) THEN
      RAISE EXCEPTION 'Bu tarih ve saatte planlanmış başka bir randevu var';
    END IF;

    INSERT INTO public.randevular (
      musteri_id,
      ilan_id,
      tarih,
      saat,
      randevu_notu,
      durum,
      ofis_id
    )
    VALUES (
      p_musteri_id,
      NULL,
      p_randevu_tarihi,
      btrim(p_randevu_saat),
      'Takip sonucundan oluşturuldu',
      'planlandi',
      v_ofis_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.randevu_aksiyonu_uygula(
  p_randevu_id uuid,
  p_aksiyon text,
  p_yeni_tarih date DEFAULT NULL,
  p_yeni_saat text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_ofis_id uuid;
  v_musteri_id uuid;
BEGIN
  IF p_randevu_id IS NULL THEN
    RAISE EXCEPTION 'Randevu ID zorunludur';
  END IF;

  IF p_aksiyon NOT IN ('gorusuldu', 'ertele', 'iptal') THEN
    RAISE EXCEPTION 'Geçersiz randevu aksiyonu';
  END IF;

  SELECT r.ofis_id, r.musteri_id
  INTO v_ofis_id, v_musteri_id
  FROM public.randevular r
  WHERE r.id = p_randevu_id
    AND r.ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Randevu bulunamadı veya erişim yetkiniz yok';
  END IF;

  IF p_aksiyon = 'gorusuldu' THEN
    UPDATE public.randevular
    SET
      durum = 'gerceklesti',
      updated_at = now()
    WHERE id = p_randevu_id
      AND ofis_id = v_ofis_id;

    IF v_musteri_id IS NOT NULL THEN
      UPDATE public.musteriler
      SET
        sonraki_aksiyon = 'Randevu sonrası takip',
        sonraki_aksiyon_tarihi = CURRENT_DATE + 1,
        oncelik = 'sicak',
        son_etkilesim_at = now(),
        updated_at = now()
      WHERE id = v_musteri_id
        AND ofis_id = v_ofis_id;
    END IF;

  ELSIF p_aksiyon = 'iptal' THEN
    UPDATE public.randevular
    SET
      durum = 'iptal',
      updated_at = now()
    WHERE id = p_randevu_id
      AND ofis_id = v_ofis_id;

  ELSIF p_aksiyon = 'ertele' THEN
    IF p_yeni_tarih IS NULL THEN
      RAISE EXCEPTION 'Yeni randevu tarihi zorunludur';
    END IF;

    IF p_yeni_saat IS NULL OR btrim(p_yeni_saat) = '' THEN
      RAISE EXCEPTION 'Yeni randevu saati zorunludur';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.randevular r
      WHERE r.ofis_id = v_ofis_id
        AND r.id <> p_randevu_id
        AND r.tarih = p_yeni_tarih
        AND r.saat = btrim(p_yeni_saat)
        AND r.durum = 'planlandi'
    ) THEN
      RAISE EXCEPTION 'Bu tarih ve saatte planlanmış başka bir randevu var';
    END IF;

    UPDATE public.randevular
    SET
      tarih = p_yeni_tarih,
      saat = btrim(p_yeni_saat),
      durum = 'planlandi',
      updated_at = now()
    WHERE id = p_randevu_id
      AND ofis_id = v_ofis_id;

    IF v_musteri_id IS NOT NULL THEN
      UPDATE public.musteriler
      SET
        sonraki_aksiyon = 'Randevu öncesi teyit',
        sonraki_aksiyon_tarihi = p_yeni_tarih,
        oncelik = 'sicak',
        updated_at = now()
      WHERE id = v_musteri_id
        AND ofis_id = v_ofis_id;
    END IF;
  END IF;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date, date, text)
TO authenticated;

REVOKE EXECUTE
ON FUNCTION public.randevu_aksiyonu_uygula(uuid, text, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.randevu_aksiyonu_uygula(uuid, text, date, text)
TO authenticated;
