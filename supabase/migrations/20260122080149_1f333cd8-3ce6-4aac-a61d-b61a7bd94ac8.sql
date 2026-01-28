-- Safe migration: add discount_percentage to public.bookings only if missing

BEGIN;

DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'discount_percentage'
    ) THEN
      EXECUTE 'ALTER TABLE public.bookings
               ADD COLUMN discount_percentage integer DEFAULT 0';
    END IF;
  END IF;
END
$do$;

COMMIT;
