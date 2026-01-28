-- Phase 1: Critical Security Fixes - Add user authentication and fix RLS policies
-- SAFETY: This migration is table-existence aware and avoids nested $$ quoting issues.

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Enable RLS safely (only if table exists)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY';
  END IF;

  IF to_regclass('public.booking_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY';
  END IF;

  IF to_regclass('public.medical_reports') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY';
  END IF;

  IF to_regclass('public.report_analyses') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.report_analyses ENABLE ROW LEVEL SECURITY';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 1) Add user_id column to bookings table + FK (safe)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    -- Add column if missing
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'bookings'
        AND column_name  = 'user_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.bookings ADD COLUMN user_id uuid';
    END IF;

    -- Add FK if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'bookings_user_id_fkey'
    ) THEN
      EXECUTE '
        ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
      ';
    END IF;
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 2) Drop existing permissive RLS policies (safe)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings';

    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings';
  END IF;

  IF to_regclass('public.booking_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create booking items" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view booking items" ON public.booking_items';

    EXECUTE 'DROP POLICY IF EXISTS "Users can create items for their own bookings" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own booking items" ON public.booking_items';
  END IF;

  IF to_regclass('public.medical_reports') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create medical reports for analysis" ON public.medical_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view medical reports" ON public.medical_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update medical reports" ON public.medical_reports';

    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own medical reports" ON public.medical_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own medical reports" ON public.medical_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own medical reports" ON public.medical_reports';
  END IF;

  IF to_regclass('public.report_analyses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view report analyses" ON public.report_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "System can create report analyses" ON public.report_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "System can update report analyses" ON public.report_analyses';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view analyses of their own reports" ON public.report_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can create report analyses" ON public.report_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update report analyses" ON public.report_analyses';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 3) Secure RLS policies for bookings (safe)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='bookings' AND column_name='user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "Users can create their own bookings"
        ON public.bookings
        FOR INSERT
        WITH CHECK (auth.uid() = user_id)
      ';

      EXECUTE '
        CREATE POLICY "Users can view their own bookings"
        ON public.bookings
        FOR SELECT
        USING (auth.uid() = user_id)
      ';

      EXECUTE '
        CREATE POLICY "Users can update their own bookings"
        ON public.bookings
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
      ';
    END IF;
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 4) Security definer function: user_owns_booking (create/update safe)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.user_owns_booking(booking_uuid uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.bookings
          WHERE id = booking_uuid
            AND user_id = auth.uid()
        );
      $body$;
    $func$;
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 5) Secure RLS policies for booking_items (safe)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.booking_items') IS NOT NULL THEN
    EXECUTE '
      CREATE POLICY "Users can create items for their own bookings"
      ON public.booking_items
      FOR INSERT
      WITH CHECK (public.user_owns_booking(booking_id))
    ';

    EXECUTE '
      CREATE POLICY "Users can view their own booking items"
      ON public.booking_items
      FOR SELECT
      USING (public.user_owns_booking(booking_id))
    ';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 6) Secure RLS policies for medical_reports (only if table exists)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.medical_reports') IS NOT NULL THEN
    -- Ensure user_id exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='medical_reports' AND column_name='user_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.medical_reports ADD COLUMN user_id uuid';
    END IF;

    -- Add FK if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'medical_reports_user_id_fkey'
    ) THEN
      EXECUTE '
        ALTER TABLE public.medical_reports
        ADD CONSTRAINT medical_reports_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
      ';
    END IF;

    EXECUTE '
      CREATE POLICY "Users can create their own medical reports"
      ON public.medical_reports
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)
    ';

    EXECUTE '
      CREATE POLICY "Users can view their own medical reports"
      ON public.medical_reports
      FOR SELECT
      USING (auth.uid() = user_id)
    ';

    EXECUTE '
      CREATE POLICY "Users can update their own medical reports"
      ON public.medical_reports
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    ';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 7) Security definer function: user_owns_report (only if medical_reports exists)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.medical_reports') IS NOT NULL THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.user_owns_report(report_uuid uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.medical_reports
          WHERE id = report_uuid
            AND user_id = auth.uid()
        );
      $body$;
    $func$;
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 8) Secure RLS policies for report_analyses (only if tables exist)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.report_analyses') IS NOT NULL THEN
    -- Only policies that depend on medical_reports if medical_reports exists
    IF to_regclass('public.medical_reports') IS NOT NULL THEN
      EXECUTE '
        CREATE POLICY "Users can view analyses of their own reports"
        ON public.report_analyses
        FOR SELECT
        USING (public.user_owns_report(report_id))
      ';

      EXECUTE '
        CREATE POLICY "Service role can create report analyses"
        ON public.report_analyses
        FOR INSERT
        WITH CHECK (
          (auth.jwt() ->> ''role'') = ''service_role''
          OR public.user_owns_report(report_id)
        )
      ';

      EXECUTE '
        CREATE POLICY "Service role can update report analyses"
        ON public.report_analyses
        FOR UPDATE
        USING (
          (auth.jwt() ->> ''role'') = ''service_role''
          OR public.user_owns_report(report_id)
        )
        WITH CHECK (
          (auth.jwt() ->> ''role'') = ''service_role''
          OR public.user_owns_report(report_id)
        )
      ';
    END IF;
  END IF;
END
$do$;

COMMIT;
