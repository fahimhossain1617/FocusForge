/**
 * Focentia Feature Flags Client
 *
 * Fetches public flags from GET /api/flags/public with in-memory TTL caching.
 * SAFE DEFAULT: If the endpoint is unavailable or fails, features stay ENABLED (true).
 * Never breaks application UI or functionality.
 */

import { PublicFeatureFlags } from "./telemetryTypes";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedFlags: PublicFeatureFlags = {};
let lastFetchedAt = 0;
let isFetching = false;

export const featureFlagsClient = {
  /**
   * Initializes or refreshes flags in background without blocking render.
   */
  async refreshFlags(): Promise<PublicFeatureFlags> {
    if (typeof window === "undefined") return {};
    if (isFetching) return cachedFlags;

    const now = Date.now();
    if (now - lastFetchedAt < CACHE_TTL_MS && Object.keys(cachedFlags).length > 0) {
      return cachedFlags;
    }

    isFetching = true;
    try {
      const res = await fetch("/api/flags/public", {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          cachedFlags = data.flags || data;
          lastFetchedAt = now;
        }
      }
    } catch {
      // Safe fallback: keep existing cache or default to enabled
    } finally {
      isFetching = false;
    }

    return cachedFlags;
  },

  /**
   * Checks if a feature flag is enabled.
   * Defaults to TRUE if flag is undefined or backend is not connected yet.
   */
  isEnabled(flagKey: string, defaultValue: boolean = true): boolean {
    if (typeof window === "undefined") return defaultValue;

    // Proactively refresh if stale
    if (Date.now() - lastFetchedAt > CACHE_TTL_MS) {
      featureFlagsClient.refreshFlags().catch(() => {});
    }

    if (flagKey in cachedFlags) {
      return Boolean(cachedFlags[flagKey]);
    }

    return defaultValue;
  },

  /**
   * Directly sets a cached flag (used for local testing or immediate UI updates)
   */
  setLocalFlagOverride(flagKey: string, enabled: boolean): void {
    cachedFlags[flagKey] = enabled;
  },

  getAllFlags(): PublicFeatureFlags {
    return { ...cachedFlags };
  },
};
