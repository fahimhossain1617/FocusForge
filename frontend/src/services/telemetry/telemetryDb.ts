/**
 * Focentia Separate Telemetry Database Layer
 *
 * Backed by a dedicated, small IndexedDB instance: "focentia_telemetry_db".
 * Completely isolated from "focentia_e2ee_db_v1" (focusforge_local_v3) so that user data
 * and encryption structures are NEVER altered or put at risk.
 */

import { QueuedTelemetryRecord, DurableFeedbackPayload } from "./telemetryTypes";

const TELEMETRY_DB_NAME = "focentia_telemetry_db";
const TELEMETRY_DB_VERSION = 1;
const EVENTS_STORE = "telemetry_events";
const FEEDBACK_STORE = "feedback_queue";

const MAX_QUEUED_EVENTS = 200;
const MAX_FEEDBACK_ITEMS = 25;

let dbInstancePromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(TELEMETRY_DB_NAME, TELEMETRY_DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          const store = db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
          const store = db.createObjectStore(FEEDBACK_STORE, { keyPath: "id" });
          store.createIndex("submittedAt", "submittedAt", { unique: false });
        }
      };

      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.warn("[TelemetryDb] Failed to open focentia_telemetry_db");
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbInstancePromise;
}

export const telemetryDb = {
  /**
   * Adds an event to the local queue with bounded size limits.
   */
  async enqueueEvent(record: QueuedTelemetryRecord): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([EVENTS_STORE], "readwrite");
      const store = tx.objectStore(EVENTS_STORE);

      // Check current size to enforce MAX_QUEUED_EVENTS
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result >= MAX_QUEUED_EVENTS) {
          // Prune oldest 25 items
          const index = store.index("timestamp");
          const cursorReq = index.openCursor();
          let deleted = 0;
          cursorReq.onsuccess = (ev) => {
            const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor && deleted < 25) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
        }
        store.put(record);
      };
    } catch {
      // Safe fallback: never throw in telemetry
    }
  },

  /**
   * Retrieves up to limit queued telemetry records.
   */
  async getQueuedEvents(limit: number = 25): Promise<QueuedTelemetryRecord[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return new Promise((resolve) => {
        const tx = db.transaction([EVENTS_STORE], "readonly");
        const store = tx.objectStore(EVENTS_STORE);
        const index = store.index("timestamp");
        const cursorReq = index.openCursor();
        const records: QueuedTelemetryRecord[] = [];

        cursorReq.onsuccess = (ev) => {
          const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && records.length < limit) {
            records.push(cursor.value);
            cursor.continue();
          } else {
            resolve(records);
          }
        };

        cursorReq.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  /**
   * Removes events by IDs after successful ingestion.
   */
  async removeEvents(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([EVENTS_STORE], "readwrite");
      const store = tx.objectStore(EVENTS_STORE);
      for (const id of ids) {
        store.delete(id);
      }
    } catch {
      // Fail silent
    }
  },

  /**
   * Updates retry count and lastAttemptAt for failed events.
   */
  async incrementRetry(records: QueuedTelemetryRecord[]): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([EVENTS_STORE], "readwrite");
      const store = tx.objectStore(EVENTS_STORE);
      const now = new Date().toISOString();

      for (const rec of records) {
        if (rec.retryCount >= 5) {
          // Drop stale records after 5 failed retry cycles
          store.delete(rec.id);
        } else {
          rec.retryCount += 1;
          rec.lastAttemptAt = now;
          store.put(rec);
        }
      }
    } catch {
      // Fail silent
    }
  },

  /**
   * Feedback Queue operations (durable offline storage)
   */
  async enqueueFeedback(payload: DurableFeedbackPayload): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([FEEDBACK_STORE], "readwrite");
      const store = tx.objectStore(FEEDBACK_STORE);
      store.put(payload);
    } catch {}
  },

  async getQueuedFeedback(limit: number = 10): Promise<DurableFeedbackPayload[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return new Promise((resolve) => {
        const tx = db.transaction([FEEDBACK_STORE], "readonly");
        const store = tx.objectStore(FEEDBACK_STORE);
        const cursorReq = store.openCursor();
        const items: DurableFeedbackPayload[] = [];

        cursorReq.onsuccess = (ev) => {
          const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && items.length < limit) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            resolve(items);
          }
        };

        cursorReq.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  async removeFeedback(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([FEEDBACK_STORE], "readwrite");
      const store = tx.objectStore(FEEDBACK_STORE);
      for (const id of ids) {
        store.delete(id);
      }
    } catch {}
  },
};
