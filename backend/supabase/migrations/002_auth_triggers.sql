-- Create a trigger to automatically create a user profile when a new user signs up in Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_identifier TEXT;
  v_auth_method TEXT;
  v_display_name TEXT;
BEGIN
  -- Determine identifier (email or phone)
  IF new.email IS NOT NULL THEN
    v_identifier := new.email;
    v_auth_method := 'email';
  ELSIF new.phone IS NOT NULL THEN
    v_identifier := new.phone;
    v_auth_method := 'phone';
  ELSE
    v_identifier := 'unknown';
    v_auth_method := 'unknown';
  END IF;

  -- Determine display name (metadata display_name OR prefix of email OR phone)
  IF new.raw_user_meta_data->>'display_name' IS NOT NULL THEN
    v_display_name := new.raw_user_meta_data->>'display_name';
  ELSIF new.email IS NOT NULL THEN
    v_display_name := SPLIT_PART(new.email, '@', 1);
  ELSIF new.phone IS NOT NULL THEN
    v_display_name := new.phone;
  ELSE
    v_display_name := 'User';
  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (id, identifier, auth_method, display_name)
  VALUES (
    new.id,
    v_identifier,
    v_auth_method,
    v_display_name
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
