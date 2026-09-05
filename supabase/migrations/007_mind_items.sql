-- Migration 007: Mind Items (Thoughts / Problem Solver / Idea Capture)

CREATE TABLE IF NOT EXISTS mind_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'thought',
    source TEXT CHECK (source IN ('quick_capture', 'problem_solver', 'idea_capture', 'home')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE mind_items ENABLE ROW LEVEL SECURITY;

-- Policies for user access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mind_items' AND policyname = 'Users can view their own mind items'
    ) THEN
        CREATE POLICY "Users can view their own mind items"
            ON mind_items FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mind_items' AND policyname = 'Users can insert their own mind items'
    ) THEN
        CREATE POLICY "Users can insert their own mind items"
            ON mind_items FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mind_items' AND policyname = 'Users can update their own mind items'
    ) THEN
        CREATE POLICY "Users can update their own mind items"
            ON mind_items FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mind_items' AND policyname = 'Users can delete their own mind items'
    ) THEN
        CREATE POLICY "Users can delete their own mind items"
            ON mind_items FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;
