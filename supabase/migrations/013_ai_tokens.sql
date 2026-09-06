-- Migration 013: AI 5000 Token Quota & Reset Schedule
-- Adds fixed 5,000 token quota per user with automatic reset schedule tracking

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS ai_tokens_total INT DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS ai_tokens_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_tokens_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');

-- Set defaults for all existing user profiles
UPDATE profiles
SET 
  ai_tokens_total = COALESCE(ai_tokens_total, 5000),
  ai_tokens_used = COALESCE(ai_tokens_used, 0),
  ai_tokens_reset_at = COALESCE(ai_tokens_reset_at, NOW() + INTERVAL '24 hours')
WHERE ai_tokens_total IS NULL OR ai_tokens_reset_at IS NULL;
