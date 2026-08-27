-- Musteri-ilan gosterim ve teklif gecmisi.

CREATE TABLE IF NOT EXISTS public.musteri_ilan_etkilesimleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musteri_id uuid NOT NULL REFERENCES public.musteriler (id) ON DELETE CASCADE,
  ilan_id uuid NOT NULL REFERENCES public.ilanlar (id) ON DELETE CASCADE,
  aksiyon text NOT NULL CHECK (aksiyon IN ('gosterildi', 'teklif_edildi')),
  notlar text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_musteri_ilan_etkilesimleri_musteri
  ON public.musteri_ilan_etkilesimleri (musteri_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_musteri_ilan_etkilesimleri_ilan
  ON public.musteri_ilan_etkilesimleri (ilan_id, created_at DESC);

ALTER TABLE public.musteri_ilan_etkilesimleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_musteri_ilan_etkilesimleri" ON public.musteri_ilan_etkilesimleri;
CREATE POLICY "anon_select_musteri_ilan_etkilesimleri"
  ON public.musteri_ilan_etkilesimleri FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_musteri_ilan_etkilesimleri" ON public.musteri_ilan_etkilesimleri;
CREATE POLICY "anon_insert_musteri_ilan_etkilesimleri"
  ON public.musteri_ilan_etkilesimleri FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.musteri_ilan_etkilesimleri TO anon, authenticated;
