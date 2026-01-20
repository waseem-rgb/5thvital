-- Fix handle_new_user to run with proper privileges and use metadata phone
-- and ensure trigger exists on auth.users

-- 1) Create or replace function with SECURITY DEFINER and correct phone extraction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile for the new auth user
  -- Phone is stored in raw_user_meta_data as 'phone'
  INSERT INTO public.profiles (user_id, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL)
  )
  ON CONFLICT DO NOTHING; -- avoid errors if profile already created elsewhere

  RETURN NEW;
END;
$$;

-- 2) Ensure trigger is present and points to the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Note: SECURITY DEFINER ensures the function can insert into public.profiles
-- even when called from the auth schema. The ON CONFLICT prevents duplicate errors
-- if another flow inserted the profile already.
