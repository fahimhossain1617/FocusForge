-- Migration: 024_pending_password_resets.sql
-- Description: Create public.pending_password_resets table for storing 6-digit OTP verification codes during password reset.

CREATE TABLE IF NOT EXISTS public.pending_password_resets (
    email TEXT PRIMARY KEY,
    new_password_hash TEXT,
    otp_code TEXT NOT NULL,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_password_resets ENABLE ROW LEVEL SECURITY;

-- Allow access for pending password reset operations
DROP POLICY IF EXISTS "Allow pending_password_resets operations" ON public.pending_password_resets;
CREATE POLICY "Allow pending_password_resets operations"
    ON public.pending_password_resets FOR ALL
    USING (true)
    WITH CHECK (true);
