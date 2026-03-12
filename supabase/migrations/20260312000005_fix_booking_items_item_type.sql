-- Fix booking_items item_type CHECK constraint to allow 'package' type
-- Previously only 'test' and 'profile' were allowed, causing inserts to fail
-- when a health package was in the cart.

-- Drop the old constraint and add the expanded one
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_item_type_check;
ALTER TABLE public.booking_items ADD CONSTRAINT booking_items_item_type_check
  CHECK (item_type IN ('test', 'profile', 'package'));
