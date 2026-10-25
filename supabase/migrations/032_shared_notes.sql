-- Migration 032: Shared Notes & Folder Links
-- Allows users to share complete notes/folders as read-only public links.
-- Recipients can view the shared note in the app without editing permissions.

CREATE TABLE IF NOT EXISTS public.shared_notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT DEFAULT 'Personal',
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Public can read shared notes by ID
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shared notes" ON public.shared_notes;
CREATE POLICY "Anyone can view shared notes"
    ON public.shared_notes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert shared notes" ON public.shared_notes;
CREATE POLICY "Anyone can insert shared notes"
    ON public.shared_notes FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shared_notes_created ON public.shared_notes (created_at DESC);
