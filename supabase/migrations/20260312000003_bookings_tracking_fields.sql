-- Add tracking fields to bookings for order status tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS report_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phlebotomist_id UUID;

-- Phlebotomists table for assigned collection agents
CREATE TABLE IF NOT EXISTS public.phlebotomists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.phlebotomists ENABLE ROW LEVEL SECURITY;

-- Public can read phlebotomist info (name/phone) for their booking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'phlebotomists'
        AND policyname = 'phlebotomists_public_select'
    ) THEN
        CREATE POLICY phlebotomists_public_select ON public.phlebotomists
            FOR SELECT
            USING (true);
    END IF;
END$$;

-- Enable realtime for bookings table (skip if already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
END$$;
