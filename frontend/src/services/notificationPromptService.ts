/**
 * Focentia Notification Prompt Frequency & Permission Service
 * Manages intelligent, non-intrusive notification permission prompts:
 * - Triggered when user performs meaningful actions in notification-relevant features
 * - Strictly capped at maximum 2 times per day
 * - Respects permission status (if already granted, never prompts)
 * - Safe persistence in localStorage
 */

export interface NotificationPromptState {
  dailyDate: string; // YYYY-MM-DD
  dailyCount: number; // Max 2 per day
  totalActionsSincePrompt: number;
  lastPromptedAt?: number; // timestamp ms
  hasGranted: boolean;
}

const STORAGE_KEY = "focentia_notification_prompt_tracker";
const MAX_PROMPTS_PER_DAY = 2;
const MIN_ACTIONS_FOR_TRIGGER = 2; // Trigger after 2 actions (e.g., adding 2 tasks/features)
const COOLDOWN_BETWEEN_PROMPTS_MS = 1000 * 60 * 30; // 30 mins cooldown between prompts on the same day

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export class NotificationPromptService {
  private getStorage(): NotificationPromptState {
    if (typeof window === "undefined") {
      return {
        dailyDate: getTodayDateStr(),
        dailyCount: 0,
        totalActionsSincePrompt: 0,
        hasGranted: false,
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationPromptState;
        const today = getTodayDateStr();
        // Reset daily count if date changed
        if (parsed.dailyDate !== today) {
          parsed.dailyDate = today;
          parsed.dailyCount = 0;
        }
        return parsed;
      }
    } catch {
      // Fallback
    }

    return {
      dailyDate: getTodayDateStr(),
      dailyCount: 0,
      totalActionsSincePrompt: 0,
      hasGranted: false,
    };
  }

  private saveStorage(state: NotificationPromptState): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore write error
    }
  }

  /**
   * Check whether the browser currently has notification permission granted.
   */
  public isPermissionGranted(): boolean {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    return Notification.permission === "granted";
  }

  /**
   * Check whether notifications are supported by the browser.
   */
  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  /**
   * Check if we are eligible to show the notification enable prompt.
   */
  public isEligibleToShow(forceCheck: boolean = false): boolean {
    if (!this.isSupported()) return false;
    // If permission is currently active/granted in browser/phone, never prompt
    if (this.isPermissionGranted()) return false;

    const state = this.getStorage();

    // Check daily cap (max 2 times per day)
    if (state.dailyCount >= MAX_PROMPTS_PER_DAY) {
      return false;
    }

    // Cooldown check if prompted recently today
    if (state.lastPromptedAt) {
      const elapsed = Date.now() - state.lastPromptedAt;
      if (elapsed < COOLDOWN_BETWEEN_PROMPTS_MS && !forceCheck) {
        return false;
      }
    }

    if (forceCheck) return true;

    // Must have completed at least MIN_ACTIONS_FOR_TRIGGER actions since last prompt
    return state.totalActionsSincePrompt >= MIN_ACTIONS_FOR_TRIGGER;
  }

  /**
   * Record a meaningful user action (e.g. creating a task, setting routine, etc.)
   * Returns true if this action makes the prompt eligible to show immediately.
   */
  public recordAction(actionType?: string): boolean {
    if (!this.isSupported() || this.isPermissionGranted()) {
      return false;
    }

    const state = this.getStorage();
    const isPriorityAction = actionType === "create_task" || actionType === "save_task";
    
    // Priority actions increment faster (creating a task can directly trigger after 1-2 items)
    state.totalActionsSincePrompt += isPriorityAction ? 2 : 1;
    this.saveStorage(state);

    return this.isEligibleToShow();
  }

  /**
   * Mark that the prompt was displayed to the user.
   */
  public markPromptShown(): void {
    const state = this.getStorage();
    state.dailyCount += 1;
    state.lastPromptedAt = Date.now();
    state.totalActionsSincePrompt = 0;
    this.saveStorage(state);
  }

  /**
   * Mark that permission was granted by user.
   */
  public markPermissionGranted(): void {
    const state = this.getStorage();
    state.hasGranted = true;
    this.saveStorage(state);
  }

  /**
   * Reset stats (useful for demo & testing).
   */
  public resetForTesting(): void {
    const initial: NotificationPromptState = {
      dailyDate: getTodayDateStr(),
      dailyCount: 0,
      totalActionsSincePrompt: 2, // Ready to trigger immediately for test
      hasGranted: false,
    };
    this.saveStorage(initial);
  }

  public getDebugStats(): NotificationPromptState & { permission: string; isSupported: boolean } {
    const state = this.getStorage();
    return {
      ...state,
      permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
      isSupported: this.isSupported(),
    };
  }
}

export const notificationPromptService = new NotificationPromptService();
export default notificationPromptService;
