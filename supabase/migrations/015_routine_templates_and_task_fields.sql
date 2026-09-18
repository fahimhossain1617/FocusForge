-- Migration 015: Routine Templates and Enhanced Task Fields
-- Ensures routine templates and planner routine tasks are 100% saved in Supabase

-- 1. Routine Templates Table
CREATE TABLE IF NOT EXISTS public.routine_templates (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    weekday TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint per user per weekday
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'routine_templates_user_weekday_key'
    ) THEN
        ALTER TABLE public.routine_templates 
        ADD CONSTRAINT routine_templates_user_weekday_key UNIQUE (user_id, weekday);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;

-- Policies for routine_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can view their own routine templates'
    ) THEN
        CREATE POLICY "Users can view their own routine templates"
            ON public.routine_templates FOR SELECT
            USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can insert their own routine templates'
    ) THEN
        CREATE POLICY "Users can insert their own routine templates"
            ON public.routine_templates FOR INSERT
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can update their own routine templates'
    ) THEN
        CREATE POLICY "Users can update their own routine templates"
            ON public.routine_templates FOR UPDATE
            USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'routine_templates' AND policyname = 'Users can delete their own routine templates'
    ) THEN
        CREATE POLICY "Users can delete their own routine templates"
            ON public.routine_templates FOR DELETE
            USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
END $$;

-- 2. Enhanced Fields for Tasks Table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
