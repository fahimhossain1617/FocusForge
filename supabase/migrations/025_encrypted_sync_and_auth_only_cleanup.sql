-- Migration: 025_encrypted_sync_and_auth_only_cleanup.sql
-- Description: Implement Auth-Only Supabase architecture & Zero-Knowledge E2EE Sync Relay.
-- Removes obsolete plaintext personal data tables (now strictly stored local-first in client IndexedDB).
-- Preserves auth.users, profiles, user_roles, support tickets, and system tokens.

-- ====================================================================
-- STEP 1: ZERO-KNOWLEDGE ENCRYPTED SYNC RELAY TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.encrypted_sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    device_id TEXT NOT NULL DEFAULT 'unknown',
    client_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    server_synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_store_record UNIQUE (user_id, store_name, record_id)
);

-- Enable RLS
ALTER TABLE public.encrypted_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'encrypted_sync_records' AND policyname = 'Users can manage own encrypted sync records'
  ) THEN
    CREATE POLICY "Users can manage own encrypted sync records"
        ON public.encrypted_sync_records
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Performance indices for sync queries
CREATE INDEX IF NOT EXISTS idx_encrypted_sync_user_server_synced 
    ON public.encrypted_sync_records (user_id, server_synced_at);

CREATE INDEX IF NOT EXISTS idx_encrypted_sync_user_store 
    ON public.encrypted_sync_records (user_id, store_name);

-- ====================================================================
-- STEP 2: REMOVE OBSOLETE PLAINTEXT PERSONAL CONTENT TABLES
-- All user tasks, notes, diaries, mind maps, focus logs, and AI chats
-- are now strictly stored local-first in client IndexedDB and synced
-- only via encrypted_sync_records using client-side AES-256-GCM.
-- Note: All existing rows have been safely exported to backups/pre_cleanup_audit/
-- ====================================================================

-- 1. AI Chat History
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;

-- 2. Personal Learning Hub
DROP TABLE IF EXISTS public.learning_logs CASCADE;
DROP TABLE IF EXISTS public.learning_folders CASCADE;

-- 3. Personal Diary & Reflections
DROP TABLE IF EXISTS public.diary_entries CASCADE;
DROP TABLE IF EXISTS public.diary_topics CASCADE;

-- 4. Focus Sessions & Distractions
DROP TABLE IF EXISTS public.distraction_entries CASCADE;
DROP TABLE IF EXISTS public.focus_sessions CASCADE;

-- 5. Mind Items / Brain Dump
DROP TABLE IF EXISTS public.mind_items CASCADE;

-- 6. Notes & Attachments
DROP TABLE IF EXISTS public.note_attachments CASCADE;
DROP TABLE IF EXISTS public.note_blocks CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;

-- 7. Tasks & Routine Templates
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.routine_templates CASCADE;

-- 8. Obsolete Unencrypted Cloud Sync State
DROP TABLE IF EXISTS public.user_cloud_state CASCADE;

-- ====================================================================
-- VERIFIED PRESERVED TABLES (Auth, Identity, Security & Support Only):
-- - auth.users (Supabase authentication)
-- - public.profiles (Display name, avatar, account created date, preferences)
-- - public.user_roles (Role-based access control)
-- - public.pending_signups (Pre-verification OTP signup staging)
-- - public.pending_password_resets (Password reset OTP verification)
-- - public.support_tickets (Customer support tickets)
-- - public.ticket_replies (Support conversation threads)
-- - public.supervisor_audit_logs (Supervisor action audit trail)
-- - public.user_notification_settings (Notification configuration)
-- - public.push_subscriptions (Web push subscription keys)
-- - public.review_prompt_state (In-app review prompt state)
-- - public.reviews (User feedback submissions)
-- - public.encrypted_sync_records (Zero-knowledge encrypted sync relay)
-- ====================================================================
