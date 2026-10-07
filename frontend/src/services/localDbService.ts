/**
 * Focentia Local Database Service (localDbService.ts)
 *
 * Backed by Dexie.js (focentia_e2ee_db_v1).
 * Bridges existing service calls to the high-performance Dexie repository layer
 * ensuring 100% backward compatibility across all existing pages and hooks.
 */

import { db, type DexieBaseRecord } from "../lib/db";

export const LOCAL_DB_NAME = "focentia_e2ee_db_v1";
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
  | "app_state"
  | "sync_queue";

class LocalDatabaseManager {
  public makeLocalKey(userId: string, recordId: string | number): string {
    return db.makeLocalKey(userId, recordId);
  }

  /**
   * Puts a record into the specified Dexie store, enforcing userId scoping.
   */
  public async put<T extends BaseRecord>(storeName: StoreName, record: T): Promise<T> {
    const cleanUserId = record.userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = record.id;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const enrichedRecord = {
      ...record,
      userId: cleanUserId,
      localKey,
      updatedAt: record.updatedAt || now,
      createdAt: record.createdAt || now,
      isDeleted: record.isDeleted || false,
    };

    const table = (db as any)[storeName];
    if (table) {
      await table.put(enrichedRecord);
    }

    // Add dirty record to sync_queue if authenticated and not attachments
    if (storeName !== "attachments" && cleanUserId !== "guest") {
      const queueKey = db.makeSyncQueueKey(cleanUserId, storeName, id);
      await db.sync_queue.put({
        localKey: queueKey,
        userId: cleanUserId,
        storeName,
        recordId: id,
        updatedAt: enrichedRecord.updatedAt,
        isDeleted: Boolean(enrichedRecord.isDeleted),
      });
    }

    return enrichedRecord as T;
  }

  /**
   * Puts multiple records in a single high-performance bulk transaction.
   */
  public async bulkPut<T extends BaseRecord>(storeName: StoreName, records: T[]): Promise<void> {
    if (!records || records.length === 0) return;
    const now = new Date().toISOString();

    const enrichedList = records.map((record) => {
      const cleanUserId = record.userId?.trim() || "guest";
      return {
        ...record,
        userId: cleanUserId,
        localKey: db.makeLocalKey(cleanUserId, record.id),
        updatedAt: record.updatedAt || now,
        createdAt: record.createdAt || now,
        isDeleted: record.isDeleted || false,
      };
    });

    const table = (db as any)[storeName];
    if (table) {
      await table.bulkPut(enrichedList);
    }

    // Enqueue for sync
    const syncItems = enrichedList
      .filter((r) => r.userId !== "guest" && storeName !== "attachments")
      .map((r) => ({
        localKey: db.makeSyncQueueKey(r.userId, storeName, r.id),
        userId: r.userId,
        storeName,
        recordId: r.id,
        updatedAt: r.updatedAt,
        isDeleted: Boolean(r.isDeleted),
      }));

    if (syncItems.length > 0) {
      await db.sync_queue.bulkPut(syncItems);
    }
  }

  /**
   * Gets a specific record by user ID and record ID.
   */
  public async get<T extends BaseRecord>(
    storeName: StoreName,
    userId: string,
    recordId: string | number
  ): Promise<T | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, recordId);

    const table = (db as any)[storeName];
    if (!table) return null;

    const item = await table.get(localKey);
    if (!item || item.isDeleted) return null;
    return item as T;
  }

  /**
   * Fetches all non-deleted records for a specific user from Dexie.
   */
  public async getAllForUser<T extends BaseRecord>(
    storeName: StoreName,
    userId: string,
    includeDeleted = false
  ): Promise<T[]> {
    const cleanUserId = userId?.trim() || "guest";
    const table = (db as any)[storeName];
    if (!table) return [];

    const items = await table.where("userId").equals(cleanUserId).toArray();
    if (includeDeleted) {
      return items as T[];
    }
    return items.filter((r: any) => !r.isDeleted) as T[];
  }

  /**
   * Soft-deletes a record by creating a tombstone so deletions propagate across devices.
   */
  public async softDelete(storeName: StoreName, userId: string, recordId: string | number): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, recordId);
    const now = new Date().toISOString();

    const table = (db as any)[storeName];
    if (!table) return;

    const existing = (await table.get(localKey)) || { id: recordId, userId: cleanUserId };
    const tombstone = {
      ...existing,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    };

    await table.put(tombstone);

    if (cleanUserId !== "guest") {
      const queueKey = db.makeSyncQueueKey(cleanUserId, storeName, recordId);
      await db.sync_queue.put({
        localKey: queueKey,
        storeName,
        recordId,
        userId: cleanUserId,
        updatedAt: now,
        isDeleted: true,
      });
    }
  }

  /**
   * Permanently hard-deletes a record from Dexie storage.
   */
  public async hardDelete(storeName: StoreName, userId: string, recordId: string | number): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, recordId);
    const queueKey = db.makeSyncQueueKey(cleanUserId, storeName, recordId);

    const table = (db as any)[storeName];
    if (table) {
      await table.delete(localKey);
    }
    await db.sync_queue.delete(queueKey);
  }

  /**
   * Clears all local records belonging to a specific user (used on account wipe).
   */
  public async clearAllUserData(userId: string): Promise<void> {
    if (!userId) return;
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
      "app_state",
      "sync_queue",
    ];

    for (const storeName of allStores) {
      const table = (db as any)[storeName];
      if (table) {
        await table.where("userId").equals(cleanUserId).delete();
      }
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
   * Imports a user dataset backup into Dexie storage.
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
    const cleanUserId = userId?.trim() || "guest";
    return await db.sync_queue.where("userId").equals(cleanUserId).toArray();
  }

  /**
   * Clears synced items from the queue after successful server confirmation.
   */
  public async acknowledgeSyncQueue(userId: string, localKeys: string[]): Promise<void> {
    if (!localKeys || localKeys.length === 0) return;
    await db.sync_queue.bulkDelete(localKeys);
  }
}

export const localDb = new LocalDatabaseManager();
