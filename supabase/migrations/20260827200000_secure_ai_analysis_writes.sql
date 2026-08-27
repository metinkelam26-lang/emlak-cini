-- AI ciktilarini bulutta sakla ve ayni kaynak icin tek kayit tut.

DELETE FROM public.ai_analizler AS duplicate
WHERE duplicate.id IN (
  SELECT older.id
  FROM public.ai_analizler older
  JOIN public.ai_analizler newer
    ON newer.kaynak_tipi = older.kaynak_tipi
   AND newer.kaynak_id = older.kaynak_id
   AND newer.created_at > older.created_at
  WHERE older.id = duplicate.id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_analizler_unique_source
  ON public.ai_analizler (kaynak_tipi, kaynak_id);

DROP POLICY IF EXISTS "anon_insert_ai_analizler" ON public.ai_analizler;
CREATE POLICY "anon_insert_ai_analizler"
  ON public.ai_analizler FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ai_analizler" ON public.ai_analizler;
CREATE POLICY "anon_update_ai_analizler"
  ON public.ai_analizler FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT INSERT, UPDATE ON public.ai_analizler TO anon, authenticated;
