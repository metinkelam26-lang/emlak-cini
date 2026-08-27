/*
# Şema optimizasyonu ve takip görevleri

## Amaç
Mevcut ilan / müşteri / randevu tablolarına güvenli index ve updated_at alanları ekler.
Takip görevleri (hatırlatmalar) için `gorevler` tablosunu oluşturur.

## Değişiklikler
- `ilanlar`, `musteriler`, `randevular`: `updated_at` (mevcut kayıtlar için now() varsayılanı).
- Filtre ve ilişki sorgularına uygun btree index'ler.
- Ortak `set_updated_at` tetikleyicisi.
- `gorevler`: başlık, açıklama, son tarih, isteğe bağlı saat, öncelik, durum,
  isteğe bağlı müşteri ve ilan ilişkileri.

## Güvenlik
- Yeni tablo RLS açık; tek kullanıcılı uygulama için anon + authenticated tam erişim.
- Mevcut satırlar silinmez veya dönüştürülmez.
- Index ve kolon ekleme işlemleri idempotenttir (`IF NOT EXISTS`).

## Önemli Notlar
1. `gorevler.musteri_id` / `ilan_id` silinince görev kaydı kalır, ilişki null olur.
2. Öncelik: dusuk | orta | yuksek. Durum: acik | tamamlandi | iptal.
3. Uygulama görevleri Görevler sayfası ve ana sayfa hatırlatmalarından yönetir.
*/

-- Güncelleme zamanı tetikleyicisi
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.ilanlar
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.musteriler
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.randevular
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_ilanlar_updated_at ON public.ilanlar;
CREATE TRIGGER set_ilanlar_updated_at
  BEFORE UPDATE ON public.ilanlar
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_musteriler_updated_at ON public.musteriler;
CREATE TRIGGER set_musteriler_updated_at
  BEFORE UPDATE ON public.musteriler
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_randevular_updated_at ON public.randevular;
CREATE TRIGGER set_randevular_updated_at
  BEFORE UPDATE ON public.randevular
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ilanlar_durum ON public.ilanlar (durum);
CREATE INDEX IF NOT EXISTS idx_ilanlar_tur ON public.ilanlar (tur);
CREATE INDEX IF NOT EXISTS idx_ilanlar_created_at ON public.ilanlar (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ilanlar_il_ilce ON public.ilanlar (il, ilce);

CREATE INDEX IF NOT EXISTS idx_musteriler_durum ON public.musteriler (durum);
CREATE INDEX IF NOT EXISTS idx_musteriler_tip ON public.musteriler (tip);
CREATE INDEX IF NOT EXISTS idx_musteriler_created_at ON public.musteriler (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_randevular_tarih_saat ON public.randevular (tarih, saat);
CREATE INDEX IF NOT EXISTS idx_randevular_durum ON public.randevular (durum);
CREATE INDEX IF NOT EXISTS idx_randevular_musteri_id ON public.randevular (musteri_id);
CREATE INDEX IF NOT EXISTS idx_randevular_ilan_id ON public.randevular (ilan_id);

CREATE TABLE IF NOT EXISTS public.gorevler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik text NOT NULL,
  aciklama text NOT NULL DEFAULT '',
  son_tarih date NOT NULL,
  saat text NOT NULL DEFAULT '',
  oncelik text NOT NULL DEFAULT 'orta'
    CHECK (oncelik IN ('dusuk', 'orta', 'yuksek')),
  durum text NOT NULL DEFAULT 'acik'
    CHECK (durum IN ('acik', 'tamamlandi', 'iptal')),
  musteri_id uuid REFERENCES public.musteriler (id) ON DELETE SET NULL,
  ilan_id uuid REFERENCES public.ilanlar (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gorevler_son_tarih ON public.gorevler (son_tarih, saat);
CREATE INDEX IF NOT EXISTS idx_gorevler_durum ON public.gorevler (durum);
CREATE INDEX IF NOT EXISTS idx_gorevler_oncelik ON public.gorevler (oncelik);
CREATE INDEX IF NOT EXISTS idx_gorevler_musteri_id ON public.gorevler (musteri_id);
CREATE INDEX IF NOT EXISTS idx_gorevler_ilan_id ON public.gorevler (ilan_id);

DROP TRIGGER IF EXISTS set_gorevler_updated_at ON public.gorevler;
CREATE TRIGGER set_gorevler_updated_at
  BEFORE UPDATE ON public.gorevler
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.gorevler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gorevler" ON public.gorevler;
CREATE POLICY "anon_select_gorevler"
  ON public.gorevler FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_gorevler" ON public.gorevler;
CREATE POLICY "anon_insert_gorevler"
  ON public.gorevler FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_gorevler" ON public.gorevler;
CREATE POLICY "anon_update_gorevler"
  ON public.gorevler FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_gorevler" ON public.gorevler;
CREATE POLICY "anon_delete_gorevler"
  ON public.gorevler FOR DELETE
  TO anon, authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gorevler TO anon, authenticated;
