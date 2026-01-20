-- Allow guest bookings by modifying RLS policies
-- First, update bookings table RLS policies to allow guest bookings

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can create items for their own bookings" ON public.booking_items;
DROP POLICY IF EXISTS "Users can view their own booking items" ON public.booking_items;

-- Create new policies that support both authenticated users and guest bookings
-- For bookings table
CREATE POLICY "Users can create bookings (auth or guest)" 
ON public.bookings 
FOR INSERT 
TO public
WITH CHECK (
  -- Allow if user is authenticated and user_id matches auth.uid()
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Allow guest bookings where user_id is null and we have required guest fields
  (user_id IS NULL AND customer_phone IS NOT NULL AND customer_name IS NOT NULL)
);

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
TO public
USING (
  -- Authenticated users can view their own bookings
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Allow viewing of guest bookings (for now - can be restricted later)
  (user_id IS NULL)
);

CREATE POLICY "Users can update their bookings" 
ON public.bookings 
FOR UPDATE 
TO public
USING (
  -- Only authenticated users can update their own bookings
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  -- Guest bookings cannot be updated directly
);

-- For booking_items table - create helper function first
CREATE OR REPLACE FUNCTION public.user_owns_booking_or_guest(booking_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_uuid AND (
      (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
      (user_id IS NULL)
    )
  );
$$;

CREATE POLICY "Users can create booking items (auth or guest)" 
ON public.booking_items 
FOR INSERT 
TO public
WITH CHECK (user_owns_booking_or_guest(booking_id));

CREATE POLICY "Users can view booking items (auth or guest)" 
ON public.booking_items 
FOR SELECT 
TO public
USING (user_owns_booking_or_guest(booking_id));

-- Add index for better performance on guest bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guest_lookup ON public.bookings (customer_phone, customer_name) 
WHERE user_id IS NULL;