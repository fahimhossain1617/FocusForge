-- Migration: 022_cascade_deletes_and_pre_verification.sql
-- Description:
-- 1. Alter all foreign keys referencing auth.users to add ON DELETE CASCADE so user deletion works seamlessly.
-- 2. Create public.pending_signups table for storing pre-verification signup registrations without writing to auth.users.

-- 1. Profiles Table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Tasks Table
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Notes Table
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE public.notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. User Cloud State
ALTER TABLE public.user_cloud_state DROP CONSTRAINT IF EXISTS user_cloud_state_id_fkey;
ALTER TABLE public.user_cloud_state ADD CONSTRAINT user_cloud_state_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Mind Items Table
ALTER TABLE public.mind_items DROP CONSTRAINT IF EXISTS mind_items_user_id_fkey;
ALTER TABLE public.mind_items ADD CONSTRAINT mind_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Diary Topics Table
ALTER TABLE public.diary_topics DROP CONSTRAINT IF EXISTS diary_topics_user_id_fkey;
ALTER TABLE public.diary_topics ADD CONSTRAINT diary_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Diary Entries Table
ALTER TABLE public.diary_entries DROP CONSTRAINT IF EXISTS diary_entries_user_id_fkey;
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Focus Sessions Table
ALTER TABLE public.focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_user_id_fkey;
ALTER TABLE public.focus_sessions ADD CONSTRAINT focus_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. Routine Templates Table
ALTER TABLE public.routine_templates DROP CONSTRAINT IF EXISTS routine_templates_user_id_fkey;
ALTER TABLE public.routine_templates ADD CONSTRAINT routine_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. Pending Signups Table (Pre-Verification Storage)
CREATE TABLE IF NOT EXISTS public.pending_signups (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- Allow access for pending signup operations
DROP POLICY IF EXISTS "Allow pending_signups operations" ON public.pending_signups;
CREATE POLICY "Allow pending_signups operations"
    ON public.pending_signups FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure auto-confirm trigger stays dropped if somehow re-added
DROP TRIGGER IF EXISTS tr_auto_confirm_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_user();
