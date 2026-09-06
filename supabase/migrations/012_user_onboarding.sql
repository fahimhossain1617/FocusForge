-- Migration 012: User Onboarding and Preferences
-- Adds persistent onboarding state tracking to the profiles table.

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS preferred_theme TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS account_mode TEXT DEFAULT 'authenticated',
  ADD COLUMN IF NOT EXISTS product_tour_completed BOOLEAN DEFAULT FALSE;

-- Safe default for existing users: mark already registered active users as completed
UPDATE profiles 
SET 
  onboarding_completed = TRUE,
  product_tour_completed = TRUE,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
