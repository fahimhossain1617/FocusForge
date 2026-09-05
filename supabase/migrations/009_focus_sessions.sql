-- Migration 009: Focus Sessions Table with RLS
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    task_id BIGINT,
    task_name TEXT NOT NULL,
    category TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    target_minutes INTEGER NOT NULL DEFAULT 25,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    distractions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for focus_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can view their own focus sessions') THEN
        CREATE POLICY "Users can view their own focus sessions" ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can insert their own focus sessions') THEN
        CREATE POLICY "Users can insert their own focus sessions" ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can update their own focus sessions') THEN
        CREATE POLICY "Users can update their own focus sessions" ON focus_sessions FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can delete their own focus sessions') THEN
        CREATE POLICY "Users can delete their own focus sessions" ON focus_sessions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
