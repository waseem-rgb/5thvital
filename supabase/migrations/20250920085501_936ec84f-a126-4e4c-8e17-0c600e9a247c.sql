-- Create customer profiles table for voice agent memory
CREATE TABLE public.customer_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  customer_name text,
  customer_email text,
  preferred_time time without time zone,
  preferred_date_type text, -- 'weekday', 'weekend', 'any'
  address text,
  gender text,
  age integer,
  preferences jsonb DEFAULT '{}', -- Store customer preferences as JSON
  total_bookings integer DEFAULT 0,
  last_booking_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on customer profiles
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for customer profiles (public read for voice agent, service role can manage)
CREATE POLICY "Service role can manage customer profiles" 
ON public.customer_profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create voice bookings table to track all voice agent interactions
CREATE TABLE public.voice_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  customer_name text,
  conversation_id text, -- ElevenLabs conversation ID
  booking_status text NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  test_ids uuid[] DEFAULT '{}',
  test_names text[] DEFAULT '{}',
  total_amount numeric DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  final_amount numeric DEFAULT 0,
  preferred_date date,
  preferred_time time without time zone,
  confirmed_date date,
  confirmed_time time without time zone,
  calendar_event_id text,
  booking_id uuid, -- Reference to actual booking in bookings table
  sms_sent boolean DEFAULT false,
  sms_sent_at timestamp with time zone,
  agent_notes text,
  error_messages text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on voice bookings
ALTER TABLE public.voice_bookings ENABLE ROW LEVEL SECURITY;

-- Create policy for voice bookings
CREATE POLICY "Service role can manage voice bookings" 
ON public.voice_bookings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on customer_profiles
CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on voice_bookings
CREATE TRIGGER update_voice_bookings_updated_at
BEFORE UPDATE ON public.voice_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_customer_profiles_phone ON public.customer_profiles(phone);
CREATE INDEX idx_voice_bookings_phone ON public.voice_bookings(phone);
CREATE INDEX idx_voice_bookings_booking_id ON public.voice_bookings(booking_id);
CREATE INDEX idx_voice_bookings_status ON public.voice_bookings(booking_status);
CREATE INDEX idx_voice_bookings_created_at ON public.voice_bookings(created_at);