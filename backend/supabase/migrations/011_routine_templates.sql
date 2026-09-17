-- Migration 011: Routine Templates & Task Routine Attribution

-- 1. Create routine_templates table
CREATE TABLE IF NOT EXISTS routine_templates (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    weekday TEXT NOT NULL CHECK (weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    title TEXT,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, weekday)
);

-- Enable Row Level Security
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for routine_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can view their own routine templates') THEN
        CREATE POLICY "Users can view their own routine templates" ON routine_templates FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can insert their own routine templates') THEN
        CREATE POLICY "Users can insert their own routine templates" ON routine_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can update their own routine templates') THEN
        CREATE POLICY "Users can update their own routine templates" ON routine_templates FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can delete their own routine templates') THEN
        CREATE POLICY "Users can delete their own routine templates" ON routine_templates FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Extend tasks table with routine tracking columns if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'source_type') THEN
        ALTER TABLE tasks ADD COLUMN source_type TEXT DEFAULT 'custom';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'source_routine_id') THEN
        ALTER TABLE tasks ADD COLUMN source_routine_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'source_routine_task_id') THEN
        ALTER TABLE tasks ADD COLUMN source_routine_task_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'imported_at') THEN
        ALTER TABLE tasks ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
