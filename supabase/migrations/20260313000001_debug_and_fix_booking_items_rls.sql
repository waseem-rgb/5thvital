-- Debug: List current RLS policies on booking_items
-- Then fix: Drop all existing policies and create simple, working ones

-- Step 1: Drop ALL existing booking_items policies (nuclear cleanup)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'booking_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.booking_items', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END$$;

-- Step 2: Drop the helper function that was causing issues
-- (It runs in SECURITY DEFINER context which may interfere with auth.uid())
DROP FUNCTION IF EXISTS public.user_owns_booking_or_guest(uuid);

-- Step 3: Create simple, direct RLS policies that WORK

-- INSERT: Allow any authenticated user to insert booking items
-- The booking_id foreign key constraint ensures the booking exists
CREATE POLICY "booking_items_insert_authenticated"
ON public.booking_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = booking_id
        AND user_id = auth.uid()
    )
);

-- INSERT: Allow anon/guest to insert for guest bookings (user_id IS NULL)
CREATE POLICY "booking_items_insert_guest"
ON public.booking_items
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = booking_id
        AND user_id IS NULL
    )
);

-- SELECT: Authenticated users can view their own booking items
CREATE POLICY "booking_items_select_authenticated"
ON public.booking_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = booking_id
        AND user_id = auth.uid()
    )
);

-- SELECT: Anon can view guest booking items
CREATE POLICY "booking_items_select_guest"
ON public.booking_items
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = booking_id
        AND user_id IS NULL
    )
);

-- Also fix bookings policies — drop all and recreate cleanly
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', pol.policyname);
        RAISE NOTICE 'Dropped bookings policy: %', pol.policyname;
    END LOOP;
END$$;

-- Bookings INSERT: authenticated users set user_id = auth.uid()
CREATE POLICY "bookings_insert_auth"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Bookings INSERT: guests (no user_id)
CREATE POLICY "bookings_insert_guest"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND customer_phone IS NOT NULL AND customer_name IS NOT NULL);

-- Bookings SELECT: authenticated users see own bookings
CREATE POLICY "bookings_select_auth"
ON public.bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Bookings SELECT: guests see guest bookings
CREATE POLICY "bookings_select_guest"
ON public.bookings
FOR SELECT
TO anon
USING (user_id IS NULL);

-- Bookings UPDATE: authenticated users update own bookings
CREATE POLICY "bookings_update_auth"
ON public.bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role always bypasses RLS, so admin operations work automatically
