-- Create medical_tests table (idempotent / safe)
-- This migration is safe to re-run:
-- - Creates table only if it does not exist
-- - Adds missing columns if table already exists
-- - Ensures unique constraint on test_code

BEGIN;

DO $do$
BEGIN
  -- 1) Create table only if missing
  IF to_regclass('public.medical_tests') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE public.medical_tests (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        test_name TEXT NOT NULL,
        test_code TEXT UNIQUE NOT NULL,
        body_system TEXT,
        customer_price DECIMAL(10,2) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $sql$;
  END IF;

  -- 2) If the table already exists, ensure required columns exist (safe adds)
  -- (These won't error if already present)
  IF to_regclass('public.medical_tests') IS NOT NULL THEN
    -- Make sure all expected columns exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='test_name'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN test_name TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='test_code'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN test_code TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='body_system'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN body_system TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='customer_price'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN customer_price DECIMAL(10,2)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='description'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN description TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='is_active'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN is_active BOOLEAN DEFAULT true';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_tests' AND column_name='updated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()';
    END IF;

    -- Ensure unique constraint exists on test_code (if table existed but constraint missing)
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'medical_tests_test_code_key'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_tests ADD CONSTRAINT medical_tests_test_code_key UNIQUE (test_code)';
    END IF;
  END IF;
END
$do$;

COMMIT;
