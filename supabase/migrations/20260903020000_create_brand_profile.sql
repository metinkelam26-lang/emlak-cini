-- Marka profili alanlari
ALTER TABLE public.kullanici_profilleri
  ADD COLUMN IF NOT EXISTS ana_renk text NOT NULL DEFAULT '#c69214',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';

-- Giris yapmis kullanicinin mevcut marka bilgilerini getirir
CREATE OR REPLACE FUNCTION public.marka_profili_getir()
RETURNS TABLE (
  danisman_adi text,
  ofis_adi text,
  ttyb_no text,
  ana_renk text,
  logo_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(kp.danisman_adi, ''),
    COALESCE(o.ad, ''),
    COALESCE(o.ttyb_no, ''),
    COALESCE(kp.ana_renk, '#c69214'),
    COALESCE(kp.logo_url, '')
  FROM public.ofis_uyeleri ou
  JOIN public.ofisler o
    ON o.id = ou.ofis_id
  LEFT JOIN public.kullanici_profilleri kp
    ON kp.kullanici_id = ou.kullanici_id
  WHERE ou.kullanici_id = auth.uid()
  LIMIT 1;
$$;

-- Giris yapmis kullanicinin marka bilgilerini kaydeder
CREATE OR REPLACE FUNCTION public.marka_profili_kaydet(
  p_danisman_adi text,
  p_ofis_adi text,
  p_ttyb_no text,
  p_ana_renk text,
  p_logo_url text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ofis_id uuid;
  v_danisman_adi text := trim(COALESCE(p_danisman_adi, ''));
  v_ofis_adi text := trim(COALESCE(p_ofis_adi, ''));
  v_ttyb_no text := trim(COALESCE(p_ttyb_no, ''));
  v_ana_renk text := trim(COALESCE(p_ana_renk, ''));
  v_logo_url text := trim(COALESCE(p_logo_url, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF length(v_danisman_adi) > 120 THEN
    RAISE EXCEPTION 'advisor name too long';
  END IF;

  IF length(v_ofis_adi) < 1 OR length(v_ofis_adi) > 120 THEN
    RAISE EXCEPTION 'invalid office name';
  END IF;

  IF length(v_ttyb_no) > 60 THEN
    RAISE EXCEPTION 'license number too long';
  END IF;

  IF v_ana_renk !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'invalid brand color';
  END IF;

  SELECT ou.ofis_id
    INTO v_ofis_id
  FROM public.ofis_uyeleri ou
  WHERE ou.kullanici_id = v_user_id
  LIMIT 1;

  IF v_ofis_id IS NULL THEN
    RAISE EXCEPTION 'workspace not initialized';
  END IF;

  INSERT INTO public.kullanici_profilleri (
    kullanici_id,
    danisman_adi,
    ana_renk,
    logo_url,
    updated_at
  )
  VALUES (
    v_user_id,
    v_danisman_adi,
    v_ana_renk,
    v_logo_url,
    now()
  )
  ON CONFLICT (kullanici_id)
  DO UPDATE SET
    danisman_adi = EXCLUDED.danisman_adi,
    ana_renk = EXCLUDED.ana_renk,
    logo_url = EXCLUDED.logo_url,
    updated_at = now();

  UPDATE public.ofisler
  SET
    ad = v_ofis_adi,
    ttyb_no = v_ttyb_no
  WHERE id = v_ofis_id;
END;
$$;

REVOKE ALL ON FUNCTION public.marka_profili_getir() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marka_profili_kaydet(text,text,text,text,text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.marka_profili_getir() FROM anon;
REVOKE ALL ON FUNCTION public.marka_profili_kaydet(text,text,text,text,text) FROM anon;

GRANT EXECUTE ON FUNCTION public.marka_profili_getir() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marka_profili_kaydet(text,text,text,text,text) TO authenticated;
