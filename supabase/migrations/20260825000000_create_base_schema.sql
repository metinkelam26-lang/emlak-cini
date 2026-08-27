/*
  Emlak CRM temel veritabani semasi.
  Sonraki migration'lar bu tablolarin uzerine uygulanir.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ilanlar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik text NOT NULL,
  tur text NOT NULL CHECK (tur IN ('satilik', 'kiralik')),
  fiyat numeric NOT NULL DEFAULT 0 CHECK (fiyat >= 0),
  il text NOT NULL DEFAULT '',
  ilce text NOT NULL DEFAULT '',
  mahalle text NOT NULL DEFAULT '',
  oda_sayisi text NOT NULL DEFAULT '',
  metrekare numeric NOT NULL DEFAULT 0 CHECK (metrekare >= 0),
  bina_yasi integer NOT NULL DEFAULT 0 CHECK (bina_yasi >= 0),
  bulundugu_kat text NOT NULL DEFAULT '',
  toplam_kat integer NOT NULL DEFAULT 0 CHECK (toplam_kat >= 0),
  isitma_tipi text NOT NULL DEFAULT '',
  esyali boolean NOT NULL DEFAULT false,
  aciklama text NOT NULL DEFAULT '',
  fotograflar text[] NOT NULL DEFAULT '{}',
  durum text NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif', 'pasif', 'satildi', 'kiralandi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.musteriler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_soyad text NOT NULL,
  telefon text NOT NULL DEFAULT '',
  eposta text NOT NULL DEFAULT '',
  tip text NOT NULL DEFAULT 'alici' CHECK (tip IN ('alici', 'kiraci', 'satici', 'ev_sahibi')),
  butce_min numeric NOT NULL DEFAULT 0 CHECK (butce_min >= 0),
  butce_max numeric NOT NULL DEFAULT 0 CHECK (butce_max >= 0),
  istenen_ilce text NOT NULL DEFAULT '',
  istenen_mahalle text NOT NULL DEFAULT '',
  istenen_oda_sayisi text NOT NULL DEFAULT '',
  min_metrekare numeric NOT NULL DEFAULT 0 CHECK (min_metrekare >= 0),
  notlar text NOT NULL DEFAULT '',
  durum text NOT NULL DEFAULT 'yeni' CHECK (durum IN ('yeni', 'aktif', 'beklemede', 'tamamlandi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.randevular (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musteri_id uuid REFERENCES public.musteriler (id) ON DELETE SET NULL,
  ilan_id uuid REFERENCES public.ilanlar (id) ON DELETE SET NULL,
  tarih date NOT NULL,
  saat text NOT NULL DEFAULT '',
  randevu_notu text NOT NULL DEFAULT '',
  durum text NOT NULL DEFAULT 'planlandi' CHECK (durum IN ('planlandi', 'gerceklesti', 'iptal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ilanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musteriler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.randevular ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ilanlar" ON public.ilanlar;
CREATE POLICY "anon_select_ilanlar" ON public.ilanlar FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ilanlar" ON public.ilanlar;
CREATE POLICY "anon_insert_ilanlar" ON public.ilanlar FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ilanlar" ON public.ilanlar;
CREATE POLICY "anon_update_ilanlar" ON public.ilanlar FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ilanlar" ON public.ilanlar;
CREATE POLICY "anon_delete_ilanlar" ON public.ilanlar FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_musteriler" ON public.musteriler;
CREATE POLICY "anon_select_musteriler" ON public.musteriler FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_musteriler" ON public.musteriler;
CREATE POLICY "anon_insert_musteriler" ON public.musteriler FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_musteriler" ON public.musteriler;
CREATE POLICY "anon_update_musteriler" ON public.musteriler FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_musteriler" ON public.musteriler;
CREATE POLICY "anon_delete_musteriler" ON public.musteriler FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_randevular" ON public.randevular;
CREATE POLICY "anon_select_randevular" ON public.randevular FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_randevular" ON public.randevular;
CREATE POLICY "anon_insert_randevular" ON public.randevular FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_randevular" ON public.randevular;
CREATE POLICY "anon_update_randevular" ON public.randevular FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_randevular" ON public.randevular;
CREATE POLICY "anon_delete_randevular" ON public.randevular FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ilanlar TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.musteriler TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.randevular TO anon, authenticated;
