-- Migration 020: Diary and Focus Enhancements
-- Adds category, theme, is_bookmarked to diary_topics and break_minutes to focus_sessions

ALTER TABLE public.diary_topics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.diary_topics ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.diary_topics ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT false;

ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
