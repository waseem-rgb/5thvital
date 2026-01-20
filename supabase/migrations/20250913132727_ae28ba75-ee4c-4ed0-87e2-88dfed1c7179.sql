-- Fix the medical_tests table schema to allow NULL values where appropriate
ALTER TABLE public.medical_tests 
ALTER COLUMN body_system DROP NOT NULL;

-- Also ensure description can be NULL (it already should be)
-- And make sure other optional fields are properly nullable
ALTER TABLE public.medical_tests 
ALTER COLUMN description DROP NOT NULL;

-- Update the report_delivered_in to allow NULL as well since CSV might not have this data
ALTER TABLE public.medical_tests 
ALTER COLUMN report_delivered_in DROP NOT NULL;