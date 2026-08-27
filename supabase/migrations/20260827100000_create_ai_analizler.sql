CREATE TABLE IF NOT EXISTS public.ai_analizler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kaynak_tipi text NOT NULL CHECK (kaynak_tipi IN ('listing', 'customer')),
  kaynak_id uuid NOT NULL,
  baslik text NOT NULL DEFAULT '',
  icerik text NOT NULL DEFAULT '',
  sonuc jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analizler_kaynak ON public.ai_analizler (kaynak_tipi, kaynak_id, created_at DESC);
ALTER TABLE public.ai_analizler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ai_analizler" ON public.ai_analizler;
CREATE POLICY "anon_select_ai_analizler" ON public.ai_analizler FOR SELECT TO anon, authenticated USING (true);
