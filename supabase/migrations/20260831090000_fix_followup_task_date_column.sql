DROP FUNCTION IF EXISTS public.takip_sonucu_kaydet(uuid, text, date);

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
    son_etkilesim_at = now()
  WHERE id = p_musteri_id
    AND ofis_id IN (
      SELECT public.kullanici_ofisleri()
    )
  RETURNING ofis_id INTO v_ofis_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müşteri bulunamadı veya erişim yetkiniz yok';
  END IF;

  INSERT INTO public.gorevler (
    baslik,
    aciklama,
    son_tarih,
    oncelik,
    durum,
    musteri_id,
    ofis_id
  )
  VALUES (
    'Takip',
    'Sonuç: ' || p_sonuc,
    p_son_tarih,
    'orta',
    'acik',
    p_musteri_id,
    v_ofis_id
  );

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

REVOKE ALL ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date, date, text) TO authenticated;


