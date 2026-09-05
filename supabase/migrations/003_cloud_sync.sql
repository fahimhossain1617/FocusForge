-- Migration 003: Cloud Sync for Full App State

-- Create a table to store the entire JSON state for each user
CREATE TABLE IF NOT EXISTS user_cloud_state (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_cloud_state ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own state
CREATE POLICY "Users can view their own cloud state"
    ON user_cloud_state FOR SELECT
    USING (auth.uid() = id);

-- Allow users to insert their own state
CREATE POLICY "Users can insert their own cloud state"
    ON user_cloud_state FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own state
CREATE POLICY "Users can update their own cloud state"
    ON user_cloud_state FOR UPDATE
    USING (auth.uid() = id);
