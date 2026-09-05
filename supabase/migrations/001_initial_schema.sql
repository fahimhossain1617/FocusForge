-- Create initial schema mapping to frontend types

-- 1. Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    identifier TEXT NOT NULL,
    auth_method TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);


-- 2. Tasks
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    est_hours INTEGER DEFAULT 0,
    est_minutes INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')),
    category TEXT,
    notes TEXT,
    tier TEXT CHECK (tier IN ('now', 'next', 'later')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tasks"
    ON tasks FOR ALL
    USING (auth.uid() = user_id);


-- 3. Notes
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
    ON notes FOR ALL
    USING (auth.uid() = user_id);


-- 4. Note Blocks
CREATE TABLE note_blocks (
    id UUID PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT,
    is_completed BOOLEAN DEFAULT false,
    language TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE note_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage blocks for their notes"
    ON note_blocks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = note_blocks.note_id 
            AND notes.user_id = auth.uid()
        )
    );

-- (More tables: mind_items, diary_entries, time_blocks can be added iteratively)
