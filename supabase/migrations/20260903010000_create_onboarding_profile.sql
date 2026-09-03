ALTER TABLE public.ofisler
ADD COLUMN IF NOT EXISTS ttyb_no text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.kullanici_profilleri (
  kullanici_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  danisman_adi text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kullanici_profilleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kullanici_profili_select_own
ON public.kullanici_profilleri;

CREATE POLICY kullanici_profili_select_own
ON public.kullanici_profilleri
FOR SELECT
TO authenticated
USING (kullanici_id = auth.uid());

DROP POLICY IF EXISTS kullanici_profili_insert_own
ON public.kullanici_profilleri;

CREATE POLICY kullanici_profili_insert_own
ON public.kullanici_profilleri
FOR INSERT
TO authenticated
WITH CHECK (kullanici_id = auth.uid());

DROP POLICY IF EXISTS kullanici_profili_update_own
ON public.kullanici_profilleri;

CREATE POLICY kullanici_profili_update_own
ON public.kullanici_profilleri
FOR UPDATE
TO authenticated
USING (kullanici_id = auth.uid())
WITH CHECK (kullanici_id = auth.uid());

CREATE OR REPLACE FUNCTION public.onboarding_profili_kaydet(
  p_danisman_adi text DEFAULT NULL,
  p_ttyb_no text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kullanici_id uuid;
  v_ofis_id uuid;
  v_danisman_adi text;
  v_ttyb_no text;
BEGIN
  v_kullanici_id := auth.uid();

  IF v_kullanici_id IS NULL THEN
    RAISE EXCEPTION 'Oturum acmis kullanici gerekli';
  END IF;

  v_danisman_adi := btrim(COALESCE(p_danisman_adi, ''));
  v_ttyb_no := btrim(COALESCE(p_ttyb_no, ''));

  IF char_length(v_danisman_adi) > 120 THEN
    RAISE EXCEPTION 'Danisman adi en fazla 120 karakter olabilir';
  END IF;

  IF char_length(v_ttyb_no) > 60 THEN
    RAISE EXCEPTION 'TTYB numarasi en fazla 60 karakter olabilir';
  END IF;

  SELECT ou.ofis_id
  INTO v_ofis_id
  FROM public.ofis_uyeleri ou
  WHERE ou.kullanici_id = v_kullanici_id
  LIMIT 1;

  IF v_ofis_id IS NULL THEN
    RAISE EXCEPTION 'Kullanicinin ofisi bulunamadi';
  END IF;

  INSERT INTO public.kullanici_profilleri (
    kullanici_id,
    danisman_adi,
    updated_at
  )
  VALUES (
    v_kullanici_id,
    v_danisman_adi,
    now()
  )
  ON CONFLICT (kullanici_id)
  DO UPDATE SET
    danisman_adi = EXCLUDED.danisman_adi,
    updated_at = now();

  UPDATE public.ofisler
  SET ttyb_no = v_ttyb_no
  WHERE id = v_ofis_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.onboarding_profili_kaydet(text, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.onboarding_profili_kaydet(text, text)
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.kullanici_profilleri
TO authenticated;
