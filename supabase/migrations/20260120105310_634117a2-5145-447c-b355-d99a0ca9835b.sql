-- Create otp_verifications table (idempotent / safe)
-- Safe to re-run:
-- - Creates table only if missing
-- - Adds missing columns if table already exists

BEGIN;

DO $do$
BEGIN
  -- 1) Create table only if missing
  IF to_regclass('public.otp_verifications') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE public.otp_verifications (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        phone TEXT NOT NULL,
        otp TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $sql$;
  END IF;

  -- 2) Ensure expected columns exist (safe adds)
  IF to_regclass('public.otp_verifications') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='otp_verifications' AND column_name='phone'
    ) THEN
      EXECUTE 'ALTER TABLE public.otp_verifications ADD COLUMN phone TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='otp_verifications' AND column_name='otp'
    ) THEN
      EXECUTE 'ALTER TABLE public.otp_verifications ADD COLUMN otp TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='otp_verifications' AND column_name='verified'
    ) THEN
      EXECUTE 'ALTER TABLE public.otp_verifications ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='otp_verifications' AND column_name='expires_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.otp_verifications ADD COLUMN expires_at TIMESTAMPTZ';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='otp_verifications' AND column_name='created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.otp_verifications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()';
    END IF;
  END IF;
END
$do$;

COMMIT;
