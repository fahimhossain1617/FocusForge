/**
 * FocusForge / Focentia Centralized Notification Scheduler Service
 *
 * Implements high-reliability background push notification delivery:
 * 1. Concurrency Control: Atomic locks with `FOR UPDATE SKIP LOCKED`.
 * 2. Strict Priority Order:
 *    - Priority 1: Todo Task Scheduled Start (highest, urgent, requireInteraction)
 *    - Priority 2: Todo Task Pre-Reminder (5 minutes before start)
 *    - Priority 3: Time Log / Skill Practice Reminders
 *    - Priority 4: Motivational Focus Reminders
 *    - Priority 5: Diary / Reflection / Glory AI Companion
 * 3. Timezone-Aware Quiet Hours & Daily Limits.
 * 4. Anti-Clustering Spacing (min 60m cooldown between non-urgent nudges).
 * 5. Overdue / Stale Reminder Catch-up & Expiration Policy.
 * 6. Web Push Delivery via RFC 8291/8292 with FCM / Mozilla Push Service.
 * 7. Automatic purging of 410/404 expired push subscriptions.
 */

import { pool, dbClaimDueScheduledReminders, dbUpdateScheduledReminderStatus, dbSaveNotification } from './db';
import { sendWebPushToUser, WebPushPayload } from './webPushService';

// In-memory cache for recent user send timestamps to enforce anti-clustering cooldowns
const userLastSentMap = new Map<string, number>();

export interface SchedulerCycleResult {
  evaluatedCount: number;
  dispatchedCount: number;
  suppressedCount: number;
  expiredCount: number;
  failedCount: number;
  timestamp: string;
}

/**
 * Checks if current time is within user's Quiet Hours in their specific timezone
 */
export function isUserInQuietHours(
  quietHoursStart: string = '22:00',
  quietHoursEnd: string = '07:00',
  timezone: string = 'UTC',
  date: Date = new Date()
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let hour = 0;
    let minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    const currentMinutes = (hour % 24) * 60 + minute;

    const [sH, sM] = quietHoursStart.split(':').map(Number);
    const [eH, eM] = quietHoursEnd.split(':').map(Number);
    const startMinutes = (sH || 0) * 60 + (sM || 0);
    const endMinutes = (eH || 0) * 60 + (eM || 0);

    if (startMinutes > endMinutes) {
      // Spans midnight, e.g. 22:00 -> 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Get current date string (YYYY-MM-DD) for a specific timezone
 */
export function getUserLocalDateString(timezone: string = 'UTC', date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Execute a single batch cycle of due scheduled reminders
 */
export async function runNotificationSchedulerCycle(): Promise<SchedulerCycleResult> {
  const result: SchedulerCycleResult = {
    evaluatedCount: 0,
    dispatchedCount: 0,
    suppressedCount: 0,
    expiredCount: 0,
    failedCount: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Claim up to 50 due reminders with database concurrency lock (SKIP LOCKED)
    const claimedRows = await dbClaimDueScheduledReminders(50);
    if (!claimedRows || claimedRows.length === 0) {
      return result;
    }

    result.evaluatedCount = claimedRows.length;
    const now = new Date();

    for (const reminder of claimedRows) {
      const {
        id,
        user_id: userId,
        category,
        priority,
        title,
        body,
        action_route: actionRoute,
        target_time: targetTimeRaw,
        timezone = 'UTC',
        task_id: taskId,
        skill_id: skillId,
        metadata,
        attempt_count: attemptCount,
      } = reminder;

      const targetTime = new Date(targetTimeRaw);
      const isTaskReminder = category.startsWith('task') || Boolean(taskId) || priority === 1;
      const isUrgent = priority === 1 || category === 'task_start' || category === 'task_pre_reminder';

      // 2. Fetch user notification preferences
      const userSettingsRes = await pool.query(
        `SELECT * FROM user_notification_settings WHERE user_id = $1`,
        [userId]
      );
      const settings = userSettingsRes.rows[0] || {};
      const pushEnabled = settings.push_enabled ?? true;

      // If push is completely disabled for this user
      if (!pushEnabled) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'user_push_disabled');
        result.suppressedCount++;
        continue;
      }

      // Check category-specific opt-outs
      if (category.startsWith('task') && settings.task_reminders === false) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'category_disabled');
        result.suppressedCount++;
        continue;
      }
      if (category === 'focus_reminder' && settings.focus_reminders === false) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'category_disabled');
        result.suppressedCount++;
        continue;
      }
      if (category === 'skill_reminder' && settings.skill_reminders === false) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'category_disabled');
        result.suppressedCount++;
        continue;
      }
      if ((category === 'inactivity' || category === 'ai_companion') && settings.inactivity_reminders === false) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'category_disabled');
        result.suppressedCount++;
        continue;
      }

      // 3. Stale / Overdue Policy Check
      const ageMinutes = (now.getTime() - targetTime.getTime()) / (60 * 1000);

      // If non-task reminder is older than 30 minutes, expire it
      if (!isTaskReminder && ageMinutes > 30) {
        await dbUpdateScheduledReminderStatus(id, 'expired', `stale_${Math.round(ageMinutes)}m`);
        result.expiredCount++;
        continue;
      }

      // If todo pre-reminder is older than 15 minutes, expire it
      if (category === 'task_pre_reminder' && ageMinutes > 15) {
        await dbUpdateScheduledReminderStatus(id, 'expired', `pre_reminder_stale_${Math.round(ageMinutes)}m`);
        result.expiredCount++;
        continue;
      }

      // If todo start reminder is older than 60 minutes, expire it to prevent confusing late alerts
      if (category === 'task_start' && ageMinutes > 60) {
        await dbUpdateScheduledReminderStatus(id, 'expired', `task_start_stale_${Math.round(ageMinutes)}m`);
        result.expiredCount++;
        continue;
      }

      // 4. Quiet Hours Check
      const quietHoursEnabled = settings.quiet_hours_enabled ?? true;
      const inQuietHours = quietHoursEnabled && isUserInQuietHours(
        settings.quiet_hours_start || '22:00',
        settings.quiet_hours_end || '07:00',
        timezone,
        now
      );

      if (inQuietHours && !isUrgent) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'quiet_hours');
        result.suppressedCount++;
        continue;
      }

      // 5. Daily Notification Limit Check (Task reminders are exempt so all user tasks get alerted)
      const dailyLimit = settings.daily_limit || 5;
      const userLocalDate = getUserLocalDateString(timezone, now);

      const dailyCountRes = await pool.query(
        `SELECT COUNT(*) as count 
         FROM scheduled_reminders 
         WHERE user_id = $1 AND status = 'sent' AND due_date = $2 AND category NOT LIKE 'task%'`,
        [userId, userLocalDate]
      );
      const sentTodayCount = parseInt(dailyCountRes.rows[0]?.count || '0', 10);

      if (!isTaskReminder && sentTodayCount >= dailyLimit) {
        await dbUpdateScheduledReminderStatus(id, 'suppressed', 'daily_limit_reached');
        result.suppressedCount++;
        continue;
      }

      // 6. Anti-Clustering / Minimum Spacing Check for Non-Urgent Automated Nudges
      // Ensure at least 45 minutes between non-urgent automated nudges for the same user.
      // Task reminders (pre-reminder and start) are EXEMPT so they always fire on user-set times.
      if (!isTaskReminder) {
        const lastSentTime = userLastSentMap.get(userId) || 0;
        const timeSinceLastSentMs = now.getTime() - lastSentTime;
        if (timeSinceLastSentMs < 45 * 60 * 1000) {
          // Defer or suppress
          await dbUpdateScheduledReminderStatus(id, 'suppressed', 'cooldown_spacing');
          result.suppressedCount++;
          continue;
        }
      }

      // 7. Format Web Push Payload with Deterministic Tags and Actions
      let deterministicTag = `focentia-${category}`;
      if (taskId) deterministicTag = `focentia-task-${taskId}-${category}`;
      else if (skillId) deterministicTag = `focentia-skill-${skillId}-${userLocalDate}`;
      else if (category === 'focus_reminder') deterministicTag = `focentia-focus-${userLocalDate}`;
      else if (category === 'daily_plan') deterministicTag = `focentia-daily-plan-${userLocalDate}`;

      const pushPayload: WebPushPayload = {
        id,
        title,
        body,
        category,
        actionRoute: actionRoute || 'today',
        targetUrl: actionRoute ? `/?page=${encodeURIComponent(actionRoute)}` : '/',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-large.png?v=max_zoom_1',
        tag: deterministicTag,
        isUrgent,
        requireInteraction: isUrgent,
        taskId: taskId ? Number(taskId) : undefined,
        skillId: skillId || undefined,
        data: metadata || {},
        timestamp: targetTime.getTime(),
      };

      // 8. Deliver Web Push to all user's registered devices
      const pushRes = await sendWebPushToUser(userId, pushPayload);

      if (pushRes.sentCount > 0) {
        await dbUpdateScheduledReminderStatus(id, 'sent', `delivered_${pushRes.sentCount}_devices`, now);
        if (!isTaskReminder) {
          userLastSentMap.set(userId, now.getTime());
        }
        result.dispatchedCount++;
      } else if (pushRes.removedExpired > 0 && pushRes.failedCount === 0) {
        // All subscriptions were expired/unregistered
        await dbUpdateScheduledReminderStatus(id, 'failed', 'no_active_subscriptions');
        result.failedCount++;
      } else {
        // Delivery failed due to provider error or no subscriptions registered
        if (attemptCount >= (reminder.max_attempts || 3)) {
          await dbUpdateScheduledReminderStatus(id, 'failed', 'max_attempts_reached');
          result.failedCount++;
        } else {
          // Leave in pending for next retry cycle with backoff
          await dbUpdateScheduledReminderStatus(id, 'pending', 'retry_queued');
        }
      }
    }

    return result;
  } catch (err: any) {
    console.error('[Scheduler Service] Cycle error:', err);
    result.failedCount++;
    return result;
  }
}
