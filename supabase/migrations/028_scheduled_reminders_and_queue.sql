-- Migration: 028_scheduled_reminders_and_queue.sql
-- Description: Creates persistent scheduled_reminders table for backend cron Push notification delivery.
-- Supports idempotent sync from client, concurrency locks, priority scheduling, timezone offsets, and delivery auditing.

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    priority INTEGER NOT NULL DEFAULT 2,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_route TEXT DEFAULT 'today',
    target_time TIMESTAMPTZ NOT NULL,
    due_date TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    provider_status TEXT,
    task_id BIGINT,
    skill_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_reminders' AND policyname = 'Users can manage their own scheduled reminders'
  ) THEN
    CREATE POLICY "Users can manage their own scheduled reminders"
        ON public.scheduled_reminders
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- High-performance index for worker polling (finds all pending due reminders in microseconds)
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_pending_due 
    ON public.scheduled_reminders (status, target_time, priority ASC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_date 
    ON public.scheduled_reminders (user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_task 
    ON public.scheduled_reminders (user_id, task_id);
