-- Migration: 018_fix_auth_and_profiles.sql
-- Description: Fix not-null column constraints on profiles, remove duplicate unique index, and create safe auth trigger with exception handler.

-- 1. Relax NOT NULL constraints on public.profiles columns and set sensible defaults
ALTER TABLE public.profiles ALTER COLUMN identifier DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN identifier SET DEFAULT '';

ALTER TABLE public.profiles ALTER COLUMN auth_method DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN auth_method SET DEFAULT 'email';

ALTER TABLE public.profiles ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT 'User';

-- 2. Drop problematic unique index on display_name if it exists and replace with non-unique index
DROP INDEX IF EXISTS idx_profiles_display_name_lower;
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower ON public.profiles (LOWER(TRIM(display_name))) WHERE display_name IS NOT NULL;

-- 3. Ensure RLS policies allow upsert and select
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4. Auto-confirm function with exception safety
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_confirm_new_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_new_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- Auto-confirm existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 5. Robust Profile Creation and Sync Trigger Function
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_display_name TEXT;
    v_full_name TEXT;
    v_provider TEXT;
    v_identifier TEXT;
    v_avatar TEXT;
BEGIN
    -- Extract identifier
    v_identifier := COALESCE(NEW.email, NEW.phone, 'user_' || SUBSTRING(NEW.id::text, 1, 8));

    -- Extract provider
    v_provider := COALESCE(
        NEW.raw_app_meta_data->>'provider',
        (NEW.raw_app_meta_data->'providers'->>0),
        CASE WHEN NEW.phone IS NOT NULL THEN 'phone' ELSE 'email' END
    );

    -- Extract full name and display name
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- Safe Upsert into public.profiles
    INSERT INTO public.profiles (
        id,
        identifier,
        auth_method,
        display_name,
        full_name,
        email,
        provider,
        avatar_url,
        theme,
        email_verified,
        created_at,
        updated_at,
        last_login_at
    )
    VALUES (
        NEW.id,
        v_identifier,
        v_provider,
        v_display_name,
        v_full_name,
        NEW.email,
        v_provider,
        v_avatar,
        'dark',
        (NEW.email_confirmed_at IS NOT NULL),
        COALESCE(NEW.created_at, NOW()),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        identifier = COALESCE(public.profiles.identifier, EXCLUDED.identifier),
        auth_method = COALESCE(EXCLUDED.auth_method, public.profiles.auth_method),
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, 'User'), public.profiles.display_name, EXCLUDED.display_name),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, 'User'), public.profiles.full_name, EXCLUDED.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        provider = COALESCE(EXCLUDED.provider, public.profiles.provider),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        email_verified = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW(),
        last_login_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_auth_user_sync notice: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
