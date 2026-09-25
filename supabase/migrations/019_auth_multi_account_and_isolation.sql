-- Migration: 019_auth_multi_account_and_isolation.sql
-- Description: Enforce strict user data isolation, RLS policies, and performance indexes across all FocusForge modules.

-- 1. user_cloud_state RLS and Policies
ALTER TABLE IF EXISTS public.user_cloud_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cloud state" ON public.user_cloud_state;
DROP POLICY IF EXISTS "Users can view their own cloud state" ON public.user_cloud_state;
DROP POLICY IF EXISTS "Users can insert their own cloud state" ON public.user_cloud_state;
DROP POLICY IF EXISTS "Users can update their own cloud state" ON public.user_cloud_state;
DROP POLICY IF EXISTS "Users can delete their own cloud state" ON public.user_cloud_state;

CREATE POLICY "Users can manage own cloud state"
    ON public.user_cloud_state
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Tasks Table RLS & Indexes
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks"
    ON public.tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_target_date ON public.tasks (user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks (user_id, status);

-- 3. Routine Templates RLS & Indexes
ALTER TABLE IF EXISTS public.routine_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own routine templates" ON public.routine_templates;
CREATE POLICY "Users can manage own routine templates"
    ON public.routine_templates
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_routine_templates_user_weekday ON public.routine_templates (user_id, weekday);

-- 4. Notes Table RLS & Indexes
ALTER TABLE IF EXISTS public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
CREATE POLICY "Users can manage own notes"
    ON public.notes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes (user_id, updated_at DESC);

-- 5. Mind Items Table RLS & Indexes
ALTER TABLE IF EXISTS public.mind_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own mind items" ON public.mind_items;
CREATE POLICY "Users can manage own mind items"
    ON public.mind_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mind_items_user_created ON public.mind_items (user_id, created_at DESC);

-- 6. Diary Topics & Entries Table RLS & Indexes
ALTER TABLE IF EXISTS public.diary_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own diary topics" ON public.diary_topics;
CREATE POLICY "Users can manage own diary topics"
    ON public.diary_topics
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own diary entries" ON public.diary_entries;
CREATE POLICY "Users can manage own diary entries"
    ON public.diary_entries
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diary_topics_user ON public.diary_topics (user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON public.diary_entries (user_id, topic_id);

-- 7. Focus Sessions Table RLS & Indexes
ALTER TABLE IF EXISTS public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage own focus sessions"
    ON public.focus_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON public.focus_sessions (user_id, started_at DESC);

-- 8. Learning Folders & Logs Table RLS & Indexes
ALTER TABLE IF EXISTS public.learning_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own learning folders" ON public.learning_folders;
CREATE POLICY "Users can manage own learning folders"
    ON public.learning_folders
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own learning logs" ON public.learning_logs;
CREATE POLICY "Users can manage own learning logs"
    ON public.learning_logs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_learning_folders_user ON public.learning_folders (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_user ON public.learning_logs (user_id, folder_id);

-- 9. AI Chat Sessions & Messages Table RLS & Indexes
ALTER TABLE IF EXISTS public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.ai_chat_sessions;
CREATE POLICY "Users can manage own chat sessions"
    ON public.ai_chat_sessions
    FOR ALL
    USING (user_id IS NULL OR auth.uid() = user_id)
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users can manage own chat messages"
    ON public.ai_chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = session_id
            AND (s.user_id IS NULL OR auth.uid() = s.user_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = session_id
            AND (s.user_id IS NULL OR auth.uid() = s.user_id)
        )
    );

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON public.ai_chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages (session_id, created_at ASC);
