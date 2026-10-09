/**
 * FocusForge / Focentia Client-Side Reminder Synchronization Service
 *
 * Responsibilities:
 * 1. Computes upcoming exact UTC instants for all reminder categories:
 *    - Todo Task Start (Priority 1) & 5-minute Pre-Reminder (Priority 2).
 *    - Time Log & Skill Practice Reminders (Priority 3).
 *    - Motivational Focus Nudges (Priority 4).
 *    - Diary & Reflection Nudges (Priority 5).
 * 2. Transmits computed reminders to the backend PostgreSQL `scheduled_reminders` queue.
 * 3. Immediately cancels pending reminders on the server when a task is completed or deleted.
 * 4. Ensures timezone precision using `Intl.DateTimeFormat` and user local date boundaries.
 */

import { supabase } from '../lib/supabaseClient';
import { Task, FocusSession, LearningFolder, LearningLog, NotificationPreferences, NotificationCategory } from '../types';
import { notificationRotationManager } from './notificationTemplates';
import { getLocalDateString } from './taskService';

export interface ScheduledReminderPayload {
  id: string;
  category: NotificationCategory | 'task_start' | 'task_pre_reminder' | 'task_incomplete' | 'focus_reminder' | 'skill_reminder' | 'diary_reminder' | 'ai_companion' | 'system' | 'daily_plan' | 'inactivity';
  priority: number;
  title: string;
  body: string;
  actionRoute: string;
  targetTime: string; // ISO 8601 UTC string
  dueDate: string; // Local YYYY-MM-DD string
  timezone: string;
  taskId?: number | string;
  skillId?: string;
  isUrgent?: boolean;
  metadata?: Record<string, unknown>;
}

class ReminderSyncService {
  private syncTimeout: NodeJS.Timeout | null = null;
  private lastSyncedHash: string = '';

  /**
   * Resolve user's active IANA timezone
   */
  public getUserTimezone(preferredTimezone?: string): string {
    if (preferredTimezone && preferredTimezone !== 'UTC') {
      return preferredTimezone;
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  /**
   * Calculate a deterministic daily jitter (in minutes) for non-urgent nudges.
   * Ensures reminders feel organic and vary day-by-day without random drift between client and server.
   */
  public getDailyJitterMinutes(userId: string | null | undefined, dateStr: string, category: string, minOffset: number, maxOffset: number): number {
    const seed = `${userId || 'anon'}_${dateStr}_${category}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const span = Math.max(1, maxOffset - minOffset + 1);
    const offset = Math.abs(hash) % span;
    return minOffset + offset;
  }

  /**
   * Convert local date (YYYY-MM-DD) and time (HH:mm) with optional jitter minutes into an exact Date
   */
  public parseLocalDateTimeWithJitter(dateStr: string, timeStr: string, jitterMinutes: number = 0): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0, 0);
    if (jitterMinutes !== 0) {
      date.setMinutes(date.getMinutes() + jitterMinutes);
    }
    return date;
  }

  /**
   * Convert local date (YYYY-MM-DD) and time (HH:mm) into an exact UTC Date
   */
  public parseLocalDateTime(dateStr: string, timeStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0, 0);
  }

  /**
   * Generate the full list of pending reminders from active client state
   */
  public buildScheduledReminders(params: {
    tasks: Task[];
    focusSessions?: FocusSession[];
    learningFolders?: LearningFolder[];
    learningLogs?: LearningLog[];
    notifPreferences: NotificationPreferences;
    lang: 'en' | 'bn';
    userId?: string | null;
  }): ScheduledReminderPayload[] {
    const { tasks, focusSessions = [], learningFolders = [], learningLogs = [], notifPreferences: prefs, lang, userId } = params;

    if (!prefs.enabled) {
      return [];
    }

    const todayStr = getLocalDateString();
    const timezone = this.getUserTimezone((prefs as any).timezone);
    const scheduledList: ScheduledReminderPayload[] = [];
    const now = Date.now();

    // =========================================================================
    // 1. Todo Task Reminders (Strictly User-Fixed, Precise 5m Pre & Start)
    // =========================================================================
    if (prefs.taskReminders !== false) {
      for (const task of tasks) {
        const isDone = task.completed || task.status === 'completed';
        if (isDone) continue;

        const taskDate = (task.targetDate || task.date || todayStr).trim();
        const targetTimeStr = (task.reminderTime || task.time || '').trim();
        if (!targetTimeStr) continue;

        const [rH, rM] = targetTimeStr.split(':').map(Number);
        if (isNaN(rH) || isNaN(rM)) continue;

        const taskName = task.title || task.name || (lang === 'bn' ? 'টাস্ক' : 'Task');
        const taskStartDate = this.parseLocalDateTime(taskDate, targetTimeStr);
        const taskStartTimestamp = taskStartDate.getTime();
        const estMinutes = task.estMinutes || 45;
        const taskEndTimestamp = taskStartTimestamp + estMinutes * 60 * 1000;

        // A. Exact 5-Minute Pre-Reminder (Priority 1: Protected Task Timing)
        const preTimestamp = taskStartTimestamp - 5 * 60 * 1000;
        if (preTimestamp > now - 10 * 60 * 1000) {
          const preTemplate = notificationRotationManager.getNext(
            'task_pre_reminder',
            lang,
            { taskName },
            userId || undefined
          );

          scheduledList.push({
            id: `task_pre_${task.id}_${taskDate}`,
            category: 'task_pre_reminder',
            priority: 1,
            title: preTemplate.title,
            body: preTemplate.message,
            actionRoute: 'tasks',
            targetTime: new Date(preTimestamp).toISOString(),
            dueDate: taskDate,
            timezone,
            taskId: task.id,
            isUrgent: true,
          });
        }

        // B. Exact Task Start Reminder (Priority 1 - Highest)
        if (taskStartTimestamp > now - 20 * 60 * 1000) {
          const startTemplate = notificationRotationManager.getNext(
            'task_start',
            lang,
            { taskName },
            userId || undefined
          );

          scheduledList.push({
            id: `task_start_${task.id}_${taskDate}`,
            category: 'task_start',
            priority: 1,
            title: startTemplate.title,
            body: startTemplate.message,
            actionRoute: 'tasks',
            targetTime: new Date(taskStartTimestamp).toISOString(),
            dueDate: taskDate,
            timezone,
            taskId: task.id,
            isUrgent: true,
          });
        }

        // C. Incomplete Task Follow-up (30m before estimated end)
        if (estMinutes >= 35) {
          const incompTimestamp = taskEndTimestamp - 30 * 60 * 1000;
          if (incompTimestamp > now - 10 * 60 * 1000) {
            const incompTemplate = notificationRotationManager.getNext(
              'task_incomplete',
              lang,
              { taskName },
              userId || undefined
            );

            scheduledList.push({
              id: `task_incomp_${task.id}_${taskDate}`,
              category: 'task_incomplete',
              priority: 2,
              title: incompTemplate.title,
              body: incompTemplate.message,
              actionRoute: 'tasks',
              targetTime: new Date(incompTimestamp).toISOString(),
              dueDate: taskDate,
              timezone,
              taskId: task.id,
              isUrgent: false,
            });
          }
        }
      }
    }

    // =========================================================================
    // 2. Daily Morning Plan Kickoff (~07:45 with organic daily shuffle)
    // =========================================================================
    if (prefs.dailyMorningPlan !== false) {
      const basePlanTime = prefs.dailyMorningPlanTime || '07:45';
      const planJitter = this.getDailyJitterMinutes(userId, todayStr, 'daily_plan', -15, 25);
      const planDate = this.parseLocalDateTimeWithJitter(todayStr, basePlanTime, planJitter);
      if (planDate.getTime() > now - 20 * 60 * 1000) {
        const planTemplate = notificationRotationManager.getNext('daily_plan', lang, {}, userId || undefined);
        scheduledList.push({
          id: `daily_plan_${todayStr}`,
          category: 'daily_plan',
          priority: 3,
          title: planTemplate.title,
          body: planTemplate.message,
          actionRoute: 'planner',
          targetTime: planDate.toISOString(),
          dueDate: todayStr,
          timezone,
          isUrgent: false,
        });
      }
    }

    // =========================================================================
    // 3. Motivational Focus Reminders (Morning ~08:45 & Evening ~18:30, No Noon)
    // =========================================================================
    if (prefs.focusSessionReminder !== false) {
      const hasFocusToday = focusSessions.some((s: any) => {
        const sDate = s.date || (s.startTime ? s.startTime.split('T')[0] : '');
        return sDate === todayStr && (s.duration || s.completed);
      });

      if (!hasFocusToday) {
        // A. Morning Kickoff (~08:45 with jitter -15 to +25 -> 08:30 to 09:10)
        const morningJitter = this.getDailyJitterMinutes(userId, todayStr, 'focus_morning', -15, 25);
        const morningFocusDate = this.parseLocalDateTimeWithJitter(todayStr, '08:45', morningJitter);
        if (morningFocusDate.getTime() > now - 15 * 60 * 1000) {
          const focusTemplate = notificationRotationManager.getNext('focus_reminder', lang, {}, userId || undefined);
          scheduledList.push({
            id: `focus_rem_morn_${todayStr}`,
            category: 'focus_reminder',
            priority: 4,
            title: focusTemplate.title,
            body: focusTemplate.message,
            actionRoute: 'focus',
            targetTime: morningFocusDate.toISOString(),
            dueDate: todayStr,
            timezone,
            isUrgent: false,
          });
        }

        // B. Evening Focus Nudge (~18:30 with jitter -20 to +40 -> 18:10 to 19:10)
        const eveJitter = this.getDailyJitterMinutes(userId, todayStr, 'focus_evening', -20, 40);
        const eveFocusDate = this.parseLocalDateTimeWithJitter(todayStr, '18:30', eveJitter);
        if (eveFocusDate.getTime() > now - 15 * 60 * 1000) {
          const focusTemplate = notificationRotationManager.getNext('focus_reminder', lang, {}, userId || undefined);
          scheduledList.push({
            id: `focus_rem_eve_${todayStr}`,
            category: 'focus_reminder',
            priority: 4,
            title: focusTemplate.title,
            body: focusTemplate.message,
            actionRoute: 'focus',
            targetTime: eveFocusDate.toISOString(),
            dueDate: todayStr,
            timezone,
            isUrgent: false,
          });
        }
      }
    }

    // =========================================================================
    // 4. Time Log & Skill Practice Reminders (Rotated across Morning / Sunset / Night)
    // =========================================================================
    if (prefs.skillReminders !== false && learningFolders.length > 0) {
      const hasPracticeToday = learningLogs.some((l) => l.date === todayStr || ((l as any).createdAt && (l as any).createdAt.startsWith(todayStr)));
      if (!hasPracticeToday) {
        // Rotating slot based on day hash: 0 = morning (10:15), 1 = late afternoon (17:15), 2 = night (20:15)
        const slotChoice = Math.abs(this.getDailyJitterMinutes(userId, todayStr, 'skill_slot', 0, 2));
        const baseTimes = ['10:15', '17:15', '20:15'];
        const chosenBaseTime = baseTimes[slotChoice] || '17:15';
        const skillJitter = this.getDailyJitterMinutes(userId, todayStr, 'skill_reminder', -15, 25);
        const skillDate = this.parseLocalDateTimeWithJitter(todayStr, chosenBaseTime, skillJitter);

        if (skillDate.getTime() > now - 15 * 60 * 1000) {
          const activeTopic = learningFolders[0]?.name || (lang === 'bn' ? 'স্কিল' : 'skill');
          const skillTemplate = notificationRotationManager.getNext('skill_reminder', lang, { skillName: activeTopic }, userId || undefined);

          scheduledList.push({
            id: `skill_rem_${todayStr}`,
            category: 'skill_reminder',
            priority: 3,
            title: skillTemplate.title,
            body: skillTemplate.message,
            actionRoute: 'learning',
            targetTime: skillDate.toISOString(),
            dueDate: todayStr,
            timezone,
            skillId: learningFolders[0]?.id,
            isUrgent: false,
          });
        }
      }
    }

    // =========================================================================
    // 5. Inactivity / Re-engagement Reminders (~19:30 with jitter)
    // =========================================================================
    if (prefs.inactivityReminders !== false) {
      const hasFocusToday = focusSessions.some((s: any) => {
        const sDate = s.date || (s.startTime ? s.startTime.split('T')[0] : '');
        return sDate === todayStr && (s.duration || s.completed);
      });
      const hasTasksDoneToday = tasks.some((t) => (t.completed || t.status === 'completed') && (t.targetDate || t.date || todayStr) === todayStr);

      if (!hasFocusToday && !hasTasksDoneToday) {
        const inactJitter = this.getDailyJitterMinutes(userId, todayStr, 'inactivity', -20, 30);
        const inactDate = this.parseLocalDateTimeWithJitter(todayStr, '19:30', inactJitter);
        if (inactDate.getTime() > now - 15 * 60 * 1000) {
          const inactTemplate = notificationRotationManager.getNext('inactivity', lang, {}, userId || undefined);
          scheduledList.push({
            id: `inact_rem_${todayStr}`,
            category: 'inactivity',
            priority: 4,
            title: inactTemplate.title,
            body: inactTemplate.message,
            actionRoute: 'today',
            targetTime: inactDate.toISOString(),
            dueDate: todayStr,
            timezone,
            isUrgent: false,
          });
        }
      }
    }

    // =========================================================================
    // 6. Diary / Reflection Reminders (~21:15 with jitter 21:00 - 21:40)
    // =========================================================================
    if (prefs.diaryReminder !== false) {
      const diaryJitter = this.getDailyJitterMinutes(userId, todayStr, 'diary_reminder', -15, 25);
      const diaryDate = this.parseLocalDateTimeWithJitter(todayStr, '21:15', diaryJitter);
      if (diaryDate.getTime() > now - 15 * 60 * 1000) {
        const diaryTemplate = notificationRotationManager.getNext('diary_reminder', lang, {}, userId || undefined);
        scheduledList.push({
          id: `diary_rem_${todayStr}`,
          category: 'diary_reminder',
          priority: 5,
          title: diaryTemplate.title,
          body: diaryTemplate.message,
          actionRoute: 'diary',
          targetTime: diaryDate.toISOString(),
          dueDate: todayStr,
          timezone,
          isUrgent: false,
        });
      }
    }

    return scheduledList;
  }

  /**
   * Debounced sync to the backend database queue
   */
  public debounceSyncReminders(params: {
    tasks: Task[];
    focusSessions?: FocusSession[];
    learningFolders?: LearningFolder[];
    learningLogs?: LearningLog[];
    notifPreferences: NotificationPreferences;
    lang: 'en' | 'bn';
    userId?: string | null;
  }, delayMs: number = 1500): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.syncRemindersToServer(params).catch((err) => {
        console.warn('[ReminderSyncService] Debounced sync warning:', err);
      });
    }, delayMs);
  }

  /**
   * Immediately sync calculated reminders to backend endpoint
   */
  public async syncRemindersToServer(params: {
    tasks: Task[];
    focusSessions?: FocusSession[];
    learningFolders?: LearningFolder[];
    learningLogs?: LearningLog[];
    notifPreferences: NotificationPreferences;
    lang: 'en' | 'bn';
    userId?: string | null;
  }): Promise<{ success: boolean; syncedCount?: number }> {
    const { userId } = params;
    if (!userId || userId === 'guest') {
      return { success: true };
    }

    try {
      const reminders = this.buildScheduledReminders(params);
      const payloadString = JSON.stringify(reminders);

      // Skip if state has not changed
      if (payloadString === this.lastSyncedHash) {
        return { success: true, syncedCount: reminders.length };
      }

      // Collect completed task IDs to ensure server cancels any pending reminders
      const completedTaskIds = params.tasks
        .filter((t) => t.completed || t.status === 'completed')
        .map((t) => t.id);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch {}

      const res = await fetch('/api/notifications/reminders/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reminders,
          completedTaskIds,
        }),
      });

      if (res.ok) {
        this.lastSyncedHash = payloadString;
        const result = await res.json().catch(() => ({}));
        return { success: true, syncedCount: result.syncedCount || reminders.length };
      }

      return { success: false };
    } catch (err) {
      console.warn('[ReminderSyncService] Server sync error:', err);
      return { success: false };
    }
  }

  /**
   * Explicitly cancel task reminders on the backend when task is deleted or completed
   */
  public async cancelTaskRemindersOnServer(taskId: number | string, userId?: string | null): Promise<void> {
    if (!userId || userId === 'guest') return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch {}

      await fetch('/api/notifications/reminders/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskIds: [taskId],
        }),
      });
    } catch (err) {
      console.warn('[ReminderSyncService] Cancel reminder on server warning:', err);
    }
  }
}

export const reminderSyncService = new ReminderSyncService();
export default reminderSyncService;
