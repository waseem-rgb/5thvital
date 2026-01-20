-- Fix function search path security issue using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add custom_booking_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS custom_booking_id TEXT UNIQUE;

-- Create sequence for booking IDs
CREATE SEQUENCE IF NOT EXISTS booking_id_sequence START 1000;

-- Create function to generate custom booking ID
CREATE OR REPLACE FUNCTION generate_custom_booking_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
  custom_id TEXT;
BEGIN
  next_id := nextval('booking_id_sequence');
  custom_id := 'PL' || LPAD(next_id::TEXT, 6, '0');
  RETURN custom_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to auto-generate custom_booking_id
CREATE OR REPLACE FUNCTION set_custom_booking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_booking_id IS NULL THEN
    NEW.custom_booking_id := generate_custom_booking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_bookings_custom_id ON public.bookings;

-- Create trigger to auto-generate custom_booking_id
CREATE TRIGGER set_bookings_custom_id
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION set_custom_booking_id();