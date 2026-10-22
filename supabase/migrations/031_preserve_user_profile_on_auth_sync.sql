-- Migration 031: Preserve User Profile on Auth Sync and Prevent Reverting
-- Immutability Rule: Does not alter migrations 001 through 030.

-- Update handle_auth_user_sync to NEVER overwrite existing user profile edits (display_name, full_name, avatar_url)
-- with auth metadata when the user signs in or refreshes session.
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

    -- Extract full name and display name fallbacks for new users
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
    -- CRITICAL FIX: On conflict, prioritize existing values in public.profiles!
    -- Only use EXCLUDED values if public.profiles currently has NULL or empty values.
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
        identifier = COALESCE(NULLIF(public.profiles.identifier, ''), EXCLUDED.identifier),
        auth_method = COALESCE(NULLIF(public.profiles.auth_method, ''), EXCLUDED.auth_method),
        display_name = COALESCE(NULLIF(NULLIF(public.profiles.display_name, ''), 'User'), NULLIF(EXCLUDED.display_name, 'User'), public.profiles.display_name, EXCLUDED.display_name),
        full_name = COALESCE(NULLIF(NULLIF(public.profiles.full_name, ''), 'User'), NULLIF(EXCLUDED.full_name, 'User'), public.profiles.full_name, EXCLUDED.full_name),
        email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
        provider = COALESCE(NULLIF(public.profiles.provider, ''), EXCLUDED.provider),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        email_verified = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW(),
        last_login_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_auth_user_sync notice: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
