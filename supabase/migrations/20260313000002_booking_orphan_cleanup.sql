-- Cleanup function for orphaned bookings (bookings with no booking_items)
-- This runs periodically or can be called manually from admin panel
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_bookings()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
    DELETE FROM public.bookings
    WHERE id NOT IN (SELECT DISTINCT booking_id FROM public.booking_items)
    AND created_at < now() - interval '10 minutes'
    AND status = 'pending';
$$;

-- Grant execute to service_role only (admin use)
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_bookings TO service_role;
