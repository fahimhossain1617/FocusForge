-- 023_notification_system_and_history.sql
-- Production-ready Notification System schema for FocusForge

-- 1. Extend user_notification_settings table with quiet hours, limits, and orb reactions
ALTER TABLE user_notification_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS orb_reactions_mode TEXT DEFAULT 'on',
  ADD COLUMN IF NOT EXISTS daily_limit INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS skill_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inactivity_reminders BOOLEAN DEFAULT true;

-- 2. User Notifications History Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    category TEXT NOT NULL DEFAULT 'system',
    template_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    orb_mood TEXT NOT NULL DEFAULT 'attentive',
    action_route TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    task_id BIGINT,
    skill_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(user_id, read);

-- 3. Notification Rotation State (Shuffle-bag per user & per category)
CREATE TABLE IF NOT EXISTS user_notification_rotation (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    bag JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_used_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_notif_rot_user ON user_notification_rotation(user_id);
