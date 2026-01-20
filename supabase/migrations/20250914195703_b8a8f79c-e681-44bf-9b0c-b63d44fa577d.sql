-- Add missing discount columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN discount_percentage numeric NOT NULL DEFAULT 0,
ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN final_amount numeric NOT NULL DEFAULT 0;

-- Backfill final_amount to equal total_amount for existing rows
UPDATE public.bookings 
SET final_amount = total_amount 
WHERE final_amount = 0;