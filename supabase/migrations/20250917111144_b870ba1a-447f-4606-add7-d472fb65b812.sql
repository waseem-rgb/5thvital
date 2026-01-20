-- Create a sequence for booking IDs starting from 1
CREATE SEQUENCE IF NOT EXISTS booking_id_sequence START 1;

-- Add a custom booking_id column to store the SNL format
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS custom_booking_id TEXT UNIQUE;

-- Create a function to generate the next booking ID in SNL format
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    formatted_id TEXT;
BEGIN
    -- Get the next value from the sequence
    SELECT nextval('booking_id_sequence') INTO next_id;
    
    -- Format it as SNL000001, SNL000002, etc.
    formatted_id := 'SNL' || LPAD(next_id::TEXT, 6, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically set the custom booking ID
CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if custom_booking_id is not already provided
    IF NEW.custom_booking_id IS NULL THEN
        NEW.custom_booking_id := generate_booking_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS set_booking_id_trigger ON public.bookings;
CREATE TRIGGER set_booking_id_trigger
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_id();