-- Allow public access to view bookings and booking items for order confirmation
-- This enables customers to view their order details via the SMS link

-- Add policy to allow anyone to view bookings (needed for order details page)
CREATE POLICY "Anyone can view bookings" 
ON public.bookings 
FOR SELECT 
USING (true);

-- Add policy to allow anyone to view booking items (needed for order details page)
CREATE POLICY "Anyone can view booking items" 
ON public.booking_items 
FOR SELECT 
USING (true);