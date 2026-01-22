-- Add missing columns to medical_tests table
ALTER TABLE public.medical_tests 
ADD COLUMN IF NOT EXISTS report_delivered_in text,
ADD COLUMN IF NOT EXISTS sample_type text,
ADD COLUMN IF NOT EXISTS synonyms text[],
ADD COLUMN IF NOT EXISTS profile_name text;