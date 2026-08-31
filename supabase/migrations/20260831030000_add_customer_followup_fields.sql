-- P1 CRM cekirdegi:
-- Musterinin sonraki aksiyonunu ve takip onceligini dogrudan tutar.

ALTER TABLE public.musteriler
  ADD COLUMN IF NOT EXISTS sonraki_aksiyon text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sonraki_aksiyon_tarihi date,
  ADD COLUMN IF NOT EXISTS oncelik text NOT NULL DEFAULT 'ilik',
  ADD COLUMN IF NOT EXISTS son_etkilesim_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'musteriler_oncelik_check'
      AND conrelid = 'public.musteriler'::regclass
  ) THEN
    ALTER TABLE public.musteriler
      ADD CONSTRAINT musteriler_oncelik_check
      CHECK (oncelik IN ('sicak', 'ilik', 'soguk'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_musteriler_ofis_sonraki_aksiyon_tarihi
  ON public.musteriler (ofis_id, sonraki_aksiyon_tarihi)
  WHERE sonraki_aksiyon_tarihi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_musteriler_ofis_oncelik
  ON public.musteriler (ofis_id, oncelik);
