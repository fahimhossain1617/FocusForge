/**
 * Focentia Client Telemetry Main Client
 *
 * Provides silent, zero-overhead technical instrumentation across the application.
 * Collects runtime errors, Web Vitals, API latency, IDB performance, and feature usage.
 *
 * STRICT PRIVACY & RELIABILITY:
 * - Completely silent: NO UI popups, banners, badges, or notifications.
 * - Zero personal content: Notes, diary entries, task text, and AI conversations are NEVER captured.
 * - Recursion guard: Telemetry errors never generate more telemetry events.
 */

import {
  sanitizeText,
  sanitizeUrl,
  sanitizeStack,
  sanitizeError,
  generateAnonymousSessionId,
} from "./telemetrySanitizer";
import { telemetryQueue } from "./telemetryQueue";
import {
  FeatureAction,
  ErrorSeverity,
  DurableFeedbackPayload,
} from "./telemetryTypes";

let isInitialized = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
const APP_VERSION = "0.1.0";

export const telemetryClient = {
  /**
   * Initializes global observers and listeners silently
   */
  init(isGuest: boolean = true): void {
    if (isInitialized || typeof window === "undefined") return;
    isInitialized = true;

    try {
      telemetryQueue.init(isGuest, APP_VERSION);

      // 1. Session start event
      telemetryQueue.enqueue({
        type: "session_lifecycle",
        lifecycle: "start",
      });

      // 2. Global Uncaught Window Errors
      window.addEventListener("error", (event) => {
        try {
          const errorObj = event.error || {};
          const isChunk =
            event.message?.includes("Loading chunk") ||
            event.message?.includes("ChunkLoadError") ||
            event.message?.includes("Unexpected token '<'");

          telemetryClient.trackError({
            name: errorObj.name || "WindowError",
            message: event.message || errorObj.message || "Uncaught window exception",
            stack: errorObj.stack,
            errorType: isChunk ? "chunk_load" : "uncaught_window_error",
            severity: isChunk ? "fatal" : "high",
          });
        } catch {}
      });

      // 3. Global Unhandled Promise Rejections
      window.addEventListener("unhandledrejection", (event) => {
        try {
          const reason = event.reason;
          const msg =
            typeof reason === "string"
              ? reason
              : reason?.message || "Unhandled promise rejection";
          const isChunk =
            msg.includes("Loading chunk") ||
            msg.includes("ChunkLoadError") ||
            msg.includes("Failed to fetch dynamically imported module");

          telemetryClient.trackError({
            name: reason?.name || "UnhandledRejection",
            message: msg,
            stack: reason?.stack,
            errorType: isChunk ? "chunk_load" : "unhandled_rejection",
            severity: isChunk ? "fatal" : "medium",
          });
        } catch {}
      });

      // 4. Web Vitals Observers (LCP, CLS, INP) via standard PerformanceObserver
      if (typeof PerformanceObserver !== "undefined") {
        try {
          // LCP Observer
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            if (lastEntry && typeof lastEntry.startTime === "number") {
              const val = Math.round(lastEntry.startTime);
              telemetryClient.trackWebVital(
                "LCP",
                val,
                val < 2500 ? "good" : val < 4000 ? "needs_improvement" : "poor"
              );
            }
          });
          lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}

        try {
          // CLS Observer
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value || 0;
              }
            }
            const rating = clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs_improvement" : "poor";
            telemetryClient.trackWebVital("CLS", Math.round(clsValue * 1000) / 1000, rating);
          });
          clsObserver.observe({ type: "layout-shift", buffered: true });
        } catch {}
      }

      // 5. Lightweight Heartbeat (every 10 minutes, throttled when hidden)
      heartbeatInterval = setInterval(() => {
        try {
          if (document.hidden) return; // Respect background tab throttling
          telemetryQueue.enqueue({
            type: "heartbeat",
            activeTab: !document.hidden,
          });
        } catch {}
      }, 10 * 60 * 1000);
    } catch {
      // Safe fallback: never throw in telemetry
    }
  },

  /**
   * Tracks feature usage (deduplicated automatically)
   */
  trackFeature(
    feature: string,
    action: FeatureAction = "used",
    metadata?: Record<string, string | number | boolean>
  ): void {
    try {
      telemetryQueue.enqueue({
        type: "feature_usage",
        feature: sanitizeText(feature, 50),
        action,
        metadata,
      });
    } catch {}
  },

  /**
   * Tracks an error event (sanitizing stack and stripping sensitive info)
   */
  trackError(
    errorOrParams:
      | Error
      | {
          name?: string;
          message: string;
          stack?: string;
          componentStack?: string;
          errorType?:
            | "react_boundary"
            | "uncaught_window_error"
            | "unhandled_rejection"
            | "chunk_load"
            | "invalid_state";
          severity?: ErrorSeverity;
          route?: string;
          feature?: string;
          handled?: boolean;
        },
    extra?: {
      route?: string;
      feature?: string;
      severity?: ErrorSeverity;
      handled?: boolean;
      componentStack?: string;
    }
  ): void {
    try {
      let rawName = "Error";
      let rawMsg = "Unknown error";
      let rawStack: string | undefined;
      let componentStack: string | undefined = extra?.componentStack;
      let severity: ErrorSeverity = extra?.severity || "high";

      if (errorOrParams instanceof Error) {
        rawName = errorOrParams.name;
        rawMsg = errorOrParams.message;
        rawStack = errorOrParams.stack;
      } else if (typeof errorOrParams === "object") {
        rawName = errorOrParams.name || "Error";
        rawMsg = errorOrParams.message;
        rawStack = errorOrParams.stack;
        componentStack = errorOrParams.componentStack || componentStack;
        severity = errorOrParams.severity || severity;
      }

      const sanitized = sanitizeError(
        { name: rawName, message: rawMsg, stack: rawStack },
        componentStack
      );

      const route = extra?.route || (typeof window !== "undefined" ? window.location.pathname : "/");
      const isPwa =
        typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)")?.matches ||
          (window.navigator as any)?.standalone === true);
      const isMobile =
        typeof window !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      telemetryQueue.enqueue({
        type: "client_error",
        errorType: "react_boundary",
        name: sanitized.name,
        message: sanitized.message,
        sanitizedStack: sanitized.stack,
        componentStack,
        route,
        severity,
        appVersion: APP_VERSION,
        platform: isPwa ? "pwa_installed" : isMobile ? "mobile" : "desktop",
      });
    } catch {}
  },

  /**
   * Session start telemetry event
   */
  trackSessionStart(_userId?: string): void {
    try {
      telemetryQueue.enqueue({
        type: "session_lifecycle",
        lifecycle: "start",
      });
    } catch {}
  },

  /**
   * Session end telemetry event
   */
  trackSessionEnd(): void {
    try {
      telemetryQueue.enqueue({
        type: "session_lifecycle",
        lifecycle: "end",
      });
    } catch {}
  },

  /**
   * Tracks network API calls / errors
   */
  trackNetwork(params: {
    endpoint: string;
    method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    status: number;
    durationMs: number;
    errorMessage?: string;
  }): void {
    try {
      telemetryQueue.enqueue({
        type: "network_error",
        endpoint: sanitizeUrl(params.endpoint),
        method: params.method || "GET",
        status: params.status,
        durationMs: Math.round(params.durationMs),
        sanitizedErrorMessage: sanitizeText(params.errorMessage, 200),
      });
    } catch {}
  },

  /**
   * Tracks IndexedDB performance or slow queries
   */
  trackIdb(params: {
    operation: "read" | "write" | "delete" | "query" | "bulk_write";
    storeName: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }): void {
    try {
      // Only track if failed or slow (> 150ms) to conserve bandwidth
      if (params.success && params.durationMs < 150) return;

      telemetryQueue.enqueue({
        type: "idb_metric",
        operation: params.operation,
        storeName: sanitizeText(params.storeName, 40),
        durationMs: Math.round(params.durationMs),
        success: params.success,
        errorSnippet: sanitizeText(params.error, 150),
      });
    } catch {}
  },

  /**
   * Tracks Glory AI latency and execution outcomes
   */
  trackAI(params: {
    feature: "glory_copilot" | "voice_transcription" | "roadmap_generation" | "task_extractor";
    durationMs: number;
    success: boolean;
    errorCode?: string;
    estimatedTokens?: number;
  }): void {
    try {
      telemetryQueue.enqueue({
        type: "ai_metric",
        feature: params.feature,
        durationMs: Math.round(params.durationMs),
        success: params.success,
        errorCode: sanitizeText(params.errorCode, 50),
        estimatedTokens: params.estimatedTokens,
      });
    } catch {}
  },

  /**
   * Tracks Web Vitals
   */
  trackWebVital(
    name: "LCP" | "CLS" | "INP" | "TTFB" | "FID",
    value: number,
    rating: "good" | "needs_improvement" | "poor"
  ): void {
    try {
      telemetryQueue.enqueue({
        type: "web_vital",
        name,
        value,
        rating,
      });
    } catch {}
  },

  /**
   * Tracks Supabase auth or sync anomalies
   */
  trackAuthSync(
    event: "auth_failure" | "session_expired" | "sync_conflict" | "sync_failed",
    details?: string
  ): void {
    try {
      telemetryQueue.enqueue({
        type: "auth_sync_event",
        event,
        details: sanitizeText(details, 200),
      });
    } catch {}
  },

  /**
   * Submits user feedback durably (queued offline in IDB if network unavailable)
   */
  async submitFeedbackDurable(payload: {
    category: "problem" | "support" | "feedback" | "review" | "suggestion";
    message: string;
    subject?: string;
    rating?: number | null;
    featureArea?: string;
    severity?: string;
    technicalContext?: Record<string, any>;
  }): Promise<void> {
    try {
      const feedbackCategory = payload.category === "suggestion" ? "feedback" : payload.category;
      const feedbackRecord: DurableFeedbackPayload = {
        id: generateAnonymousSessionId(),
        category: feedbackCategory,
        subject: sanitizeText(payload.subject, 100),
        message: sanitizeText(payload.message, 2000),
        rating: payload.rating,
        appVersion: APP_VERSION,
        technicalContext: {
          platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 150) : "unknown",
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          featureArea: payload.featureArea,
          severity: payload.severity,
          ...payload.technicalContext,
        },
        submittedAt: new Date().toISOString(),
        retryCount: 0,
      };

      await telemetryQueue.enqueueFeedback(feedbackRecord);
    } catch {}
  },

  /**
   * Updates guest status when auth changes
   */
  updateGuestStatus(isGuest: boolean): void {
    try {
      telemetryQueue.setGuestStatus(isGuest);
    } catch {}
  },
};
