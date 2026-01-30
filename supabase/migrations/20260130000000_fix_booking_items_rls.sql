-- Fix booking_items RLS policies to properly support both authenticated and guest bookings
-- This migration ensures the correct policies are in place

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Drop all existing booking_items policies (clean slate)
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.booking_items') IS NOT NULL THEN
    -- Drop all known policy variants
    EXECUTE 'DROP POLICY IF EXISTS "Users can create items for their own bookings" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own booking items" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create booking items (auth or guest)" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view booking items (auth or guest)" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create booking items" ON public.booking_items';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view booking items" ON public.booking_items';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 2) Drop all existing bookings policies and recreate
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    -- Drop all known policy variants
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create bookings (auth or guest)" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their bookings" ON public.bookings';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 3) Create/replace the helper function for booking ownership check
--    This function supports BOTH authenticated users AND guest bookings
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owns_booking_or_guest(booking_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_uuid AND (
      -- Authenticated user owns this booking
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR
      -- Guest booking (user_id is null)
      (user_id IS NULL)
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- 4) Create new bookings policies that support both auth and guest
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE '
      CREATE POLICY "bookings_insert_policy"
      ON public.bookings
      FOR INSERT
      TO public
      WITH CHECK (
        -- Authenticated user: user_id must match auth.uid()
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR
        -- Guest booking: user_id is null with required fields
        (user_id IS NULL AND customer_phone IS NOT NULL AND customer_name IS NOT NULL)
      )
    ';

    EXECUTE '
      CREATE POLICY "bookings_select_policy"
      ON public.bookings
      FOR SELECT
      TO public
      USING (
        -- Authenticated user can view their own bookings
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR
        -- Guest bookings can be viewed (for order lookup)
        (user_id IS NULL)
      )
    ';

    EXECUTE '
      CREATE POLICY "bookings_update_policy"
      ON public.bookings
      FOR UPDATE
      TO public
      USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
      WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())
    ';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 5) Create new booking_items policies that support both auth and guest
-- -----------------------------------------------------------------------------
DO $do$
BEGIN
  IF to_regclass('public.booking_items') IS NOT NULL THEN
    EXECUTE '
      CREATE POLICY "booking_items_insert_policy"
      ON public.booking_items
      FOR INSERT
      TO public
      WITH CHECK (public.user_owns_booking_or_guest(booking_id))
    ';

    EXECUTE '
      CREATE POLICY "booking_items_select_policy"
      ON public.booking_items
      FOR SELECT
      TO public
      USING (public.user_owns_booking_or_guest(booking_id))
    ';
  END IF;
END
$do$;

COMMIT;
