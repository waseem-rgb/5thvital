-- Clear all existing medical tests data
DELETE FROM public.medical_tests;

-- Reset the sequence/auto-increment if needed (though we're using UUIDs, so this might not be necessary)
-- This ensures a clean slate for your new CSV data