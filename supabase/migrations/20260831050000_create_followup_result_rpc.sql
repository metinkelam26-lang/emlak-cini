-- P1 CRM:
-- Arama sonucunu atomik olarak kaydeder:
-- 1) takip gorevi olusturur
-- 2) musteri takip alanlarini gunceller

CREATE OR REPLACE FUNCTION public.takip_sonucu_kaydet(
  p_musteri_id uuid,
  p_sonuc text,
  p_son_tarih date
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_aksiyon text;
  v_oncelik text;
BEGIN
  IF p_musteri_id IS NULL THEN
    RAISE EXCEPTION 'Musteri id gerekli.';
  END IF;

  IF p_son_tarih IS NULL THEN
    RAISE EXCEPTION 'Takip tarihi gerekli.';
  END IF;

  CASE p_sonuc
    WHEN 'Ulaşamadım' THEN
      v_aksiyon := 'Tekrar ara';
      v_oncelik := 'ilik';

    WHEN 'Görüştüm' THEN
      v_aksiyon := 'Takip et';
      v_oncelik := 'ilik';

    WHEN 'Randevu oluştu' THEN
      v_aksiyon := 'Randevu öncesi teyit';
      v_oncelik := 'sicak';

    WHEN 'İlgilenmiyor' THEN
      v_aksiyon := 'Düşük öncelikli takip';
      v_oncelik := 'soguk';

    ELSE
      RAISE EXCEPTION 'Gecersiz takip sonucu.';
  END CASE;

  UPDATE public.musteriler
  SET
    sonraki_aksiyon = v_aksiyon,
    sonraki_aksiyon_tarihi = p_son_tarih,
    oncelik = v_oncelik,
    son_etkilesim_at = now()
  WHERE id = p_musteri_id
    AND ofis_id IN (
      SELECT public.kullanici_ofisleri()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Musteri bulunamadi veya yetkiniz yok.';
  END IF;

  INSERT INTO public.gorevler (
    baslik,
    aciklama,
    son_tarih,
    saat,
    oncelik,
    durum,
    musteri_id,
    ilan_id
  )
  VALUES (
    'Takip',
    'Sonuc: ' || p_sonuc,
    p_son_tarih,
    '',
    'orta',
    'acik',
    p_musteri_id,
    NULL
  );
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.takip_sonucu_kaydet(uuid, text, date)
TO authenticated;
