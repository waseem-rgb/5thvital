-- Modify medical_tests table to match user's data structure
ALTER TABLE medical_tests 
ADD COLUMN IF NOT EXISTS profile_name text,
ALTER COLUMN report_delivered_in TYPE text;