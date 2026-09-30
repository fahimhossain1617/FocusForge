-- Migration 021: E2EE Sync Architecture & Personal Data Cleanup
-- Purpose:
-- 1. Create encrypted_sync_records table for zero-knowledge end-to-end encrypted sync relay.
-- 2. Drop obsolete plaintext personal data tables (data is now local-first in IndexedDB).
-- 3. Retain auth.users, profiles, user_roles, support tickets, and system tokens.

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
    salt TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    client_updated_at TIMESTAMPTZ NOT NULL,
    server_synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_store_record UNIQUE (user_id, store_name, record_id)
);

-- Enable RLS
ALTER TABLE public.encrypted_sync_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only select, insert, update, or delete their own encrypted sync chunks
CREATE POLICY "Users can manage own encrypted sync records"
    ON public.encrypted_sync_records
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

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
-- NOTE: The following tables are PRESERVED for auth, profiles, & support:
-- - auth.users (Supabase authentication)
-- - public.profiles (Display name, avatar, account created date)
-- - public.user_roles (Role-based access)
-- - public.ai_tokens (Rate limits & usage quota)
-- - public.support_tickets (Anonymized customer support)
-- - public.user_notification_settings (System notification preferences)
-- - public.push_subscriptions (Web push tokens)
-- ====================================================================
