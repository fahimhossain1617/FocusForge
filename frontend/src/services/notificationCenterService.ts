/**
 * FocusForge Notification Center Service
 *
 * Centralized, reactive notification management service:
 * - In-app notification creation, persistence, read/unread states, dismissal.
 * - Multi-source extensibility (Tasks, Planner, Focus, Diary, Skill Builder, AI Agent, System).
 * - Instant reactive UI synchronization across components and browser tabs.
 */

import { AppNotification } from "../types";

const NOTIFICATIONS_STORAGE_KEY = "focusforge_app_notifications";
const NOTIFICATIONS_EVENT_NAME = "focusforge:notifications-updated";
const MAX_NOTIFICATIONS_HISTORY = 100;

class NotificationCenterService {
  private listeners: Set<() => void> = new Set();
  private cachedNotifications: AppNotification[] | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key === NOTIFICATIONS_STORAGE_KEY) {
          this.cachedNotifications = null;
          this.notifyListeners();
        }
      });
    }
  }

  /**
   * Subscribe to notification updates. Returns unsubscribe function.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("[NotificationCenterService] listener error:", err);
      }
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT_NAME));
      } catch {}
    }
  }

  /**
   * Reads all notifications from persistence (sorted newest first).
   */
  public getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return [];

    if (this.cachedNotifications !== null) {
      return this.cachedNotifications;
    }

    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) {
        // Initial clean state
        this.cachedNotifications = [];
        return [];
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sort descending by timestamp
        const sorted = (parsed as AppNotification[]).sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        this.cachedNotifications = sorted;
        return sorted;
      }
    } catch (err) {
      console.warn("[NotificationCenterService] Failed to load notifications:", err);
    }

    this.cachedNotifications = [];
    return [];
  }

  /**
   * Returns count of unread notifications.
   */
  public getUnreadCount(): number {
    const list = this.getNotifications();
    return list.filter((n) => !n.read).length;
  }

  /**
   * Persists the given notification list to localStorage and notifies subscribers.
   */
  private saveNotifications(notifications: AppNotification[]): void {
    if (typeof window === "undefined") return;

    try {
      const trimmed = notifications.slice(0, MAX_NOTIFICATIONS_HISTORY);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
      this.cachedNotifications = trimmed;
      this.notifyListeners();
    } catch (err) {
      console.warn("[NotificationCenterService] Failed to save notifications:", err);
    }
  }

  /**
   * Adds a new notification to the center.
   * If a notification with the same ID already exists, it updates it.
   */
  public addNotification(
    payload: Omit<AppNotification, "id" | "timestamp" | "read"> & {
      id?: string;
      timestamp?: string;
      read?: boolean;
    }
  ): AppNotification {
    const list = this.getNotifications();
    const id = payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = payload.timestamp || new Date().toISOString();
    const read = payload.read ?? false;

    const existingIndex = list.findIndex((n) => n.id === id);

    const newNotification: AppNotification = {
      id,
      type: payload.type || "system",
      title: payload.title,
      message: payload.message,
      timestamp,
      read,
      actionRoute: payload.actionRoute,
      metadata: payload.metadata,
      expiresAt: payload.expiresAt,
    };

    let updatedList: AppNotification[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = newNotification;
    } else {
      updatedList = [newNotification, ...list];
    }

    this.saveNotifications(updatedList);
    return newNotification;
  }

  /**
   * Mark a single notification as read.
   */
  public markAsRead(id: string): void {
    const list = this.getNotifications();
    const existing = list.find((n) => n.id === id);
    if (!existing || existing.read) return;

    const updatedList = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updatedList);
  }

  /**
   * Mark all notifications as read.
   */
  public markAllAsRead(): void {
    const list = this.getNotifications();
    if (!list.some((n) => !n.read)) return;

    const updatedList = list.map((n) => ({ ...n, read: true }));
    this.saveNotifications(updatedList);
  }

  /**
   * Dismiss/remove an individual notification.
   */
  public dismissNotification(id: string): void {
    const list = this.getNotifications();
    const updatedList = list.filter((n) => n.id !== id);
    this.saveNotifications(updatedList);
  }

  /**
   * Clears all notifications.
   */
  public clearAll(): void {
    this.saveNotifications([]);
  }
}

export const notificationCenterService = new NotificationCenterService();
export default notificationCenterService;
