/**
 * Focentia Telemetry Queue & Dispatcher
 *
 * Implements bounded in-memory & IndexedDB queueing, event deduplication,
 * exponential backoff, batching, reconnect flushing, and keepalive/beacon pagehide dispatch.
 *
 * RECURSION GUARD:
 * Dispatch failures never generate telemetry events, preventing infinite error cascades.
 */

import { telemetryDb } from "./telemetryDb";
import {
  QueuedTelemetryRecord,
  TelemetryPayload,
  DurableFeedbackPayload,
} from "./telemetryTypes";
import { generateAnonymousSessionId } from "./telemetrySanitizer";

const BATCH_SIZE = 25;
const DEBOUNCE_MS = 5000;
const DEDUPE_WINDOW_MS = 30000;

// Module level state
let sessionId: string = "";
let isGuestUser: boolean = true;
let appVersionStr: string = "0.1.0";
let flushTimer: NodeJS.Timeout | null = null;
let isDispatching: boolean = false;
let backoffDelayMs = 1000;
let consecutiveFailures = 0;

// Deduplication cache: key -> timestamp
const recentFeatureEvents = new Map<string, number>();

export const telemetryQueue = {
  /**
   * Initializes session identification and registers window lifecycle listeners
   */
  init(guest: boolean, version: string = "0.1.0"): void {
    if (typeof window === "undefined") return;

    if (!sessionId) {
      try {
        sessionId = sessionStorage.getItem("focentia_telemetry_sess") || "";
        if (!sessionId) {
          sessionId = generateAnonymousSessionId();
          sessionStorage.setItem("focentia_telemetry_sess", sessionId);
        }
      } catch {
        sessionId = generateAnonymousSessionId();
      }
    }

    isGuestUser = guest;
    appVersionStr = version;

    // Listen for reconnection
    window.addEventListener("online", () => {
      backoffDelayMs = 1000;
      consecutiveFailures = 0;
      telemetryQueue.flush();
    });

    // Listen for tab hide / unload to dispatch remaining queue via sendBeacon or keepalive
    window.addEventListener("pagehide", () => {
      telemetryQueue.flushSyncBeacon();
    });
  },

  setGuestStatus(guest: boolean): void {
    isGuestUser = guest;
  },

  /**
   * Queues an event with deduplication for high-frequency actions
   */
  async enqueue(payload: TelemetryPayload): Promise<void> {
    if (typeof window === "undefined") return;

    // Deduplication check for feature_usage
    if (payload.type === "feature_usage") {
      const dedupeKey = `${payload.feature}::${payload.action}`;
      const now = Date.now();
      const lastSeen = recentFeatureEvents.get(dedupeKey);
      if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) {
        return; // Suppress redundant event within 30s
      }
      recentFeatureEvents.set(dedupeKey, now);

      // Clean old dedupe entries
      if (recentFeatureEvents.size > 50) {
        for (const [key, ts] of recentFeatureEvents.entries()) {
          if (now - ts > DEDUPE_WINDOW_MS) {
            recentFeatureEvents.delete(key);
          }
        }
      }
    }

    const record: QueuedTelemetryRecord = {
      id: generateAnonymousSessionId(),
      idempotencyKey: `ff_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || "sess_default",
      isGuest: isGuestUser,
      appVersion: appVersionStr,
      event: payload,
      retryCount: 0,
    };

    await telemetryDb.enqueueEvent(record);

    // Schedule debounced flush
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        telemetryQueue.flush();
      }, DEBOUNCE_MS);
    }
  },

  /**
   * Dispatches queued events to POST /api/telemetry/ingest
   */
  async flush(): Promise<void> {
    if (isDispatching || typeof window === "undefined" || !navigator.onLine) {
      return;
    }

    isDispatching = true;
    try {
      const events = await telemetryDb.getQueuedEvents(BATCH_SIZE);
      if (events.length === 0) {
        isDispatching = false;
        // Also flush feedback queue if any
        await telemetryQueue.flushFeedbackQueue();
        return;
      }

      const response = await fetch("/api/telemetry/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        // Success: prune sent events
        const sentIds = events.map((e) => e.id);
        await telemetryDb.removeEvents(sentIds);
        consecutiveFailures = 0;
        backoffDelayMs = 1000;

        // If more items remain, queue next batch
        const remaining = await telemetryDb.getQueuedEvents(1);
        if (remaining.length > 0) {
          setTimeout(() => telemetryQueue.flush(), 250);
        }
      } else {
        // Server rejected or endpoint not connected
        handleDispatchFailure(events);
      }
    } catch {
      // Network failure
      handleDispatchFailure([]);
    } finally {
      isDispatching = false;
    }

    // Flush any pending durable feedback
    await telemetryQueue.flushFeedbackQueue();
  },

  /**
   * Synchronous / Keepalive flush for pagehide / unload
   */
  flushSyncBeacon(): void {
    if (typeof window === "undefined") return;
    try {
      telemetryDb.getQueuedEvents(15).then((events) => {
        if (!events || events.length === 0) return;
        const payload = JSON.stringify({ events });
        if (typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/telemetry/ingest", blob);
        } else {
          fetch("/api/telemetry/ingest", {
            method: "POST",
            body: payload,
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => {});
        }
      });
    } catch {}
  },

  /**
   * Durable feedback submission & queue flush to POST /api/feedback/submit
   */
  async enqueueFeedback(payload: DurableFeedbackPayload): Promise<void> {
    await telemetryDb.enqueueFeedback(payload);
    telemetryQueue.flushFeedbackQueue();
  },

  async flushFeedbackQueue(): Promise<void> {
    if (typeof window === "undefined" || !navigator.onLine) return;
    try {
      const items = await telemetryDb.getQueuedFeedback(5);
      if (items.length === 0) return;

      for (const item of items) {
        try {
          const res = await fetch("/api/feedback/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (res.ok) {
            await telemetryDb.removeFeedback([item.id]);
          }
        } catch {
          // Keep in queue for next reconnect
          break;
        }
      }
    } catch {}
  },
};

function handleDispatchFailure(events: QueuedTelemetryRecord[]) {
  consecutiveFailures++;
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 60s max
  backoffDelayMs = Math.min(60000, 1000 * Math.pow(2, Math.min(consecutiveFailures, 6)));

  if (events.length > 0) {
    telemetryDb.incrementRetry(events);
  }
}
