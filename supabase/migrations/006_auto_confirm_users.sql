-- Migration 006: Auto-confirm new user emails to allow seamless direct login
-- This eliminates the missing OTP / email confirmation barrier for users

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_confirm_new_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_new_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_user();

-- Ensure any existing unconfirmed users are marked confirmed
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
