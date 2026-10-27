-- Migration 033: Focentia Admin Control Center, Telemetry, and Operational Health
-- Immutability Rule: Does not alter migrations 001 through 032.
-- All operations are additive, idempotent (IF NOT EXISTS), non-breaking, and RLS-secured.

-- =========================================================================
-- PART 1: EXTENSIONS & SECURITY DEFINER FUNCTION
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: admin_users (Primary Admin Authorization Table)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'owner',
    permissions TEXT[] NOT NULL DEFAULT ARRAY['*']::text[],
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin Security Function: is_admin()
-- Verifies auth.uid() against admin_users with search_path protection.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE user_id = auth.uid() 
          AND is_suspended = false
    );
END;
$$;

-- Trigger: Prevent Primary Owner from Being Suspended
CREATE OR REPLACE FUNCTION public.prevent_owner_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.role = 'owner' OR OLD.email = 'fahimhossain1617@gmail.com') AND NEW.is_suspended = true THEN
        RAISE EXCEPTION 'Database security constraint: Primary owner account cannot be suspended.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_owner_suspension ON public.admin_users;
CREATE TRIGGER trg_prevent_owner_suspension
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_owner_suspension();


-- =========================================================================
-- PART 2: USER SUSPENSIONS (SERVER-ENFORCED ACCOUNT RESTRICTION)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_suspensions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    suspended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    restored_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'suspended',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Prevent Admin User Suspension in user_suspensions
CREATE OR REPLACE FUNCTION public.prevent_admin_user_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = NEW.user_id AND (role = 'owner' OR email = 'fahimhossain1617@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Database security rule: Cannot suspend primary admin account.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_user_suspension ON public.user_suspensions;
CREATE TRIGGER trg_prevent_admin_user_suspension
    BEFORE INSERT OR UPDATE ON public.user_suspensions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_admin_user_suspension();


-- =========================================================================
-- PART 3: AUDIT LOG (APPEND-ONLY IMMUTABLE LOG)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_id TEXT,
    outcome TEXT NOT NULL DEFAULT 'success',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-Only Security Trigger: Prevent UPDATE and DELETE
CREATE OR REPLACE FUNCTION public.enforce_audit_log_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is strictly append-only. Modification and deletion are prohibited by database security policy.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON public.audit_log;
CREATE TRIGGER trg_audit_log_append_only
    BEFORE UPDATE OR DELETE ON public.audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_log_append_only();


-- =========================================================================
-- PART 4: SECURITY & ABUSE EVENTS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    resource TEXT NOT NULL,
    sanitized_context TEXT NOT NULL,
    detection_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'detected',
    notes TEXT,
    account_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 5: FEATURE FLAGS / KILL SWITCHES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    enabled BOOLEAN GENERATED ALWAYS AS (is_enabled) STORED,
    rollout_percentage INTEGER NOT NULL DEFAULT 100,
    updated_by TEXT NOT NULL DEFAULT 'system_default',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Core Feature Flags
INSERT INTO public.feature_flags (key, name, description, is_enabled, rollout_percentage, updated_by, updated_at)
VALUES 
    ('glory_ai', 'Glory AI Assistant', 'Master toggle for intelligent AI chat, problem solving, and task breakdown.', true, 100, 'system_seed', NOW()),
    ('voice_dictation', 'Voice Dictation & Transcription', 'Speech-to-text recording in My Mind and Diary.', true, 100, 'system_seed', NOW()),
    ('file_export', 'Data & Document Export', 'User-facing PDF, JSON, and markdown export operations.', true, 100, 'system_seed', NOW()),
    ('telemetry_collection', 'Client Telemetry Collection', 'Anonymous performance, web vitals, and bug report aggregation.', true, 100, 'system_seed', NOW())
ON CONFLICT (key) DO NOTHING;


-- =========================================================================
-- PART 6: TELEMETRY EVENTS & FEATURE USAGE AGGREGATES
-- =========================================================================

-- Raw Bounded Telemetry Events (Trimmable after retention window)
CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    feature TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_identity TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated Daily Feature Usage (Long retention)
CREATE TABLE IF NOT EXISTS public.feature_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    feature TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'user',
    event_count INTEGER NOT NULL DEFAULT 0,
    unique_actors_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feature_usage_daily UNIQUE (date, feature, actor_type)
);


-- =========================================================================
-- PART 7: SESSIONS & GUEST LIFECYCLE AGGREGATES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_guest BOOLEAN NOT NULL DEFAULT true,
    anon_or_user_type TEXT GENERATED ALWAYS AS (CASE WHEN is_guest THEN 'guest' ELSE 'user' END) STORED,
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    platform TEXT NOT NULL DEFAULT 'web',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.guest_daily (
    date DATE PRIMARY KEY,
    guest_sessions_count INTEGER NOT NULL DEFAULT 0,
    guest_sessions INTEGER GENERATED ALWAYS AS (guest_sessions_count) STORED,
    guest_visits_count INTEGER NOT NULL DEFAULT 0,
    guest_visits INTEGER GENERATED ALWAYS AS (guest_visits_count) STORED,
    anonymous_visits_count INTEGER NOT NULL DEFAULT 0,
    anonymous_id_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_activity (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    last_server_contact_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 8: FEEDBACK SUBMISSIONS, STATUS HISTORY & NOTES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL DEFAULT 'in_app',
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER,
    user_type TEXT NOT NULL DEFAULT 'authenticated',
    user_name TEXT NOT NULL DEFAULT 'User',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    is_guest BOOLEAN NOT NULL DEFAULT false,
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    technical_context JSONB DEFAULT '{}'::jsonb,
    context JSONB GENERATED ALWAYS AS (technical_context) STORED,
    status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 9: ISSUES, FINGERPRINTS & OCCURRENCES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    error_name TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'client_error',
    sanitized_stack TEXT,
    route TEXT NOT NULL DEFAULT '/',
    feature TEXT NOT NULL DEFAULT 'general',
    platform TEXT NOT NULL DEFAULT 'web',
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'new',
    occurrences_count INTEGER NOT NULL DEFAULT 1,
    occurrence_count INTEGER GENERATED ALWAYS AS (occurrences_count) STORED,
    affected_sessions INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen TIMESTAMPTZ GENERATED ALWAYS AS (first_seen_at) STORED,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ GENERATED ALWAYS AS (last_seen_at) STORED,
    first_version TEXT NOT NULL DEFAULT '0.1.0',
    last_version TEXT NOT NULL DEFAULT '0.1.0',
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    fixed_in_version TEXT,
    is_regression BOOLEAN NOT NULL DEFAULT false,
    hypothesis_notes TEXT,
    confirmed_root_cause TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.issue_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    sanitized_breadcrumbs JSONB DEFAULT '[]'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    route TEXT NOT NULL DEFAULT '/',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 10: PERFORMANCE METRICS & WEB VITALS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.perf_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric TEXT NOT NULL,
    observed_value NUMERIC NOT NULL,
    rating TEXT NOT NULL,
    route TEXT NOT NULL DEFAULT '/',
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    platform TEXT NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.perf_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    metric TEXT NOT NULL,
    route TEXT NOT NULL DEFAULT '/',
    app_version TEXT NOT NULL DEFAULT '0.1.0',
    platform TEXT NOT NULL DEFAULT 'web',
    sample_count INTEGER NOT NULL DEFAULT 0,
    avg_value NUMERIC NOT NULL DEFAULT 0,
    p75_value NUMERIC NOT NULL DEFAULT 0,
    p95_value NUMERIC NOT NULL DEFAULT 0,
    rating TEXT NOT NULL DEFAULT 'good',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_perf_daily UNIQUE (date, metric, route, app_version, platform)
);


-- =========================================================================
-- PART 11: SYNC RECORDS & HEALTH METRICS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    details TEXT,
    error_category TEXT NOT NULL DEFAULT 'network',
    user_identity TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_health_daily (
    date DATE PRIMARY KEY,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    conflicts_count INTEGER NOT NULL DEFAULT 0,
    avg_queue_size NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 12: OPERATIONAL ALERTS & RULES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedupe_key TEXT NOT NULL DEFAULT encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    occurrences INTEGER NOT NULL DEFAULT 1,
    count INTEGER GENERATED ALWAYS AS (occurrences) STORED,
    status TEXT NOT NULL DEFAULT 'investigating',
    action_link TEXT,
    link_target TEXT GENERATED ALWAYS AS (action_link) STORED,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen TIMESTAMPTZ GENERATED ALWAYS AS (first_seen_at) STORED,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ GENERATED ALWAYS AS (last_seen_at) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alerts_title UNIQUE (title),
    CONSTRAINT uq_alerts_dedupe UNIQUE (dedupe_key)
);

CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    metric TEXT NOT NULL,
    threshold_value NUMERIC NOT NULL,
    time_window_minutes INTEGER NOT NULL DEFAULT 60,
    severity TEXT NOT NULL DEFAULT 'high',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 13: RELEASES & ADMIN SEEN STATE
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.releases (
    version TEXT PRIMARY KEY,
    build_id TEXT,
    deployment_id TEXT,
    commit_sha TEXT NOT NULL,
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_release_seen (
    id INTEGER PRIMARY KEY DEFAULT 1,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen_version TEXT NOT NULL DEFAULT '0.1.0',
    last_seen_release TEXT GENERATED ALWAYS AS (last_seen_version) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 14: AI USAGE, QUOTAS & PRICING CONFIG
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_id TEXT,
    model TEXT NOT NULL DEFAULT 'smart',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    handler TEXT NOT NULL DEFAULT 'gemini',
    handled_by TEXT GENERATED ALWAYS AS (handler) STORED,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
    date DATE PRIMARY KEY,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    rate_limited_count INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    quota_total INTEGER NOT NULL DEFAULT 5000,
    used INTEGER NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'daily',
    reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    adjusted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_config (
    model TEXT PRIMARY KEY,
    cost_per_1k_input_tokens NUMERIC(10, 6) NOT NULL DEFAULT 0.00015,
    cost_per_1k_output_tokens NUMERIC(10, 6) NOT NULL DEFAULT 0.00060,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_pricing_config (model, cost_per_1k_input_tokens, cost_per_1k_output_tokens, description, updated_at)
VALUES 
    ('gemini-3.5-flash-lite', 0.000075, 0.000300, 'Gemini 3.5 Flash Lite default standard cost', NOW()),
    ('gemini-2.5-flash', 0.000150, 0.000600, 'Gemini 2.5 Flash standard tier cost', NOW()),
    ('gemini-2.5-pro', 0.001250, 0.005000, 'Gemini 2.5 Pro planning tier cost', NOW())
ON CONFLICT (model) DO NOTHING;


-- =========================================================================
-- PART 15: PRIVACY REQUESTS (GDPR EXPORT / ACCOUNT DELETION)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    request_type TEXT NOT NULL,
    type TEXT GENERATED ALWAYS AS (request_type) STORED,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 16: TELEMETRY INGESTION HEALTH
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.telemetry_ingest_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_successful_ingest_at TIMESTAMPTZ,
    ingested_count_delta INTEGER NOT NULL DEFAULT 0,
    error_count_delta INTEGER NOT NULL DEFAULT 0,
    monitoring_errors JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- PART 17: APP SETTINGS & OPERATIONAL CONFIG
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value, description, updated_at)
VALUES 
    ('raw_event_retention_days', '30'::jsonb, 'Number of days to keep raw telemetry and perf events before cleanup', NOW()),
    ('security_event_retention_days', '90'::jsonb, 'Retention duration for security anomalies and abuse logs', NOW()),
    ('web_vitals_lcp_threshold_ms', '2500'::jsonb, 'Threshold in ms for Largest Contentful Paint budget breach', NOW()),
    ('web_vitals_cls_threshold', '0.1'::jsonb, 'Threshold for Cumulative Layout Shift budget breach', NOW()),
    ('web_vitals_inp_threshold_ms', '200'::jsonb, 'Threshold in ms for Interaction to Next Paint budget breach', NOW()),
    ('reliable_data_collection_started_at', '"2026-10-27T18:00:00Z"'::jsonb, 'Timestamp when reliable telemetry collection was officially initialized', NOW())
ON CONFLICT (key) DO NOTHING;


-- =========================================================================
-- PART 18: MAINTENANCE & RETENTION STORED PROCEDURE
-- =========================================================================

CREATE OR REPLACE FUNCTION public.run_maintenance_retention_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    raw_days INTEGER := 30;
    sec_days INTEGER := 90;
    deleted_telemetry INTEGER := 0;
    deleted_perf INTEGER := 0;
    deleted_sec INTEGER := 0;
    settings_val JSONB;
BEGIN
    SELECT value INTO settings_val FROM public.app_settings WHERE key = 'raw_event_retention_days';
    IF settings_val IS NOT NULL THEN
        raw_days := (settings_val #>> '{}')::INTEGER;
    END IF;

    SELECT value INTO settings_val FROM public.app_settings WHERE key = 'security_event_retention_days';
    IF settings_val IS NOT NULL THEN
        sec_days := (settings_val #>> '{}')::INTEGER;
    END IF;

    -- 1. Delete raw telemetry events older than retention window
    WITH del AS (
        DELETE FROM public.telemetry_events 
        WHERE created_at < NOW() - (raw_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_telemetry FROM del;

    -- 2. Delete raw performance records older than retention window
    WITH del AS (
        DELETE FROM public.perf_events 
        WHERE created_at < NOW() - (raw_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_perf FROM del;

    -- 3. Delete security events older than security retention window
    WITH del AS (
        DELETE FROM public.security_events 
        WHERE created_at < NOW() - (sec_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_sec FROM del;

    -- 4. Bound issue_occurrences: prune older occurrences if an issue has more than 100 samples
    DELETE FROM public.issue_occurrences io
    WHERE io.id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY issue_id ORDER BY occurred_at DESC) as rn
            FROM public.issue_occurrences
        ) ranked
        WHERE ranked.rn > 100
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_telemetry_events', deleted_telemetry,
        'deleted_perf_events', deleted_perf,
        'deleted_security_events', deleted_sec,
        'cleaned_at', NOW()
    );
END;
$$;


-- =========================================================================
-- PART 19: UPDATABLE INTEROPERABILITY VIEWS (MAPPING PART 2 REPOSITORY NAMES)
-- =========================================================================

CREATE OR REPLACE VIEW public.admin_audit_logs AS SELECT * FROM public.audit_log;
CREATE OR REPLACE VIEW public.admin_security_events AS SELECT * FROM public.security_events;
CREATE OR REPLACE VIEW public.admin_feature_flags AS SELECT * FROM public.feature_flags;
CREATE OR REPLACE VIEW public.admin_feature_events AS SELECT * FROM public.telemetry_events;
CREATE OR REPLACE VIEW public.admin_issues AS SELECT * FROM public.issues;
CREATE OR REPLACE VIEW public.admin_performance_records AS SELECT * FROM public.perf_events;
CREATE OR REPLACE VIEW public.admin_guest_daily_aggregates AS SELECT * FROM public.guest_daily;
CREATE OR REPLACE VIEW public.admin_sync_records AS SELECT * FROM public.sync_events;
CREATE OR REPLACE VIEW public.admin_feedback AS SELECT * FROM public.feedback_submissions;
CREATE OR REPLACE VIEW public.admin_alerts AS SELECT * FROM public.alerts;
CREATE OR REPLACE VIEW public.admin_ai_usage_records AS SELECT * FROM public.ai_usage_events;
CREATE OR REPLACE VIEW public.admin_monitoring_health AS SELECT * FROM public.telemetry_ingest_health;
CREATE OR REPLACE VIEW public.admin_privacy_requests AS SELECT * FROM public.privacy_requests;


-- =========================================================================
-- PART 20: HIGH-FREQUENCY INDEXES
-- =========================================================================

-- Admin Users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);

-- User Suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON public.user_suspensions(is_active) WHERE is_active = true;

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Security Events
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_category ON public.security_events(category);

-- Telemetry Events
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created ON public.telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_feature ON public.telemetry_events(feature, created_at DESC);

-- Issues
CREATE INDEX IF NOT EXISTS idx_issues_fingerprint ON public.issues(fingerprint);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status, severity);
CREATE INDEX IF NOT EXISTS idx_issues_last_seen ON public.issues(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_occurrences ON public.issues(occurrences_count DESC);

-- Performance Events
CREATE INDEX IF NOT EXISTS idx_perf_events_metric_created ON public.perf_events(metric, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_events_route ON public.perf_events(route);

-- Sync Events
CREATE INDEX IF NOT EXISTS idx_sync_events_created ON public.sync_events(created_at DESC);

-- Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON public.feedback_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback_submissions(category);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status_last_seen ON public.alerts(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_dedupe ON public.alerts(dedupe_key);

-- AI Usage Events
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status ON public.ai_usage_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_events(user_id, created_at DESC);

-- Privacy Requests
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON public.privacy_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON public.privacy_requests(user_id);


-- =========================================================================
-- PART 21: ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perf_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perf_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_health_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_release_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_ingest_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Revoke default access from anon & public
REVOKE ALL ON public.admin_users FROM anon, public;
REVOKE ALL ON public.user_suspensions FROM anon, public;
REVOKE ALL ON public.audit_log FROM anon, public;
REVOKE ALL ON public.security_events FROM anon, public;
REVOKE ALL ON public.telemetry_events FROM anon, public;
REVOKE ALL ON public.feature_usage_daily FROM anon, public;
REVOKE ALL ON public.guest_daily FROM anon, public;
REVOKE ALL ON public.feedback_submissions FROM anon, public;
REVOKE ALL ON public.feedback_status_history FROM anon, public;
REVOKE ALL ON public.feedback_notes FROM anon, public;
REVOKE ALL ON public.issues FROM anon, public;
REVOKE ALL ON public.issue_occurrences FROM anon, public;
REVOKE ALL ON public.perf_events FROM anon, public;
REVOKE ALL ON public.perf_daily FROM anon, public;
REVOKE ALL ON public.sync_events FROM anon, public;
REVOKE ALL ON public.sync_health_daily FROM anon, public;
REVOKE ALL ON public.alerts FROM anon, public;
REVOKE ALL ON public.alert_rules FROM anon, public;
REVOKE ALL ON public.admin_release_seen FROM anon, public;
REVOKE ALL ON public.ai_usage_events FROM anon, public;
REVOKE ALL ON public.ai_usage_daily FROM anon, public;
REVOKE ALL ON public.user_quotas FROM anon, public;
REVOKE ALL ON public.ai_pricing_config FROM anon, public;
REVOKE ALL ON public.privacy_requests FROM anon, public;
REVOKE ALL ON public.telemetry_ingest_health FROM anon, public;
REVOKE ALL ON public.app_settings FROM anon, public;

-- Grant service_role full control
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 1. admin_users: Admin can read only
DROP POLICY IF EXISTS "Admin users can view admin_users" ON public.admin_users;
CREATE POLICY "Admin users can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 2. feature_flags: Public can read enabled flags, admin can update
DROP POLICY IF EXISTS "Public can view active feature flags" ON public.feature_flags;
CREATE POLICY "Public can view active feature flags"
    ON public.feature_flags FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can update feature flags" ON public.feature_flags;
CREATE POLICY "Admin can update feature flags"
    ON public.feature_flags FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. releases: Public can read release metadata
DROP POLICY IF EXISTS "Anyone can view release notes" ON public.releases;
CREATE POLICY "Anyone can view release notes"
    ON public.releases FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. feedback_submissions: Users can insert feedback and view own
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback_submissions;
CREATE POLICY "Authenticated users can submit feedback"
    ON public.feedback_submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view own feedback submissions" ON public.feedback_submissions;
CREATE POLICY "Users can view own feedback submissions"
    ON public.feedback_submissions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 5. privacy_requests: Users can insert and read own requests
DROP POLICY IF EXISTS "Users can create privacy request" ON public.privacy_requests;
CREATE POLICY "Users can create privacy request"
    ON public.privacy_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own privacy requests" ON public.privacy_requests;
CREATE POLICY "Users can view own privacy requests"
    ON public.privacy_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 6. user_quotas: Users can read own quota
DROP POLICY IF EXISTS "Users can view own AI quota" ON public.user_quotas;
CREATE POLICY "Users can view own AI quota"
    ON public.user_quotas FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 7. Admin read policies across operational tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'user_suspensions', 'audit_log', 'security_events', 'telemetry_events', 
        'feature_usage_daily', 'sessions', 'guest_daily', 'user_activity', 
        'feedback_status_history', 'feedback_notes', 'issues', 'issue_occurrences', 
        'perf_events', 'perf_daily', 'sync_events', 'sync_health_daily', 
        'alerts', 'alert_rules', 'admin_release_seen', 'ai_usage_events', 
        'ai_usage_daily', 'ai_pricing_config', 'telemetry_ingest_health', 'app_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin can view %I" ON public.%I;', tbl, tbl);
        EXECUTE format('
            CREATE POLICY "Admin can view %I"
            ON public.%I FOR SELECT
            TO authenticated
            USING (public.is_admin());
        ', tbl, tbl);
    END LOOP;
END $$;
