-- 1) Create a simple staging table (all text) to accept the CSV without type errors
CREATE TABLE IF NOT EXISTS public.medical_tests_import (
  test_name TEXT,
  test_code TEXT,
  description TEXT,
  body_system TEXT,
  customer_price TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Do NOT enable RLS here; this table is only for temporary imports via the dashboard

-- 2) Function to transform-and-load data from staging into the real table
CREATE OR REPLACE FUNCTION public.ingest_medical_tests_from_import()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  -- Insert transformed rows; let defaults apply for columns we don't have in the CSV (e.g., is_active default true, report_delivered_in default '24')
  INSERT INTO public.medical_tests (
    test_name,
    test_code,
    description,
    body_system,
    customer_price
  )
  SELECT
    NULLIF(TRIM(test_name), ''),
    NULLIF(TRIM(test_code), ''),
    NULLIF(TRIM(description), ''),
    NULLIF(TRIM(body_system), ''),
    NULLIF(TRIM(customer_price), '')::numeric
  FROM public.medical_tests_import;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Clear the staging table after successful load
  TRUNCATE TABLE public.medical_tests_import;

  RETURN v_inserted;
END;
$$;