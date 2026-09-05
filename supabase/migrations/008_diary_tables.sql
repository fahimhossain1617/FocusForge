-- Migration 008: Diary Topics and Entries with Image Support

CREATE TABLE IF NOT EXISTS diary_topics (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diary_entries (
    id TEXT PRIMARY KEY,
    topic_id TEXT REFERENCES diary_topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE diary_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- Policies for diary_topics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_topics' AND policyname = 'Users can view their own diary topics') THEN
        CREATE POLICY "Users can view their own diary topics" ON diary_topics FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_topics' AND policyname = 'Users can insert their own diary topics') THEN
        CREATE POLICY "Users can insert their own diary topics" ON diary_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_topics' AND policyname = 'Users can update their own diary topics') THEN
        CREATE POLICY "Users can update their own diary topics" ON diary_topics FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_topics' AND policyname = 'Users can delete their own diary topics') THEN
        CREATE POLICY "Users can delete their own diary topics" ON diary_topics FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policies for diary_entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_entries' AND policyname = 'Users can view their own diary entries') THEN
        CREATE POLICY "Users can view their own diary entries" ON diary_entries FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_entries' AND policyname = 'Users can insert their own diary entries') THEN
        CREATE POLICY "Users can insert their own diary entries" ON diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_entries' AND policyname = 'Users can update their own diary entries') THEN
        CREATE POLICY "Users can update their own diary entries" ON diary_entries FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diary_entries' AND policyname = 'Users can delete their own diary entries') THEN
        CREATE POLICY "Users can delete their own diary entries" ON diary_entries FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
