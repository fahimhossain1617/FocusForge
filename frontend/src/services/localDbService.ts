/**
 * FocusForge Local-First Database Service (localDbService.ts)
 * 
 * Provides an enterprise-grade, versioned, multi-store IndexedDB engine.
 * Guarantees strict user isolation by scoping every store and record to the authenticated user ID.
 * Supports:
 * - Structured records for Tasks, Notes, Diary, Focus, Skills, Mind, and AI
 * - Binary/Image attachments stored locally without third-party cloud leakage
 * - Soft-deletes with tombstones for conflict-free E2EE synchronization
 * - Fast multi-index querying and pagination
 * - Complete database export / import for disaster recovery
 */

export const LOCAL_DB_NAME = "focusforge_local_v3";
export const LOCAL_DB_VERSION = 1;

export interface BaseRecord {
  id: string | number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  syncVersion?: number;
  [key: string]: any;
}

export type StoreName =
  | "tasks"
  | "routine_templates"
  | "notes"
  | "attachments"
  | "mind_items"
  | "diary_topics"
  | "diary_entries"
  | "focus_sessions"
  | "learning_folders"
  | "learning_logs"
  | "ai_sessions"
  | "ai_messages"
  | "ai_memory"
  | "app_preferences"
  | "sync_queue";

class LocalDatabaseManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return Promise.reject(new Error("IndexedDB is not available in this environment"));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;

        // Helper to ensure store with standard user-scoped indices
        const ensureStore = (storeName: StoreName, keyPath: string = "localKey") => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath });
            store.createIndex("by_user", "userId", { unique: false });
            store.createIndex("by_user_updated", ["userId", "updatedAt"], { unique: false });
            return store;
          }
          return request.transaction!.objectStore(storeName);
        };

        // 1. Tasks
        const taskStore = ensureStore("tasks");
        if (!taskStore.indexNames.contains("by_user_date")) {
          taskStore.createIndex("by_user_date", ["userId", "targetDate"], { unique: false });
        }

        // 2. Routine Templates
        ensureStore("routine_templates");

        // 3. Notes
        const noteStore = ensureStore("notes");
        if (!noteStore.indexNames.contains("by_user_category")) {
          noteStore.createIndex("by_user_category", ["userId", "category"], { unique: false });
        }

        // 4. Attachments (Binary Blobs & Images)
        ensureStore("attachments");

        // 5. Mind Items (Brain Dump / Capture)
        ensureStore("mind_items");

        // 6. Diary Topics
        ensureStore("diary_topics");

        // 7. Diary Entries
        const diaryEntryStore = ensureStore("diary_entries");
        if (!diaryEntryStore.indexNames.contains("by_user_topic")) {
          diaryEntryStore.createIndex("by_user_topic", ["userId", "topicId"], { unique: false });
        }
        if (!diaryEntryStore.indexNames.contains("by_user_date")) {
          diaryEntryStore.createIndex("by_user_date", ["userId", "date"], { unique: false });
        }

        // 8. Focus Sessions
        const focusStore = ensureStore("focus_sessions");
        if (!focusStore.indexNames.contains("by_user_start")) {
          focusStore.createIndex("by_user_start", ["userId", "startTime"], { unique: false });
        }

        // 9. Learning Folders
        ensureStore("learning_folders");

        // 10. Learning Logs
        const learningLogsStore = ensureStore("learning_logs");
        if (!learningLogsStore.indexNames.contains("by_user_folder")) {
          learningLogsStore.createIndex("by_user_folder", ["userId", "folderId"], { unique: false });
        }

        // 11. AI Sessions
        ensureStore("ai_sessions");

        // 12. AI Messages
        const aiMsgStore = ensureStore("ai_messages");
        if (!aiMsgStore.indexNames.contains("by_user_session")) {
          aiMsgStore.createIndex("by_user_session", ["userId", "sessionId"], { unique: false });
        }

        // 13. AI Memory (User-approved long term memory items)
        const aiMemStore = ensureStore("ai_memory");
        if (!aiMemStore.indexNames.contains("by_user_category")) {
          aiMemStore.createIndex("by_user_category", ["userId", "category"], { unique: false });
        }

        // 14. App Preferences
        ensureStore("app_preferences");

        // 15. Sync Queue (For dirty changes pending E2EE sync)
        ensureStore("sync_queue");
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Generates a composite unique key for strict account isolation:
   * "userId:recordId"
   */
  public makeLocalKey(userId: string, recordId: string | number): string {
    const cleanUserId = userId?.trim() || "guest";
    return `${cleanUserId}::${recordId}`;
  }

  /**
   * Puts a record into the specified store, enforcing userId scoping.
   */
  public async put<T extends BaseRecord>(storeName: StoreName, record: T): Promise<T> {
    const db = await this.getDB();
    const cleanUserId = record.userId?.trim() || "guest";
    const now = new Date().toISOString();
    
    const enrichedRecord = {
      ...record,
      userId: cleanUserId,
      localKey: this.makeLocalKey(cleanUserId, record.id),
      updatedAt: record.updatedAt || now,
      createdAt: record.createdAt || now,
      isDeleted: record.isDeleted || false,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName, "sync_queue"], "readwrite");
      const store = tx.objectStore(storeName);
      const syncStore = tx.objectStore("sync_queue");

      store.put(enrichedRecord);

      // Track as a dirty record for E2EE sync (excluding attachments from direct queue)
      if (storeName !== "attachments" && cleanUserId !== "guest") {
        syncStore.put({
          localKey: enrichedRecord.localKey,
          storeName,
          recordId: record.id,
          userId: cleanUserId,
          updatedAt: enrichedRecord.updatedAt,
          isDeleted: enrichedRecord.isDeleted,
        });
      }

      tx.oncomplete = () => resolve(enrichedRecord);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /**
   * Puts multiple records in a single high-performance transaction.
   */
  public async bulkPut<T extends BaseRecord>(storeName: StoreName, records: T[]): Promise<void> {
    if (!records || records.length === 0) return;
    const db = await this.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName, "sync_queue"], "readwrite");
      const store = tx.objectStore(storeName);
      const syncStore = tx.objectStore("sync_queue");

      for (const record of records) {
        const cleanUserId = record.userId?.trim() || "guest";
        const enriched = {
          ...record,
          userId: cleanUserId,
          localKey: this.makeLocalKey(cleanUserId, record.id),
          updatedAt: record.updatedAt || now,
          createdAt: record.createdAt || now,
          isDeleted: record.isDeleted || false,
        };
        store.put(enriched);

        if (storeName !== "attachments" && cleanUserId !== "guest") {
          syncStore.put({
            localKey: enriched.localKey,
            storeName,
            recordId: record.id,
            userId: cleanUserId,
            updatedAt: enriched.updatedAt,
            isDeleted: enriched.isDeleted,
          });
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Gets a specific record by user ID and record ID.
   */
  public async get<T extends BaseRecord>(storeName: StoreName, userId: string, recordId: string | number): Promise<T | null> {
    const db = await this.getDB();
    const key = this.makeLocalKey(userId, recordId);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => {
        const item = req.result;
        if (!item || item.isDeleted) {
          resolve(null);
        } else {
          resolve(item as T);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Fetches all non-deleted records for a specific user.
   */
  public async getAllForUser<T extends BaseRecord>(
    storeName: StoreName,
    userId: string,
    includeDeleted: boolean = false
  ): Promise<T[]> {
    const db = await this.getDB();
    const cleanUserId = userId?.trim() || "guest";

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index("by_user");
      const req = index.getAll(IDBKeyRange.only(cleanUserId));

      req.onsuccess = () => {
        const results = req.result as (T & { isDeleted?: boolean })[];
        if (includeDeleted) {
          resolve(results);
        } else {
          resolve(results.filter((r) => !r.isDeleted));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Soft-deletes a record by creating a tombstone so deletions propagate correctly across devices.
   */
  public async softDelete(storeName: StoreName, userId: string, recordId: string | number): Promise<void> {
    const db = await this.getDB();
    const key = this.makeLocalKey(userId, recordId);
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName, "sync_queue"], "readwrite");
      const store = tx.objectStore(storeName);
      const syncStore = tx.objectStore("sync_queue");

      const getReq = store.get(key);
      getReq.onsuccess = () => {
        const existing = getReq.result || { id: recordId, userId: cleanUserId };
        const tombstone = {
          ...existing,
          localKey: key,
          userId: cleanUserId,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        };
        store.put(tombstone);

        if (cleanUserId !== "guest") {
          syncStore.put({
            localKey: key,
            storeName,
            recordId,
            userId: cleanUserId,
            updatedAt: now,
            isDeleted: true,
          });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Permanently hard-deletes a record from local storage (used when user requests purge).
   */
  public async hardDelete(storeName: StoreName, userId: string, recordId: string | number): Promise<void> {
    const db = await this.getDB();
    const key = this.makeLocalKey(userId, recordId);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName, "sync_queue"], "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.objectStore("sync_queue").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clears all local records belonging to a specific user (used on account wipe).
   * Does NOT touch other accounts on the device.
   */
  public async clearAllUserData(userId: string): Promise<void> {
    if (!userId) return;
    const db = await this.getDB();
    const cleanUserId = userId.trim();

    const allStores: StoreName[] = [
      "tasks",
      "routine_templates",
      "notes",
      "attachments",
      "mind_items",
      "diary_topics",
      "diary_entries",
      "focus_sessions",
      "learning_folders",
      "learning_logs",
      "ai_sessions",
      "ai_messages",
      "ai_memory",
      "app_preferences",
      "sync_queue",
    ];

    for (const storeName of allStores) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const index = store.index("by_user");
        const req = index.openCursor(IDBKeyRange.only(cleanUserId));

        req.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    }
  }

  /**
   * Dumps entire user dataset for local backup export.
   */
  public async exportUserData(userId: string): Promise<{
    version: number;
    exportedAt: string;
    userId: string;
    data: Record<string, any[]>;
  }> {
    const cleanUserId = userId.trim();
    const stores: StoreName[] = [
      "tasks",
      "routine_templates",
      "notes",
      "mind_items",
      "diary_topics",
      "diary_entries",
      "focus_sessions",
      "learning_folders",
      "learning_logs",
      "ai_sessions",
      "ai_messages",
      "ai_memory",
      "app_preferences",
    ];

    const data: Record<string, any[]> = {};
    for (const s of stores) {
      data[s] = await this.getAllForUser(s, cleanUserId, false);
    }

    return {
      version: LOCAL_DB_VERSION,
      exportedAt: new Date().toISOString(),
      userId: cleanUserId,
      data,
    };
  }

  /**
   * Imports a user dataset backup into local storage.
   */
  public async importUserData(userId: string, backup: { data: Record<string, any[]> }): Promise<void> {
    if (!backup?.data) return;
    const cleanUserId = userId.trim();

    for (const [storeName, records] of Object.entries(backup.data)) {
      if (Array.isArray(records) && records.length > 0) {
        const mapped = records.map((r) => ({ ...r, userId: cleanUserId }));
        await this.bulkPut(storeName as StoreName, mapped);
      }
    }
  }

  /**
   * Pulls pending dirty records from sync queue for E2EE push.
   */
  public async getPendingSyncQueue(userId: string): Promise<any[]> {
    return this.getAllForUser("sync_queue", userId, true);
  }

  /**
   * Clears synced items from the queue after successful E2EE server confirmation.
   */
  public async acknowledgeSyncQueue(userId: string, localKeys: string[]): Promise<void> {
    if (!localKeys || localKeys.length === 0) return;
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      for (const k of localKeys) {
        store.delete(k);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDb = new LocalDatabaseManager();
