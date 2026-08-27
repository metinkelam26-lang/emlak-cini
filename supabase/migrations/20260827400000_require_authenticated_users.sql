-- Uygulama verilerini anonim erisimden cikar.

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ilanlar', 'musteriler', 'randevular', 'gorevler', 'ai_analizler', 'musteri_ilan_etkilesimleri'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOREACH policy_name IN ARRAY ARRAY['anon_select_', 'anon_insert_', 'anon_update_', 'anon_delete_'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || table_name, table_name);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'authenticated_select_' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', 'authenticated_insert_' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', 'authenticated_update_' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)', 'authenticated_delete_' || table_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "anon_upload_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "anon_update_ilan_fotograflari" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_ilan_fotograflari" ON storage.objects;

CREATE POLICY "authenticated_upload_ilan_fotograflari" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ilan-fotograflari');
CREATE POLICY "authenticated_read_ilan_fotograflari" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ilan-fotograflari');
CREATE POLICY "authenticated_update_ilan_fotograflari" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ilan-fotograflari') WITH CHECK (bucket_id = 'ilan-fotograflari');
CREATE POLICY "authenticated_delete_ilan_fotograflari" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ilan-fotograflari');
