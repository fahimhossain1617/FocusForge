/**
 * FocusForge Notification Service
 *
 * Responsibilities:
 * 1. Web Notification API wrapper with fallback to Service Worker showNotification.
 * 2. Gentle audio chime via Web Audio API.
 * 3. Robust duplicate prevention using localStorage log.
 * 4. Prepared abstraction layer for future Web Push / Firebase Cloud Messaging (FCM).
 */

const SENT_LOG_KEY = "focusforge_notif_sent_log";

export interface NotificationPayload {
  id?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  scheduledTime: string; // ISO string
  type: "daily_morning_plan" | "task_reminder";
  metadata?: Record<string, unknown>;
}

class NotificationService {
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
   * Does not require external audio assets and works offline.
   */
  public playChime(): void {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
      // Audio context may be restricted by browser policy before first interaction
    }
  }

  // ==================== Duplicate Prevention ====================

  /**
   * Check if a specific notification ID has already been sent today.
   */
  public hasBeenSent(notificationId: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(SENT_LOG_KEY);
      if (!raw) return false;
      const map: Record<string, number> = JSON.parse(raw);
      return Boolean(map[notificationId]);
    } catch {
      return false;
    }
  }

  /**
   * Mark a notification as sent to prevent re-triggering across rerenders or reloads.
   */
  public markAsSent(notificationId: string): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SENT_LOG_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[notificationId] = Date.now();

      // Clean up records older than 3 days to prevent unbounded growth
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      for (const key of Object.keys(map)) {
        if (map[key] < threeDaysAgo) {
          delete map[key];
        }
      }

      localStorage.setItem(SENT_LOG_KEY, JSON.stringify(map));
    } catch {
      // LocalStorage access non-fatal
    }
  }

  /**
   * Clear sent log (e.g. for testing or reset).
   */
  public clearSentLog(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SENT_LOG_KEY);
    } catch {}
  }

  // ==================== Notification Dispatch ====================

  /**
   * Deliver a notification with duplicate protection and sound.
   */
  public async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (this.getPermission() !== "granted") return false;

    // Check duplicate prevention if id is provided
    if (payload.id && this.hasBeenSent(payload.id)) {
      return false;
    }

    try {
      const iconUrl = payload.icon || "/icons/icon-192x192.png";
      const badgeUrl = payload.badge || "/favicon-32x32.png";

      // 1. Try Service Worker showNotification (preferred on Mobile / PWA)
      if (
        "serviceWorker" in navigator &&
        navigator.serviceWorker.controller
      ) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(payload.title, {
            body: payload.body,
            icon: iconUrl,
            badge: badgeUrl,
            tag: payload.tag || payload.id || "focusforge-general",
            data: payload.data,
            requireInteraction: payload.requireInteraction ?? false,
          });

          if (payload.id) this.markAsSent(payload.id);
          this.playChime();
          return true;
        } catch {
          // Fall through to standard Notification
        }
      }

      // 2. Standard Web Notification API fallback
      const notif = new Notification(payload.title, {
        body: payload.body,
        icon: iconUrl,
        tag: payload.tag || payload.id || "focusforge-general",
        data: payload.data,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      if (payload.id) this.markAsSent(payload.id);
      this.playChime();
      return true;
    } catch (err) {
      console.warn("[NotificationService] Send failed:", err);
      return false;
    }
  }

  // ==================== Future Push Notification Layer ====================

  /**
   * Prepares push notification subscription for future backend integration (FCM / WebPush).
   * Note: Requires a VAPID server key configured on the backend.
   */
  public async subscribeToPushNotifications(
    vapidPublicKey?: string
  ): Promise<PushSubscription | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.info("[NotificationService] PushManager not supported in this environment");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      return subscription;
    } catch (err) {
      console.warn("[NotificationService] Push subscription registration failed:", err);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
