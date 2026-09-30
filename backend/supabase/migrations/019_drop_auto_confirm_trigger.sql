-- Migration 019: Drop auto-confirm trigger so users must verify via email OTP
DROP TRIGGER IF EXISTS tr_auto_confirm_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_user();
