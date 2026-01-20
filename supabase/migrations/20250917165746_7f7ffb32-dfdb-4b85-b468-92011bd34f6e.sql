-- Phase 1: Critical Security Fixes - Add user authentication and fix RLS policies

-- 1. Add user_id column to bookings table to link bookings to users
ALTER TABLE public.bookings 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop existing permissive RLS policies that expose sensitive data
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Anyone can view booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Anyone can create medical reports for analysis" ON public.medical_reports;
DROP POLICY IF EXISTS "Anyone can view medical reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Anyone can update medical reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Anyone can view report analyses" ON public.report_analyses;
DROP POLICY IF EXISTS "System can create report analyses" ON public.report_analyses;
DROP POLICY IF EXISTS "System can update report analyses" ON public.report_analyses;

-- 3. Implement secure user-based RLS policies for bookings
CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Create security definer function to check booking ownership for booking_items
CREATE OR REPLACE FUNCTION public.user_owns_booking(booking_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_uuid AND user_id = auth.uid()
  );
$$;

-- 5. Implement secure RLS policies for booking_items
CREATE POLICY "Users can create items for their own bookings" 
ON public.booking_items 
FOR INSERT 
WITH CHECK (public.user_owns_booking(booking_id));

CREATE POLICY "Users can view their own booking items" 
ON public.booking_items 
FOR SELECT 
USING (public.user_owns_booking(booking_id));

-- 6. Implement secure RLS policies for medical_reports
CREATE POLICY "Users can create their own medical reports" 
ON public.medical_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own medical reports" 
ON public.medical_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical reports" 
ON public.medical_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 7. Create security definer function to check report ownership for analyses
CREATE OR REPLACE FUNCTION public.user_owns_report(report_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medical_reports 
    WHERE id = report_uuid AND user_id = auth.uid()
  );
$$;

-- 8. Implement secure RLS policies for report_analyses
CREATE POLICY "Users can view analyses of their own reports" 
ON public.report_analyses 
FOR SELECT 
USING (public.user_owns_report(report_id));

CREATE POLICY "Service role can create report analyses" 
ON public.report_analyses 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR public.user_owns_report(report_id));

CREATE POLICY "Service role can update report analyses" 
ON public.report_analyses 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role' OR public.user_owns_report(report_id));