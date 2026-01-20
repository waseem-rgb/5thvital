-- Fix security warnings by setting proper search_path for functions

-- Update the generate_booking_id function with proper security settings
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the set_booking_id trigger function with proper security settings
CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if custom_booking_id is not already provided
    IF NEW.custom_booking_id IS NULL THEN
        NEW.custom_booking_id := generate_booking_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;