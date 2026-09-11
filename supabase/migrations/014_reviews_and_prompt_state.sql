-- Migration 014: FocusForge Smart User Review & Feedback System
-- Creates 'reviews' and 'review_prompt_state' tables with strict RLS policies.

-- 1. Reviews Table (Stores private user feedback for the app owner)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT review_has_content CHECK (rating IS NOT NULL OR (comment IS NOT NULL AND trim(comment) <> ''))
);

-- Index on user_id for high-efficiency lookups
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can insert their own review" ON reviews;
DROP POLICY IF EXISTS "Users can view their own review" ON reviews;

-- RLS Policy: Users can only insert their own review
CREATE POLICY "Users can insert their own review"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only view their own review (never other users')
CREATE POLICY "Users can view their own review"
    ON reviews FOR SELECT
    USING (auth.uid() = user_id);

-- Normal users CANNOT update or delete reviews
-- No UPDATE or DELETE policies are granted to authenticated users.


-- 2. Review Prompt State Table (Tracks user eligibility, actions, and skip cycles)
CREATE TABLE IF NOT EXISTS review_prompt_state (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    status TEXT CHECK (status IN ('eligible', 'skipped', 'submitted')) DEFAULT 'eligible',
    meaningful_actions INTEGER DEFAULT 0,
    skip_count INTEGER DEFAULT 0,
    last_shown_at TIMESTAMP WITH TIME ZONE,
    next_prompt_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE review_prompt_state ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own review prompt state" ON review_prompt_state;
DROP POLICY IF EXISTS "Users can insert their own review prompt state" ON review_prompt_state;
DROP POLICY IF EXISTS "Users can update their own review prompt state" ON review_prompt_state;

-- RLS Policy: Users can only view their own review prompt state
CREATE POLICY "Users can view their own review prompt state"
    ON review_prompt_state FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own review prompt state
CREATE POLICY "Users can insert their own review prompt state"
    ON review_prompt_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own review prompt state
CREATE POLICY "Users can update their own review prompt state"
    ON review_prompt_state FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
