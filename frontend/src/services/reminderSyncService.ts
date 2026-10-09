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
import { Task, FocusSession, LearningFolder, LearningLog, NotificationPreferences } from '../types';
import { notificationRotationManager } from './notificationTemplates';
import { getLocalDateString } from './taskService';

export interface ScheduledReminderPayload {
  id: string;
  category: 'task_start' | 'task_pre_reminder' | 'task_incomplete' | 'focus_reminder' | 'skill_reminder' | 'diary_reminder' | 'ai_companion' | 'system';
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
    // 1. Todo Task Reminders (Priority 1: Start, Priority 2: 5m Pre & Incomplete)
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

        // A. 5-Minute Pre-Reminder
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
            priority: 2,
            title: preTemplate.title,
            body: preTemplate.message,
            actionRoute: 'tasks',
            targetTime: new Date(preTimestamp).toISOString(),
            dueDate: taskDate,
            timezone,
            taskId: task.id,
            isUrgent: false,
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
    // 2. Motivational Focus Reminders (Midday ~14:00 & Evening ~18:30)
    // =========================================================================
    if (prefs.focusSessionReminder !== false) {
      const hasFocusToday = focusSessions.some((s: any) => {
        const sDate = s.date || (s.startTime ? s.startTime.split('T')[0] : '');
        return sDate === todayStr && (s.duration || s.completed);
      });

      if (!hasFocusToday) {
        const middayFocusDate = this.parseLocalDateTime(todayStr, '14:00');
        if (middayFocusDate.getTime() > now - 15 * 60 * 1000) {
          const focusTemplate = notificationRotationManager.getNext('focus_reminder', lang, {}, userId || undefined);
          scheduledList.push({
            id: `focus_rem_mid_${todayStr}`,
            category: 'focus_reminder',
            priority: 4,
            title: focusTemplate.title,
            body: focusTemplate.message,
            actionRoute: 'focus',
            targetTime: middayFocusDate.toISOString(),
            dueDate: todayStr,
            timezone,
            isUrgent: false,
          });
        }
      }
    }

    // =========================================================================
    // 3. Time Log & Skill Practice Reminders (~17:00)
    // =========================================================================
    if (prefs.skillReminders !== false && learningFolders.length > 0) {
      const hasPracticeToday = learningLogs.some((l) => l.date === todayStr || ((l as any).createdAt && (l as any).createdAt.startsWith(todayStr)));
      if (!hasPracticeToday) {
        const aftSkillDate = this.parseLocalDateTime(todayStr, '17:00');
        if (aftSkillDate.getTime() > now - 15 * 60 * 1000) {
          const activeTopic = learningFolders[0]?.name || (lang === 'bn' ? 'স্কিল' : 'skill');
          const skillTemplate = notificationRotationManager.getNext('skill_reminder', lang, { skillName: activeTopic }, userId || undefined);

          scheduledList.push({
            id: `skill_rem_aft_${todayStr}`,
            category: 'skill_reminder',
            priority: 3,
            title: skillTemplate.title,
            body: skillTemplate.message,
            actionRoute: 'learning',
            targetTime: aftSkillDate.toISOString(),
            dueDate: todayStr,
            timezone,
            skillId: learningFolders[0]?.id,
            isUrgent: false,
          });
        }
      }
    }

    // =========================================================================
    // 4. Diary / Reflection Reminders (~21:00)
    // =========================================================================
    if (prefs.diaryReminder !== false) {
      const diaryDate = this.parseLocalDateTime(todayStr, '21:00');
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
