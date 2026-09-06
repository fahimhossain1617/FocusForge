/**
 * Onboarding Storage Service
 * Handles client-side storage for guest users and local caching of onboarding state.
 */

export interface OnboardingState {
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string | null;
  preferredLanguage: "en" | "bn";
  preferredTheme: "dark" | "light";
  accountMode: "guest" | "authenticated";
  productTourCompleted: boolean;
}

const STORAGE_KEY = "focusforge_onboarding_state";
const GUEST_COMPLETED_KEY = "focusforge_onboarding_guest_completed";

export const onboardingStorage = {
  /**
   * Retrieves local onboarding state from localStorage.
   */
  getLocalState(): OnboardingState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      // Check legacy/fallback guest completed flag
      const legacyGuest = localStorage.getItem(GUEST_COMPLETED_KEY);
      if (legacyGuest === "true") {
        return {
          onboardingCompleted: true,
          preferredLanguage: "en",
          preferredTheme: "dark",
          accountMode: "guest",
          productTourCompleted: true,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Persists local onboarding state to localStorage.
   */
  saveLocalState(state: Partial<OnboardingState>): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getLocalState() || {
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        preferredLanguage: "en",
        preferredTheme: "dark",
        accountMode: "guest",
        productTourCompleted: false,
      };
      const merged: OnboardingState = {
        ...current,
        ...state,
        onboardingCompleted: state.onboardingCompleted ?? current.onboardingCompleted,
        productTourCompleted: state.productTourCompleted ?? current.productTourCompleted,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (merged.onboardingCompleted) {
        localStorage.setItem(GUEST_COMPLETED_KEY, "true");
      }
    } catch (e) {
      console.warn("[onboardingStorage] Failed to save local state:", e);
    }
  },

  /**
   * Clears local onboarding state (for development / debugging).
   */
  clearLocalState(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GUEST_COMPLETED_KEY);
    } catch {}
  },
};
