-- Add calendar integration fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN calendar_event_id TEXT,
ADD COLUMN collection_scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN collection_status TEXT DEFAULT 'pending';

-- Add check constraint for collection status
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_collection_status_check 
CHECK (collection_status IN ('pending', 'scheduled', 'confirmed', 'collected', 'cancelled'));