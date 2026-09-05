-- Migration: 010_learning_hub.sql
-- Description: Create learning_folders and learning_logs tables for Skill Builder / Learning Hub

-- 1. Create learning_folders table
CREATE TABLE IF NOT EXISTS public.learning_folders (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create learning_logs table
CREATE TABLE IF NOT EXISTS public.learning_logs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL REFERENCES public.learning_folders(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    watch_minutes INTEGER NOT NULL DEFAULT 0,
    practice_minutes INTEGER NOT NULL DEFAULT 0,
    practice_details TEXT NOT NULL DEFAULT '',
    topics TEXT NOT NULL DEFAULT '',
    blockers TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_learning_folders_user_id ON public.learning_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_folders_created_at ON public.learning_folders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_logs_user_id ON public.learning_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_folder_id ON public.learning_logs(folder_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_date ON public.learning_logs(date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.learning_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

-- 5. Policies for learning_folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'learning_folders' 
        AND policyname = 'Users can manage their own learning folders'
    ) THEN
        CREATE POLICY "Users can manage their own learning folders"
            ON public.learning_folders
            FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Policies for learning_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'learning_logs' 
        AND policyname = 'Users can manage their own learning logs'
    ) THEN
        CREATE POLICY "Users can manage their own learning logs"
            ON public.learning_logs
            FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
