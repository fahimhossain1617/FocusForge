-- Migration 029: Harden Row Level Security (RLS) & Add Missing High-Frequency Indexes
-- Immutability Rule: Does not alter migrations 001 through 028.

-- =========================================================================
-- PART 1: SECURE RLS POLICIES (ELIMINATE CROSS-TENANT & POSTGREST LEAKS)
-- =========================================================================

-- 1.1. Pending Signups: Revoke public PostgREST exposure and drop open USING (true) policy
ALTER TABLE IF EXISTS public.pending_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow pending_signups operations" ON public.pending_signups;
REVOKE ALL ON public.pending_signups FROM anon, authenticated;
GRANT ALL ON public.pending_signups TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pending_signups' AND policyname = 'Restrict pending_signups to service role'
  ) THEN
    CREATE POLICY "Restrict pending_signups to service role"
      ON public.pending_signups
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 1.2. Pending Password Resets: Revoke public PostgREST exposure and drop open USING (true) policy
ALTER TABLE IF EXISTS public.pending_password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow pending_password_resets operations" ON public.pending_password_resets;
REVOKE ALL ON public.pending_password_resets FROM anon, authenticated;
GRANT ALL ON public.pending_password_resets TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pending_password_resets' AND policyname = 'Restrict pending_password_resets to service role'
  ) THEN
    CREATE POLICY "Restrict pending_password_resets to service role"
      ON public.pending_password_resets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 1.3. User Notifications: Enable RLS and restrict users to their own notifications
ALTER TABLE IF EXISTS public.user_notifications ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can manage own notifications'
  ) THEN
    CREATE POLICY "Users can manage own notifications"
      ON public.user_notifications
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 1.4. User Notification Rotation: Enable RLS and restrict users to their own shuffle bag
ALTER TABLE IF EXISTS public.user_notification_rotation ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notification_rotation' AND policyname = 'Users can manage own notification rotation'
  ) THEN
    CREATE POLICY "Users can manage own notification rotation"
      ON public.user_notification_rotation
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 1.5. User Roles: Enable RLS so users can only read their own role assignments
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles"
      ON public.user_roles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 1.6. User Notification Settings: Enable RLS
ALTER TABLE IF EXISTS public.user_notification_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notification_settings' AND policyname = 'Users can manage own notification settings'
  ) THEN
    CREATE POLICY "Users can manage own notification settings"
      ON public.user_notification_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 1.7. Support Tickets: Users can read own tickets and supervisors can view all; authenticated insert restricted to own user_id
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users can view own tickets'
  ) THEN
    CREATE POLICY "Users can view own tickets"
      ON public.support_tickets
      FOR SELECT
      USING (
        auth.uid() = user_id 
        OR EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('supervisor', 'admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users can create tickets'
  ) THEN
    CREATE POLICY "Users can create tickets"
      ON public.support_tickets
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 1.8. Ticket Replies: Users can view replies on tickets they own or supervisors can view all
ALTER TABLE IF EXISTS public.ticket_replies ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_replies' AND policyname = 'Users can view ticket replies'
  ) THEN
    CREATE POLICY "Users can view ticket replies"
      ON public.ticket_replies
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.support_tickets 
          WHERE support_tickets.id = ticket_replies.ticket_id 
            AND (
              support_tickets.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_roles.user_id = auth.uid() 
                  AND user_roles.role IN ('supervisor', 'admin')
              )
            )
        )
      );
  END IF;
END $$;

-- 1.9. Sent Notifications Log: Enable RLS (Users can only SELECT their own logs)
ALTER TABLE IF EXISTS public.sent_notifications_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sent_notifications_log' AND policyname = 'Users can view own sent notification logs'
  ) THEN
    CREATE POLICY "Users can view own sent notification logs"
      ON public.sent_notifications_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 1.10. Supervisor Audit Logs: Enable RLS and restrict strictly to supervisors/admins
ALTER TABLE IF EXISTS public.supervisor_audit_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supervisor_audit_logs' AND policyname = 'Supervisors can view audit logs'
  ) THEN
    CREATE POLICY "Supervisors can view audit logs"
      ON public.supervisor_audit_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('supervisor', 'admin')
        )
      );
  END IF;
END $$;


-- =========================================================================
-- PART 2: MISSING HIGH-FREQUENCY INDEXES
-- =========================================================================

-- Case-insensitive email lookups during signup & verification
CREATE INDEX IF NOT EXISTS idx_pending_signups_email_lower 
  ON public.pending_signups (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_pending_signups_expires 
  ON public.pending_signups (expires_at);

-- Case-insensitive email lookups during password reset
CREATE INDEX IF NOT EXISTS idx_pending_password_resets_email_lower 
  ON public.pending_password_resets (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_pending_password_resets_expires 
  ON public.pending_password_resets (expires_at);

-- High-efficiency compound index for encrypted sync pull by store and updated timestamp
CREATE INDEX IF NOT EXISTS idx_encrypted_sync_user_store_updated 
  ON public.encrypted_sync_records (user_id, store_name, client_updated_at DESC);

-- Compound role lookup for supervisor RBAC checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON public.user_roles (user_id, role);

-- Push subscription lookup ordered by recency
CREATE INDEX IF NOT EXISTS idx_push_subs_user_created 
  ON public.push_subscriptions (user_id, created_at DESC);

-- Ordered thread replies fetching
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_created 
  ON public.ticket_replies (ticket_id, created_at ASC);

-- Idempotent notification duplicate prevention
CREATE INDEX IF NOT EXISTS idx_sent_notif_log_user_idempotency 
  ON public.sent_notifications_log (user_id, idempotency_key);

-- Filtered index for fast unread notifications queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
  ON public.user_notifications (user_id, created_at DESC) 
  WHERE read = false;
