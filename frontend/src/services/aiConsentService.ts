/**
 * FocusForge AI Improvement Consent Service (aiConsentService.ts)
 * 
 * Manages explicit user consent for AI personalization & improvement.
 * Guarantees:
 * - "Allow AI Improvement" as the default selected option.
 * - "Keep My Chats Private" as the full-access privacy alternative.
 * - Persisted locally per user namespace (Account Isolation).
 * - Full AI availability regardless of choice.
 * - Changeable anytime from Settings.
 */

import type { PrivacyMode } from "@/types/aiAgent";

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

  getEffectivePrivacyMode(userId?: string | null): PrivacyMode {
    const consent = this.getConsent(userId);
    if (consent === "private") {
      return "private";
    }
    // Default to "improvement" so conversations are securely saved
    return "improvement";
  }
};
