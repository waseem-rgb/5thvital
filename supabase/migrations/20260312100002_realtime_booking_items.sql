-- Enable realtime for booking_items table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'booking_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_items;
    END IF;
END$$;
