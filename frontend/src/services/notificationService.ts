/**
 * FocusForge Notification Service
 *
 * Responsibilities:
 * 1. Strict Account Isolation:
 *    - All sent logs, daily limit counters, and notification dispatches are scoped to activeUserId.
 * 2. Offline-First Local Delivery:
 *    - In-app banner dispatch via CustomEvent.
 *    - Gentle audio chime via Web Audio API (works 100% offline).
 *    - Browser / Service Worker showNotification wrapper.
 * 3. Intelligent Anti-Spam & Limits:
 *    - Daily push notification limit (~4-5 max).
 *    - Quiet hours suppression (10:00 PM - 7:00 AM).
 *    - Duplicate prevention & idempotency keys.
 * 4. Completion Cancellation:
 *    - Instantly suppress stale reminders when task or focus is completed.
 */

import { notificationCenterService } from "./notificationCenterService";
import { NotificationCategory } from "../types";
import type { OrbMood } from "../components/ai-agent/useOrbMood";

const SENT_LOG_PREFIX = "focusforge_notif_sent_";
const DAILY_COUNT_PREFIX = "focusforge_notif_daily_count_";

export interface NotificationActionItem {
  action?: string;
  label?: string;
  title?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  icon?: string;
}

export interface NotificationPayload {
  id?: string;
  category?: NotificationCategory;
  templateId?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  actionRoute?: string;
  targetUrl?: string;
  type?: string;
  orbMood?: OrbMood | string;
  appTag?: string;
  taskId?: number | string;
  skillId?: string;
  data?: Record<string, unknown>;
  actions?: NotificationActionItem[];
  requireInteraction?: boolean;
  isUrgent?: boolean;
  silent?: boolean;
  renotify?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

class NotificationService {
  private activeUserId: string | null = null;
  private dailyLimit: number = 5;
  private quietHoursEnabled: boolean = true;
  private quietHoursStart: string = "22:00"; // 10:00 PM
  private quietHoursEnd: string = "07:00"; // 7:00 AM
  private soundEnabled: boolean = true;

  /**
   * Set active account ID for strict data isolation
   */
  public setUserId(userId: string | null | undefined): void {
    const nextId = userId ? userId.trim() : null;
    this.activeUserId = nextId;
    notificationCenterService.setUserId(nextId);
  }

  /**
   * Update operational preferences (quiet hours, limits, sound)
   */
  public updateConfig(prefs: {
    dailyLimit?: number;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    soundEnabled?: boolean;
  }): void {
    if (typeof prefs.dailyLimit === "number") this.dailyLimit = prefs.dailyLimit;
    if (typeof prefs.quietHoursEnabled === "boolean") this.quietHoursEnabled = prefs.quietHoursEnabled;
    if (prefs.quietHoursStart) this.quietHoursStart = prefs.quietHoursStart;
    if (prefs.quietHoursEnd) this.quietHoursEnd = prefs.quietHoursEnd;
    if (typeof prefs.soundEnabled === "boolean") this.soundEnabled = prefs.soundEnabled;
  }

  /**
   * Whether the browser supports the Notifications API.
   */
  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  /**
   * Current permission status ('default' | 'granted' | 'denied').
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  }

  /**
   * Request notification permission only after explicit user interaction.
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return "denied";
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission;
    }
  }

  /**
   * Play an elegant gentle synthesized chime using Web Audio API.
   * Works 100% offline with zero external audio assets.
   */
  public playChime(): void {
    if (!this.soundEnabled) return;
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Note 1 (523.25Hz - C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (659.25Hz - E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Note 3 (783.99Hz - G5)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(783.99, now + 0.24);
      gain3.gain.setValueAtTime(0.1, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.85);
    } catch {
      // Audio policy safe
    }
  }

  // ==================== Duplicate & Anti-Spam Controls ====================

  private getSentLogKey(): string {
    const userScope = this.activeUserId || "guest";
    return `${SENT_LOG_PREFIX}${userScope}`;
  }

  private getDailyCountKey(dateStr: string): string {
    const userScope = this.activeUserId || "guest";
    return `${DAILY_COUNT_PREFIX}${userScope}_${dateStr}`;
  }

  /**
   * Check if a specific notification ID has already been sent to this account.
   */
  public hasBeenSent(notificationId: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(this.getSentLogKey());
      if (!raw) return false;
      const map: Record<string, number> = JSON.parse(raw);
      return Boolean(map[notificationId]);
    } catch {
      return false;
    }
  }

  /**
   * Mark a notification as sent for this account.
   */
  public markAsSent(notificationId: string): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(this.getSentLogKey());
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[notificationId] = Date.now();

      // Clean up records older than 3 days
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      for (const key of Object.keys(map)) {
        if (map[key] < threeDaysAgo) {
          delete map[key];
        }
      }

      localStorage.setItem(this.getSentLogKey(), JSON.stringify(map));
    } catch {}
  }

  /**
   * Daily push count check for active account
   */
  public getTodaySentCount(): number {
    if (typeof window === "undefined") return 0;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem(this.getDailyCountKey(todayStr));
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private incrementTodaySentCount(): void {
    if (typeof window === "undefined") return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const current = this.getTodaySentCount();
      localStorage.setItem(this.getDailyCountKey(todayStr), String(current + 1));
    } catch {}
  }

  /**
   * Check if local time is currently within Quiet Hours
   */
  public isQuietHours(): boolean {
    if (!this.quietHoursEnabled) return false;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = this.quietHoursStart.split(":").map(Number);
      const [endH, endM] = this.quietHoursEnd.split(":").map(Number);
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (startMinutes > endMinutes) {
        // Spans midnight (e.g. 22:00 to 07:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  /**
   * Cancel / suppress remaining reminders for a specific task
   */
  public cancelTaskReminders(taskId: number | string): void {
    if (typeof window === "undefined") return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      // Mark known task reminder keys as sent
      this.markAsSent(`task_start_${taskId}_${todayStr}`);
      this.markAsSent(`task_pre_${taskId}_${todayStr}`);
      this.markAsSent(`task_incomp_${taskId}_${todayStr}`);
    } catch {}
  }

  /**
   * Generate deterministic notification tag for OS grouping and replacement
   */
  private generateDeterministicTag(payload: NotificationPayload, notifId: string): string {
    if (payload.tag) return payload.tag;
    const category = payload.category || "system";
    const todayStr = new Date().toISOString().split("T")[0];

    if (category === "daily_plan") {
      return `focusforge-daily-plan-${todayStr}`;
    }
    if (category === "focus_reminder" || category === "focus_completed") {
      return `focusforge-focus-${todayStr}`;
    }
    if (payload.taskId) {
      return `focusforge-task-${payload.taskId}-${category}`;
    }
    if (payload.skillId) {
      return `focusforge-skill-${payload.skillId}-${todayStr}`;
    }
    if (category === "break_time") {
      return "focusforge-break";
    }
    if (category === "streak_milestone") {
      return `focusforge-streak-${todayStr}`;
    }
    return `focusforge-${notifId}`;
  }

  /**
   * Build native Android/Web Notification Actions matching the semantic category
   */
  private buildNativeActions(payload: NotificationPayload): Array<{ action: string; title: string; icon?: string }> {
    if (payload.actions && payload.actions.length > 0) {
      return payload.actions.slice(0, 2).map((a) => ({
        action: a.action || a.label || "view",
        title: a.title || a.label || "View",
        icon: a.icon,
      }));
    }

    const category = payload.category || "system";
    switch (category) {
      case "daily_plan":
        return [
          { action: "view_plan", title: "View Plan" },
          { action: "dismiss", title: "Dismiss" },
        ];
      case "focus_reminder":
        return [
          { action: "start_focus", title: "Start Focus" },
          { action: "dismiss", title: "Dismiss" },
        ];
      case "task_start":
      case "task_pre_reminder":
      case "task_incomplete":
        return [
          { action: "open_task", title: "Open Task" },
          { action: "dismiss", title: "Dismiss" },
        ];
      case "skill_reminder":
        return [
          { action: "open_learning", title: "Practice" },
          { action: "dismiss", title: "Dismiss" },
        ];
      case "task_completed":
      case "focus_completed":
      case "streak_milestone":
        return [
          { action: "view_stats", title: "View Progress" },
        ];
      case "break_time":
        return [
          { action: "dismiss", title: "Dismiss" },
        ];
      default:
        return payload.actionRoute
          ? [{ action: "open_route", title: "Open" }, { action: "dismiss", title: "Dismiss" }]
          : [];
    }
  }

  // ==================== Notification Dispatch ====================

  /**
   * Deliver a notification with account isolation, daily limit, quiet hours, sound, and Android PWA system presentation.
   * Also records into Notification Center and displays the in-app banner.
   */
  public async send(payload: NotificationPayload): Promise<boolean> {
    const notifId = payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const category: NotificationCategory = payload.category || "system";
    const orbMood = payload.orbMood || "attentive";

    // 1. Idempotency Check: Don't repeat if already delivered
    if (payload.id && this.hasBeenSent(payload.id)) {
      return false;
    }

    // 2. Always record into the in-app Notification Center so user never misses history
    try {
      notificationCenterService.addNotification({
        id: notifId,
        type: payload.type || "system",
        category,
        templateId: payload.templateId,
        title: payload.title,
        message: payload.body,
        actionRoute: payload.actionRoute,
        orbMood: String(orbMood),
        taskId: payload.taskId,
        skillId: payload.skillId,
        metadata: payload.data,
      });
    } catch {}

    // 3. Mark sent right away
    this.markAsSent(notifId);

    // 4. Check Quiet Hours
    const inQuietHours = this.isQuietHours();
    if (inQuietHours && !payload.isUrgent) {
      // Quiet hours: Orb sleeps, only urgent alerts show
      return true;
    }

    // 5. Check Daily Notification Limit (Push & Banner)
    const todayCount = this.getTodaySentCount();
    if (todayCount >= this.dailyLimit && !payload.isUrgent) {
      // Suppress lower-priority generic reminders when daily limit reached
      return true;
    }

    this.incrementTodaySentCount();

    // 6. Trigger in-app popup Banner
    if (typeof window !== "undefined") {
      try {
        const appTag =
          payload.appTag ||
          (category === "daily_plan"
            ? "FOCENTIA - DAILY PLAN"
            : category === "focus_reminder"
            ? "FOCENTIA - FOCUS"
            : category === "task_start"
            ? "FOCENTIA - TASK START"
            : category === "task_incomplete"
            ? "FOCENTIA - TASK CHECK-IN"
            : category === "skill_reminder"
            ? "FOCENTIA - PRACTICE"
            : category === "task_completed"
            ? "FOCENTIA - COMPLETED"
            : category === "focus_completed"
            ? "FOCENTIA - FOCUS DONE"
            : "FOCENTIA");

        window.dispatchEvent(
          new CustomEvent("focusforge:show-banner", {
            detail: {
              id: notifId,
              category,
              appTag,
              title: payload.title,
              message: payload.body,
              orbMood,
              actionRoute: payload.actionRoute,
              actions: payload.actions,
              taskId: payload.taskId,
              durationMs: 5000,
            },
          })
        );
      } catch {}
    }

    // 7. Play gentle audio chime
    if (!payload.silent) {
      this.playChime();
    }

    // 8. Device / OS Web Notification & Service Worker (Android PWA System Notification)
    if (!this.isSupported() || this.getPermission() !== "granted") {
      return true;
    }

    try {
      const iconUrl = payload.icon || "/icons/icon-192x192.png";
      const badgeUrl = payload.badge || "/icons/badge-96x96.png";
      const deterministicTag = this.generateDeterministicTag(payload, notifId);
      const nativeActions = this.buildNativeActions(payload);
      const vibratePattern = payload.vibrate || (payload.isUrgent ? [150, 80, 150, 80, 200] : [100, 50, 100]);
      const timestamp = payload.timestamp || Date.now();

      const notificationOptions: Record<string, any> = {
        body: payload.body,
        icon: iconUrl,
        badge: badgeUrl,
        tag: deterministicTag,
        renotify: payload.renotify ?? true,
        requireInteraction: payload.requireInteraction ?? false,
        silent: payload.silent ?? false,
        vibrate: vibratePattern,
        timestamp,
        data: {
          ...payload.data,
          id: notifId,
          actionRoute: payload.actionRoute,
          targetUrl: payload.targetUrl || (payload.actionRoute ? `/?page=${payload.actionRoute}` : "/"),
          category,
          taskId: payload.taskId,
          skillId: payload.skillId,
          templateId: payload.templateId,
          orbMood: String(orbMood),
        },
      };

      if (payload.image) {
        notificationOptions.image = payload.image;
      }

      if (nativeActions.length > 0) {
        notificationOptions.actions = nativeActions;
      }

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(payload.title, notificationOptions);
          return true;
        } catch (swErr) {
          console.warn("[NotificationService] ServiceWorker showNotification fallback:", swErr);
        }
      }

      // Desktop / Non-Service Worker fallback
      const notif = new Notification(payload.title, {
        body: payload.body,
        icon: iconUrl,
        badge: badgeUrl,
        tag: deterministicTag,
        data: notificationOptions.data,
      });

      notif.onclick = () => {
        window.focus();
        if (payload.actionRoute && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("focusforge:navigate", { detail: { route: payload.actionRoute } })
          );
        }
        notif.close();
      };

      return true;
    } catch {
      return true;
    }
  }

  /**
   * Helper notify method
   */
  public async notify(payload: NotificationPayload): Promise<boolean> {
    return this.send(payload);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
