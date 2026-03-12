-- Fix critical bug: booking_items.item_id is UUID but medical_tests_import IDs are bigint/text
-- Changing item_id from UUID to TEXT to accommodate all ID formats:
--   - medical_tests_import: auto-generated bigint IDs (not UUIDs)
--   - packages: UUID IDs
--   - medical_tests: UUID IDs
-- TEXT safely stores all formats. Existing UUID values remain valid as TEXT.

ALTER TABLE public.booking_items ALTER COLUMN item_id TYPE TEXT USING item_id::TEXT;
