-- Migration 030: Protect AI Token Quota Columns on Profiles & Enforce NOT NULL on ai_tokens_reset_at
-- Immutability Rule: Does not alter migrations 001 through 029.

-- =========================================================================
-- PART 1: SECURE AI TOKEN COLUMNS FROM CLIENT / POSTGREST TAMPERING
-- =========================================================================

-- 1.1 Revoke table-level UPDATE on profiles for anon and authenticated roles
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

-- 1.2 Explicitly grant column-level UPDATE only on user-editable fields
GRANT UPDATE (
  display_name,
  full_name,
  phone,
  date_of_birth,
  gender,
  country,
  city,
  bio,
  avatar_url,
  preferred_language,
  preferred_theme,
  onboarding_completed,
  updated_at
) ON public.profiles TO authenticated;

-- 1.3 Add strict defense-in-depth trigger to forbid client updates to token columns
CREATE OR REPLACE FUNCTION public.protect_profile_token_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if executed in client context (PostgREST / Supabase API)
  IF (CURRENT_USER IN ('anon', 'authenticated') OR NULLIF(current_setting('request.jwt.claim.sub', true), '') IS NOT NULL) THEN
    IF (
      NEW.ai_tokens_total IS DISTINCT FROM OLD.ai_tokens_total OR
      NEW.ai_tokens_used IS DISTINCT FROM OLD.ai_tokens_used OR
      NEW.ai_tokens_reset_at IS DISTINCT FROM OLD.ai_tokens_reset_at
    ) THEN
      RAISE EXCEPTION 'Modifying AI token allocation or reset schedule directly via client API is strictly forbidden.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_token_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_token_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_token_columns();

-- =========================================================================
-- PART 2: ENSURE ai_tokens_reset_at HAS NOT NULL DEFAULT
-- =========================================================================

-- 2.1 Backfill any NULL reset timestamps
UPDATE public.profiles
SET ai_tokens_reset_at = NOW() + INTERVAL '24 hours'
WHERE ai_tokens_reset_at IS NULL;

-- 2.2 Enforce default on new inserts
ALTER TABLE public.profiles
  ALTER COLUMN ai_tokens_reset_at SET DEFAULT (NOW() + INTERVAL '24 hours');

-- 2.3 Set NOT NULL constraint
ALTER TABLE public.profiles
  ALTER COLUMN ai_tokens_reset_at SET NOT NULL;
