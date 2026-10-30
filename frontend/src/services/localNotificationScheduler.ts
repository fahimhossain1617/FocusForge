/**
 * FocusForge Local Notification Scheduler (localNotificationScheduler.ts)
 *
 * Responsibilities:
 * 1. 100% Offline-First Local Scheduled Notifications:
 *    - Source of truth is client / native local scheduler, NEVER blocked by server push or network.
 *    - Native Android via Capacitor (`@capacitor/local-notifications` / `window.Capacitor.Plugins.LocalNotifications`).
 *    - Native Android via JavascriptInterface bridge (`window.AndroidNotificationBridge` / `window.Android`).
 *    - Chromium / Android PWA Notification Triggers (`showTrigger: new TimestampTrigger(timestamp)`).
 *    - Persistent IndexedDB queue synced to Service Worker (`sw.js`).
 * 2. Exact alarms & battery optimization:
 *    - Requests POST_NOTIFICATIONS (Android 13+) and SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM.
 *    - Schedules with `allowWhileIdle: true` (setExactAndAllowWhileIdle equivalent).
 * 3. Automatic Rescheduling:
 *    - Triggered whenever tasks, planner time blocks, routines, or settings change.
 *    - Cancels outdated alarms, schedules new alarms without duplicate noise.
 *    - Automatic boot / restart rehydration on app launch.
 * 4. Preferences & Quiet Hours (10:00 PM - 7:00 AM):
 *    - Respects push master switch and all individual category toggles.
 *    - Silences non-urgent alerts inside Quiet Hours.
 * 5. 100% Local Bundled Assets:
 *    - Zero network dependencies at fire time.
 */

import { Task, FocusSession, LearningFolder, LearningLog, RoutineTemplate, NotificationPreferences, NotificationCategory } from "../types";
import { notificationRotationManager } from "./notificationTemplates";
import { getLocalDateString } from "./taskService";
import notificationService, { getNotificationOrbIcon } from "./notificationService";

export interface ScheduledLocalNotificationItem {
  id: string;
  numericId: number; // Required for native Android integer notification ID
  category: NotificationCategory | 'task_start' | 'task_pre_reminder' | 'task_incomplete' | 'focus_reminder' | 'skill_reminder' | 'diary_reminder' | 'ai_companion' | 'system' | 'daily_plan' | 'inactivity';
  priority: number;
  title: string;
  body: string;
  actionRoute: string;
  targetTimestamp: number; // Unix epoch ms
  targetTimeISO: string;
  dueDate: string;
  taskId?: number | string;
  skillId?: string;
  isUrgent?: boolean;
  sound?: boolean;
  icon?: string;
}

const LOCAL_REMINDERS_DB_KEY = "focusforge_local_scheduled_reminders_v2";

class LocalNotificationScheduler {
  private activeReminders: ScheduledLocalNotificationItem[] = [];
  private precisionTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isNativeListenerRegistered = false;
  private backgroundWorker: Worker | null = null;
  private lastAlertTime = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_REMINDERS_DB_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.activeReminders = parsed;
          }
        }
      } catch {}
      this.initNativeListener();
      this.initBackgroundWorker();
      this.startPrecisionForegroundLoop();
    }
  }

  /**
   * Dedicated Web Worker ticker: ensures alerts fire accurately even when tab is backgrounded
   */
  private initBackgroundWorker(): void {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;
    try {
      const code = `
        var timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 8000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([code], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      this.backgroundWorker = new Worker(workerUrl);
      this.backgroundWorker.onmessage = () => {
        this.checkDueReminders();
      };
      this.backgroundWorker.postMessage("start");
    } catch (err) {
      console.warn("[LocalNotificationScheduler] Dedicated worker ticker fallback:", err);
    }
  }

  /**
   * Check if running inside native Android / Capacitor environment
   */
  public isNativeAndroid(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as any;
    if (win.Capacitor?.isNativePlatform?.() && win.Capacitor?.getPlatform?.() === "android") {
      return true;
    }
    if (win.AndroidNotificationBridge || win.Android) {
      return true;
    }
    // Check user agent and standalone mode
    const isAndroidUA = /Android/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone === true ||
      document.referrer?.startsWith("android-app://");
    return isAndroidUA && isStandalone;
  }

  /**
   * Request native Android / Browser notification permissions
   */
  public async requestPermissions(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const win = window as any;

    // 1. Capacitor Native Plugin
    const localNotifs = win.Capacitor?.Plugins?.LocalNotifications;
    if (localNotifs?.requestPermissions) {
      try {
        const res = await localNotifs.requestPermissions();
        if (res.display === "granted") {
          // Check exact alarm permissions if available
          if (localNotifs.checkExactNotificationSetting) {
            try {
              await localNotifs.checkExactNotificationSetting();
            } catch {}
          }
          return true;
        }
      } catch (err) {
        console.warn("[LocalNotificationScheduler] Capacitor permission error:", err);
      }
    }

    // 2. Android Bridge
    if (win.AndroidNotificationBridge?.requestPermission) {
      try {
        win.AndroidNotificationBridge.requestPermission();
        return true;
      } catch {}
    }

    // 3. Web Notification API
    return (await notificationService.requestPermission()) === "granted";
  }

  private initNativeListener(): void {
    if (this.isNativeListenerRegistered || typeof window === "undefined") return;
    this.isNativeListenerRegistered = true;

    const win = window as any;
    const localNotifs = win.Capacitor?.Plugins?.LocalNotifications;
    if (localNotifs?.addListener) {
      try {
        localNotifs.addListener("localNotificationActionPerformed", (action: any) => {
          const route = action?.notification?.extra?.actionRoute;
          if (route && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("focusforge:navigate", { detail: { route } }));
          }
        });
      } catch {}
    }
  }

  /**
   * Generates a deterministic numeric 32-bit ID from string key for Android AlarmManager
   */
  public hashToNumericId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2147483647;
  }

  /**
   * Check if target timestamp is inside Quiet Hours (10:00 PM - 7:00 AM)
   */
  public isInsideQuietHours(
    timestamp: number | Date,
    quietHoursStart = "22:00",
    quietHoursEnd = "07:00"
  ): boolean {
    const d = new Date(timestamp);
    const mins = d.getHours() * 60 + d.getMinutes();
    const [startH, startM] = quietHoursStart.split(":").map(Number);
    const [endH, endM] = quietHoursEnd.split(":").map(Number);
    const startMins = startH * 60 + (startM || 0);
    const endMins = endH * 60 + (endM || 0);

    if (startMins > endMins) {
      return mins >= startMins || mins < endMins;
    } else {
      return mins >= startMins && mins < endMins;
    }
  }

  /**
   * Build the complete set of exact local scheduled notifications
   */
  public buildScheduledList(params: {
    tasks: Task[];
    focusSessions?: FocusSession[];
    learningFolders?: LearningFolder[];
    learningLogs?: LearningLog[];
    routineTemplates?: RoutineTemplate[];
    notifPreferences: NotificationPreferences;
    lang: "en" | "bn";
    userId?: string | null;
  }): ScheduledLocalNotificationItem[] {
    const {
      tasks,
      focusSessions = [],
      learningFolders = [],
      learningLogs = [],
      notifPreferences: prefs,
      lang,
      userId,
    } = params;

    // Master push switch check
    if (!prefs.enabled) {
      return [];
    }

    const todayStr = getLocalDateString();
    const now = Date.now();
    const scheduled: ScheduledLocalNotificationItem[] = [];

    const quietHoursEnabled = prefs.quietHoursEnabled ?? true;
    const quietHoursStart = prefs.quietHoursStart || "22:00";
    const quietHoursEnd = prefs.quietHoursEnd || "07:00";
    const sound = prefs.soundEnabled ?? true;

    // 1. Exact Scheduled Task Reminders (Priority 1)
    // Fires at the exact user-scheduled minute both offline and online
    const untimedTasks: Task[] = [];
    if (prefs.taskReminders !== false) {
      for (const task of tasks) {
        const isDone = task.completed || task.status === "completed";
        if (isDone) continue;

        const taskDate = (task.targetDate || task.date || todayStr).trim();
        const timeStr = (task.reminderTime || task.time || (task as any).startTime || "").trim();

        if (!timeStr) {
          untimedTasks.push(task);
          continue;
        }

        // Active if reminder is enabled or has explicit time without being disabled
        if (task.reminderEnabled === false && !task.reminderTime) continue;

        const [h, m] = timeStr.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) {
          untimedTasks.push(task);
          continue;
        }

        const [y, mon, d] = taskDate.split("-").map(Number);
        const taskStartDate = new Date(y, (mon || 1) - 1, d || 1, h, m, 0, 0);
        const startMs = taskStartDate.getTime();
        const taskName = task.title || task.name || (lang === "bn" ? "টাস্ক" : "Task");

        // Exact Task Start Reminder (Priority 1 - User Commitment)
        if (startMs > now) {
          const inQuiet = quietHoursEnabled && this.isInsideQuietHours(startMs, quietHoursStart, quietHoursEnd);
          if (!inQuiet) {
            const startTpl = notificationRotationManager.getNext(
              "task_start",
              lang,
              { taskName },
              userId || undefined
            );
            const id = `task_start_${task.id}_${taskDate}`;
            scheduled.push({
              id,
              numericId: this.hashToNumericId(id),
              category: "task_start",
              priority: 1,
              title: startTpl.title,
              body: startTpl.message,
              actionRoute: "planner",
              targetTimestamp: startMs,
              targetTimeISO: new Date(startMs).toISOString(),
              dueDate: taskDate,
              taskId: task.id,
              isUrgent: true,
              sound: sound,
              icon: getNotificationOrbIcon("task_start"),
            });
          }
        }
      }
    }

    // GENERAL SYSTEM NOTIFICATIONS (Strict Limit: 2 to 3 per 24 hours across entire app, spaced hours apart)
    // Schedules for today and upcoming 24h window so offline/closed browser notifications are pre-armed
    const dateList = [todayStr];
    const tomorrowObj = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, "0")}-${String(tomorrowObj.getDate()).padStart(2, "0")}`;
    dateList.push(tomorrowStr);

    for (const targetDateStr of dateList) {
      let dailyNudgeCount = 0;
      const [y, mon, d] = targetDateStr.split("-").map(Number);

      // Slot A. Early Morning Sweet Reminder (~08:00)
      if (prefs.dailyMorningPlan !== false && dailyNudgeCount < 3) {
        const planTime = prefs.dailyMorningPlanTime || "08:00";
        const [pH, pM] = planTime.split(":").map(Number);
        const planDate = new Date(y, (mon || 1) - 1, d || 1, pH || 8, pM || 0, 0, 0);
        const planMs = planDate.getTime();

        if (planMs > now) {
          const inQuiet = quietHoursEnabled && this.isInsideQuietHours(planMs, quietHoursStart, quietHoursEnd);
          if (!inQuiet) {
            const tpl = notificationRotationManager.getNext("daily_plan", lang, {}, userId || undefined);
            const id = `daily_plan_${targetDateStr}`;
            scheduled.push({
              id,
              numericId: this.hashToNumericId(id),
              category: "daily_plan",
              priority: 3,
              title: tpl.title,
              body: tpl.message,
              actionRoute: "planner",
              targetTimestamp: planMs,
              targetTimeISO: planDate.toISOString(),
              dueDate: targetDateStr,
              isUrgent: false,
              sound: sound,
              icon: getNotificationOrbIcon("daily_plan"),
            });
            dailyNudgeCount++;
          }
        }
      }

      // Slot B. Midday / Afternoon Sweet Reminder (~13:30)
      if (dailyNudgeCount < 3) {
        const noonDate = new Date(y, (mon || 1) - 1, d || 1, 13, 30, 0, 0);
        const noonMs = noonDate.getTime();

        if (noonMs > now) {
          const inQuiet = quietHoursEnabled && this.isInsideQuietHours(noonMs, quietHoursStart, quietHoursEnd);
          if (!inQuiet) {
            if (untimedTasks.length > 0 && targetDateStr === todayStr) {
              const untimedTask = untimedTasks[0];
              const taskName = untimedTask.title || untimedTask.name || (lang === "bn" ? "টাস্ক" : "Task");
              const tpl = notificationRotationManager.getNext(
                "task_incomplete",
                lang,
                { taskName },
                userId || undefined
              );
              const id = `task_untimed_${untimedTask.id}_${targetDateStr}`;
              scheduled.push({
                id,
                numericId: this.hashToNumericId(id),
                category: "task_incomplete",
                priority: 3,
                title: tpl.title,
                body: tpl.message,
                actionRoute: "planner",
                targetTimestamp: noonMs,
                targetTimeISO: noonDate.toISOString(),
                dueDate: targetDateStr,
                taskId: untimedTask.id,
                isUrgent: false,
                sound: sound,
                icon: getNotificationOrbIcon("concerned"),
              });
              dailyNudgeCount++;
            } else if (prefs.focusSessionReminder !== false) {
              const tpl = notificationRotationManager.getNext("focus_reminder", lang, {}, userId || undefined);
              const id = `focus_rem_noon_${targetDateStr}`;
              scheduled.push({
                id,
                numericId: this.hashToNumericId(id),
                category: "focus_reminder",
                priority: 4,
                title: tpl.title,
                body: tpl.message,
                actionRoute: "focus",
                targetTimestamp: noonMs,
                targetTimeISO: noonDate.toISOString(),
                dueDate: targetDateStr,
                isUrgent: false,
                sound: sound,
                icon: getNotificationOrbIcon("focus_reminder"),
              });
              dailyNudgeCount++;
            }
          }
        }
      }

      // Slot C. Evening Focus / Practice Reminder (~18:30)
      if (dailyNudgeCount < 3) {
        const eveDate = new Date(y, (mon || 1) - 1, d || 1, 18, 30, 0, 0);
        const eveMs = eveDate.getTime();

        if (eveMs > now) {
          const inQuiet = quietHoursEnabled && this.isInsideQuietHours(eveMs, quietHoursStart, quietHoursEnd);
          if (!inQuiet) {
            if (prefs.focusSessionReminder !== false) {
              const tpl = notificationRotationManager.getNext("focus_reminder", lang, {}, userId || undefined);
              const id = `focus_rem_eve_${targetDateStr}`;
              scheduled.push({
                id,
                numericId: this.hashToNumericId(id),
                category: "focus_reminder",
                priority: 4,
                title: tpl.title,
                body: tpl.message,
                actionRoute: "focus",
                targetTimestamp: eveMs,
                targetTimeISO: eveDate.toISOString(),
                dueDate: targetDateStr,
                isUrgent: false,
                sound: sound,
                icon: getNotificationOrbIcon("focus_reminder"),
              });
              dailyNudgeCount++;
            } else if (prefs.skillReminders !== false && learningFolders.length > 0) {
              const activeSkill = learningFolders[0]?.name || (lang === "bn" ? "স্কিল" : "Skill");
              const tpl = notificationRotationManager.getNext("skill_reminder", lang, { skillName: activeSkill }, userId || undefined);
              const id = `skill_rem_${targetDateStr}`;
              scheduled.push({
                id,
                numericId: this.hashToNumericId(id),
                category: "skill_reminder",
                priority: 4,
                title: tpl.title,
                body: tpl.message,
                actionRoute: "learning",
                targetTimestamp: eveMs,
                targetTimeISO: eveDate.toISOString(),
                dueDate: targetDateStr,
                skillId: learningFolders[0]?.id,
                isUrgent: false,
                sound: sound,
                icon: getNotificationOrbIcon("skill_reminder"),
              });
              dailyNudgeCount++;
            }
          }
        }
      }
    }

    return scheduled;
  }

  /**
   * Reschedule all local alarms: cancels stale ones, schedules upcoming ones
   */
  public async rescheduleAll(params: {
    tasks: Task[];
    focusSessions?: FocusSession[];
    learningFolders?: LearningFolder[];
    learningLogs?: LearningLog[];
    routineTemplates?: RoutineTemplate[];
    notifPreferences: NotificationPreferences;
    lang: "en" | "bn";
    userId?: string | null;
  }): Promise<void> {
    const list = this.buildScheduledList(params);
    this.activeReminders = list;

    // Persist to local storage for offline / reboot recovery
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(LOCAL_REMINDERS_DB_KEY, JSON.stringify(list));
      } catch {}
    }

    // 1. Dispatch to Native Android (Capacitor)
    await this.syncToNativeCapacitor(list);

    // 2. Dispatch to Service Worker (PWA Notification Triggers + IndexedDB)
    await this.syncToServiceWorker(list);
  }

  /**
   * Debounced reschedule helper
   */
  public debounceReschedule(
    params: {
      tasks: Task[];
      focusSessions?: FocusSession[];
      learningFolders?: LearningFolder[];
      learningLogs?: LearningLog[];
      routineTemplates?: RoutineTemplate[];
      notifPreferences: NotificationPreferences;
      lang: "en" | "bn";
      userId?: string | null;
    },
    delayMs = 1200
  ): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.rescheduleAll(params).catch((err) => {
        console.warn("[LocalNotificationScheduler] Reschedule error:", err);
      });
    }, delayMs);
  }

  /**
   * Sync to Capacitor LocalNotifications plugin on native Android
   */
  private async syncToNativeCapacitor(reminders: ScheduledLocalNotificationItem[]): Promise<void> {
    if (typeof window === "undefined") return;
    const win = window as any;
    const localNotifs = win.Capacitor?.Plugins?.LocalNotifications;
    if (!localNotifs?.schedule) return;

    try {
      // Cancel previous pending native notifications
      const pending = await localNotifs.getPending?.();
      if (pending?.notifications?.length > 0) {
        await localNotifs.cancel?.({ notifications: pending.notifications });
      }

      const now = Date.now();
      const nativeItems = reminders
        .filter((r) => r.targetTimestamp > now)
        .map((r) => ({
          id: r.numericId,
          title: r.title,
          body: r.body,
          schedule: {
            at: new Date(r.targetTimestamp),
            allowWhileIdle: true, // Native setExactAndAllowWhileIdle equivalent
          },
          sound: r.sound !== false ? "res_sound.wav" : undefined,
          smallIcon: "res_icon",
          actionTypeId: r.category,
          extra: {
            id: r.id,
            actionRoute: r.actionRoute,
            taskId: r.taskId,
            skillId: r.skillId,
          },
        }));

      if (nativeItems.length > 0) {
        await localNotifs.schedule({ notifications: nativeItems });
      }
    } catch (err) {
      console.warn("[LocalNotificationScheduler] Capacitor sync warning:", err);
    }
  }

  /**
   * Sync to Service Worker with Notification Triggers API
   */
  private async syncToServiceWorker(reminders: ScheduledLocalNotificationItem[]): Promise<void> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      // 1. Post message to SW
      if (reg.active) {
        reg.active.postMessage({
          type: "SCHEDULE_REMINDERS",
          reminders,
        });
      }

      // 2. If browser supports Notification Triggers API (Chromium on Android), schedule natively!
      const now = Date.now();
      const TriggerClass = typeof window !== "undefined" ? ((window as any).TimestampTrigger || (self as any).TimestampTrigger) : undefined;
      const hasNotificationTriggers = typeof TriggerClass !== "undefined" && "showNotification" in reg;

      if (hasNotificationTriggers) {
        for (const item of reminders) {
          if (item.targetTimestamp > now) {
            try {
              const trigger = new TriggerClass(item.targetTimestamp);
              await (reg as any).showNotification(item.title, {
                body: item.body,
                icon: item.icon || getNotificationOrbIcon(item.category),
                silent: !item.sound,
                badge: "/icons/badge-large.png?v=max_zoom_1",
                tag: `focentia-${item.id}`,
                showTrigger: trigger,
                data: {
                  id: item.id,
                  actionRoute: item.actionRoute,
                  targetUrl: item.actionRoute ? `/?page=${encodeURIComponent(item.actionRoute)}` : "/",
                  taskId: item.taskId,
                  skillId: item.skillId,
                },
              });
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("[LocalNotificationScheduler] SW sync warning:", err);
    }
  }

  /**
   * Check and trigger due reminders with smart catch-up and anti-avalanche rate limiting
   */
  public checkDueReminders(): void {
    const now = Date.now();
    for (const item of this.activeReminders) {
      if (item.targetTimestamp <= now) {
        const diff = now - item.targetTimestamp;

        // Anti-flood: only fire if due within the last 2 minutes!
        // Expired/stale backlog alerts (>2 minutes in past) are marked sent silently to avoid open-app bursts!
        if (diff >= 0 && diff < 2 * 60 * 1000) {
          if (!notificationService.hasBeenSent(item.id)) {
            if (now - this.lastAlertTime < 2000) {
              continue;
            }
            this.lastAlertTime = now;
            notificationService.send({
              id: item.id,
              category: item.category as any,
              title: item.title,
              body: item.body,
              actionRoute: item.actionRoute,
              taskId: item.taskId,
              skillId: item.skillId,
              isUrgent: item.isUrgent,
              silent: !item.sound,
              icon: item.icon || getNotificationOrbIcon(item.category),
            });
          }
        } else {
          // Stale reminder (older than 2 minutes): silently mark sent so it never bursts on app open
          if (!notificationService.hasBeenSent(item.id)) {
            notificationService.markAsSent(item.id);
          }
        }
      }
    }
  }

  private startPrecisionForegroundLoop(): void {
    if (this.precisionTimer) clearInterval(this.precisionTimer);

    this.precisionTimer = setInterval(() => {
      this.checkDueReminders();
    }, 10000);
  }
}

export const localNotificationScheduler = new LocalNotificationScheduler();
export default localNotificationScheduler;
