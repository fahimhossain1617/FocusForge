-- =========================================================================
-- FOCENTIA ADMIN CONTROL CENTER: ONE-TIME MANUAL ADMIN BOOTSTRAP SCRIPT
-- =========================================================================
-- Target Admin Account: fahimhossain1617@gmail.com
--
-- STRICT SECURITY RULES:
-- 1. This file is executed manually by the project owner in the Supabase SQL Editor.
-- 2. It checks that the user exists in auth.users.
-- 3. It checks that email_confirmed_at IS NOT NULL (verified email required).
-- 4. If the user does NOT exist or is unverified, it inserts NOTHING and outputs a clear diagnostic notice.
-- 5. It registers the user with role 'owner' and full permissions in public.admin_users.
-- 6. This script is fully idempotent: running it multiple times safely updates timestamps.
-- =========================================================================

DO $$
DECLARE
    target_user RECORD;
BEGIN
    -- Step 1: Look up user in auth.users
    SELECT id, email, email_confirmed_at
    INTO target_user
    FROM auth.users
    WHERE LOWER(email) = 'fahimhossain1617@gmail.com';

    -- Check prerequisite 1: Account existence
    IF NOT FOUND THEN
        RAISE NOTICE '❌ ADMIN BOOTSTRAP ABORTED: User "fahimhossain1617@gmail.com" was not found in auth.users. Please sign up in the application first.';
        RETURN;
    END IF;

    -- Check prerequisite 2: Verified email
    IF target_user.email_confirmed_at IS NULL THEN
        RAISE NOTICE '❌ ADMIN BOOTSTRAP ABORTED: User "%" has not confirmed their email address yet (email_confirmed_at is NULL). Please verify email first.', target_user.email;
        RETURN;
    END IF;

    -- Step 2: Insert into public.admin_users safely
    INSERT INTO public.admin_users (
        user_id,
        email,
        role,
        permissions,
        is_suspended,
        created_at,
        updated_at
    ) VALUES (
        target_user.id,
        target_user.email,
        'owner',
        ARRAY['*']::text[],
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        role = 'owner',
        is_suspended = false,
        updated_at = NOW();

    RAISE NOTICE '✅ ADMIN BOOTSTRAP SUCCESSFUL: User % (UUID: %) is now registered as primary owner in admin_users.', target_user.email, target_user.id;
END $$;

-- =========================================================================
-- VERIFICATION QUERY (Run this immediately after to verify your admin role):
-- =========================================================================
SELECT 
    a.user_id,
    a.email,
    a.role,
    a.permissions,
    a.is_suspended,
    u.email_confirmed_at,
    a.created_at,
    public.is_admin() AS "current_session_is_admin"
FROM public.admin_users a
JOIN auth.users u ON u.id = a.user_id
WHERE a.email = 'fahimhossain1617@gmail.com';
