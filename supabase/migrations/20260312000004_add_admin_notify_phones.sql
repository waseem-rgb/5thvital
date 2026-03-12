-- Settings table already exists (from supabase_admin_setup_v1.sql)
-- key TEXT PRIMARY KEY, value JSONB

-- Insert admin notification phone numbers
-- value is stored as JSONB, so we wrap in quotes for string values
INSERT INTO public.settings (key, value)
VALUES
  ('admin_notify_phone', '"+918689070763"'::jsonb),
  ('admin_notify_phone_2', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
