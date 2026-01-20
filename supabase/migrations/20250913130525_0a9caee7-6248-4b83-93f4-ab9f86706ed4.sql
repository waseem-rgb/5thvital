-- Fix the is_active column in medical_tests table
UPDATE public.medical_tests SET is_active = true WHERE is_active IS NULL;

-- Set default value for is_active column
ALTER TABLE public.medical_tests ALTER COLUMN is_active SET DEFAULT true;

-- Make is_active column NOT NULL
ALTER TABLE public.medical_tests ALTER COLUMN is_active SET NOT NULL;