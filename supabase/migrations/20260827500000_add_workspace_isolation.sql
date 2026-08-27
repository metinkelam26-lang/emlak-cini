-- Coklu ofis ve kullanici veri izolasyonu.

CREATE TABLE IF NOT EXISTS public.ofisler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ofis_uyeleri (
  ofis_id uuid NOT NULL REFERENCES public.ofisler (id) ON DELETE CASCADE,
  kullanici_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'uye' CHECK (rol IN ('sahip', 'yonetici', 'uye')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ofis_id, kullanici_id)
);

ALTER TABLE public.ilanlar ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;
ALTER TABLE public.musteriler ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;
ALTER TABLE public.randevular ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;
ALTER TABLE public.gorevler ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;
ALTER TABLE public.ai_analizler ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;
ALTER TABLE public.musteri_ilan_etkilesimleri ADD COLUMN IF NOT EXISTS ofis_id uuid REFERENCES public.ofisler (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ilanlar_ofis_id ON public.ilanlar (ofis_id);
CREATE INDEX IF NOT EXISTS idx_musteriler_ofis_id ON public.musteriler (ofis_id);
CREATE INDEX IF NOT EXISTS idx_randevular_ofis_id ON public.randevular (ofis_id);
CREATE INDEX IF NOT EXISTS idx_gorevler_ofis_id ON public.gorevler (ofis_id);
CREATE INDEX IF NOT EXISTS idx_ai_analizler_ofis_id ON public.ai_analizler (ofis_id);
CREATE INDEX IF NOT EXISTS idx_musteri_ilan_etkilesimleri_ofis_id ON public.musteri_ilan_etkilesimleri (ofis_id);

ALTER TABLE public.ofisler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofis_uyeleri ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.kullanici_ofisleri()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT ofis_id FROM public.ofis_uyeleri WHERE kullanici_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.baslat_ofis(ofis_adi text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  mevcut_ofis uuid;
  yeni_ofis uuid;
  kullanici_adi text;
BEGIN
  SELECT ofis_id INTO mevcut_ofis FROM public.ofis_uyeleri WHERE kullanici_id = auth.uid() LIMIT 1;
  IF mevcut_ofis IS NOT NULL THEN RETURN mevcut_ofis; END IF;
  kullanici_adi := COALESCE(NULLIF(ofis_adi, ''), split_part(COALESCE(auth.jwt() ->> 'email', 'REİS EMLAK'), '@', 1) || ' Ofisi');
  INSERT INTO public.ofisler (ad) VALUES (kullanici_adi) RETURNING id INTO yeni_ofis;
  INSERT INTO public.ofis_uyeleri (ofis_id, kullanici_id, rol) VALUES (yeni_ofis, auth.uid(), 'sahip');
  UPDATE public.ilanlar SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  UPDATE public.musteriler SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  UPDATE public.randevular SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  UPDATE public.gorevler SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  UPDATE public.ai_analizler SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  UPDATE public.musteri_ilan_etkilesimleri SET ofis_id = yeni_ofis WHERE ofis_id IS NULL;
  RETURN yeni_ofis;
END;
$$;

CREATE OR REPLACE FUNCTION public.ata_kullanici_ofisi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.ofis_id IS NULL THEN
    SELECT ofis_id INTO NEW.ofis_id
    FROM public.ofis_uyeleri
    WHERE kullanici_id = auth.uid()
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tablo text;
BEGIN
  FOREACH tablo IN ARRAY ARRAY['ilanlar', 'musteriler', 'randevular', 'gorevler', 'ai_analizler', 'musteri_ilan_etkilesimleri'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS ata_ofis_id ON public.%I', tablo);
    EXECUTE format('CREATE TRIGGER ata_ofis_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.ata_kullanici_ofisi()', tablo);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.kullanici_ofisleri() TO authenticated;
GRANT EXECUTE ON FUNCTION public.baslat_ofis(text) TO authenticated;

DROP POLICY IF EXISTS "anon_select_ofisler" ON public.ofisler;
DROP POLICY IF EXISTS "anon_select_ofis_uyeleri" ON public.ofis_uyeleri;
DROP POLICY IF EXISTS "uye_ofisini_gorur" ON public.ofisler;
DROP POLICY IF EXISTS "uye_uyeleri_gorur" ON public.ofis_uyeleri;
CREATE POLICY "uye_ofisini_gorur" ON public.ofisler FOR SELECT TO authenticated USING (id IN (SELECT public.kullanici_ofisleri()));
CREATE POLICY "uye_uyeleri_gorur" ON public.ofis_uyeleri FOR SELECT TO authenticated USING (ofis_id IN (SELECT public.kullanici_ofisleri()));

DO $$
DECLARE
  tablo text;
BEGIN
  FOREACH tablo IN ARRAY ARRAY['ilanlar', 'musteriler', 'randevular', 'gorevler', 'ai_analizler', 'musteri_ilan_etkilesimleri'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_select_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_insert_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_update_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_delete_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_select_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_insert_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_update_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_delete_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ofis_select_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ofis_insert_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ofis_update_' || tablo, tablo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ofis_delete_' || tablo, tablo);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (ofis_id IN (SELECT public.kullanici_ofisleri()))', 'ofis_select_' || tablo, tablo);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (ofis_id IN (SELECT public.kullanici_ofisleri()))', 'ofis_insert_' || tablo, tablo);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (ofis_id IN (SELECT public.kullanici_ofisleri())) WITH CHECK (ofis_id IN (SELECT public.kullanici_ofisleri()))', 'ofis_update_' || tablo, tablo);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (ofis_id IN (SELECT public.kullanici_ofisleri()))', 'ofis_delete_' || tablo, tablo);
  END LOOP;
END $$;

GRANT SELECT ON public.ofisler, public.ofis_uyeleri TO authenticated;
