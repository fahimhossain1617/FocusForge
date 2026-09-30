/**
 * FocusForge AI Improvement Consent Service (aiConsentService.ts)
 * 
 * Manages explicit user consent for AI model evaluation & improvement.
 * Guarantees:
 * - Privacy-First default ("Keep My Chats Private").
 * - Shown once on first use; never nags.
 * - Changing preference anytime from Settings.
 * - Functional AI availability regardless of choice.
 * - Does NOT link consent to account creation, login, or sync.
 */

export type AIConsentChoice = "granted" | "private" | "unasked";

const CONSENT_PREFIX = "focusforge_ai_consent_";

export const aiConsentService = {
  getConsent(userId?: string | null): AIConsentChoice {
    if (typeof window === "undefined") return "unasked";
    const key = `${CONSENT_PREFIX}${userId || "guest"}`;
    try {
      const val = localStorage.getItem(key);
      if (val === "granted" || val === "private") {
        return val;
      }
      return "unasked";
    } catch {
      return "unasked";
    }
  },

  setConsent(userId: string | null | undefined, choice: "granted" | "private"): void {
    if (typeof window === "undefined") return;
    const key = `${CONSENT_PREFIX}${userId || "guest"}`;
    try {
      localStorage.setItem(key, choice);
    } catch (err) {
      console.warn("[aiConsentService] Failed to persist consent choice:", err);
    }
  },

  hasUserDecided(userId?: string | null): boolean {
    return this.getConsent(userId) !== "unasked";
  },
};
