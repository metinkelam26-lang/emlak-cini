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
  END IF;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.randevu_aksiyonu_uygula(uuid, text, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.randevu_aksiyonu_uygula(uuid, text, date, text)
TO authenticated;
