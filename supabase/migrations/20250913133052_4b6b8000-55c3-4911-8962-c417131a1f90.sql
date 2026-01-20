-- Enable RLS on the staging table and add permissive policies (staging-only)
ALTER TABLE public.medical_tests_import ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'medical_tests_import' AND policyname = 'Allow all on staging table'
  ) THEN
    CREATE POLICY "Allow all on staging table"
    ON public.medical_tests_import
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;