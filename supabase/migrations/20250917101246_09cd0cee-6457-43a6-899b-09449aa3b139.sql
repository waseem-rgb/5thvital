-- Add missing coupon_code column to bookings table
ALTER TABLE public.bookings ADD COLUMN coupon_code text;