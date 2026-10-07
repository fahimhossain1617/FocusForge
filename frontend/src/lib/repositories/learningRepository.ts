/**
 * Learning Hub Repository (lib/repositories/learningRepository.ts)
 */

import { db, type DexieLearningFolder, type DexieLearningLog } from "../db";
import type { LearningFolder, LearningLog } from "../../types";

export const learningRepository = {
  // ==================== FOLDERS ====================

  async getFolders(userId: string, includeDeleted = false): Promise<LearningFolder[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.learning_folders
      .where("userId")
      .equals(cleanUserId)
      .toArray();
    if (includeDeleted) return items;
    return items.filter((f) => !f.isDeleted);
  },

  async saveFolder(userId: string, folder: LearningFolder): Promise<LearningFolder> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = folder.id || `folder_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieLearningFolder = {
      ...folder,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: (folder as any).updatedAt || folder.createdAt || now,
      createdAt: folder.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.learning_folders, db.sync_queue], async () => {
      await db.learning_folders.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "learning_folders", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "learning_folders",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async softDeleteFolder(userId: string, folderId: string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const localKey = db.makeLocalKey(cleanUserId, folderId);

    const existing = await db.learning_folders.get(localKey);
    const tombstone: DexieLearningFolder = {
      ...(existing || { id: folderId, name: "" }),
      id: folderId,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieLearningFolder;

    await db.transaction("rw", [db.learning_folders, db.learning_logs, db.sync_queue], async () => {
      await db.learning_folders.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "learning_folders", folderId);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "learning_folders",
          recordId: folderId,
          updatedAt: now,
          isDeleted: true,
        });
      }

      // Cascade soft-delete logs
      const logs = await db.learning_logs
        .where("[userId+folderId]")
        .equals([cleanUserId, folderId])
        .toArray();

      for (const log of logs) {
        await db.learning_logs.put({
          ...log,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        });

        if (cleanUserId !== "guest") {
          const logQueueKey = db.makeSyncQueueKey(cleanUserId, "learning_logs", log.id);
          await db.sync_queue.put({
            localKey: logQueueKey,
            userId: cleanUserId,
            storeName: "learning_logs",
            recordId: log.id,
            updatedAt: now,
            isDeleted: true,
          });
        }
      }
    });
  },

  // ==================== LOGS ====================

  async getLogs(userId: string, includeDeleted = false): Promise<LearningLog[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.learning_logs
      .where("userId")
      .equals(cleanUserId)
      .toArray();
    if (includeDeleted) return items;
    return items.filter((l) => !l.isDeleted);
  },

  async saveLog(userId: string, log: LearningLog): Promise<LearningLog> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = log.id || `log_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieLearningLog = {
      ...log,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: (log as any).updatedAt || (log as any).createdAt || log.date || now,
      createdAt: (log as any).createdAt || log.date || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.learning_logs, db.sync_queue], async () => {
      await db.learning_logs.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "learning_logs", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "learning_logs",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async softDeleteLog(userId: string, logId: string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const localKey = db.makeLocalKey(cleanUserId, logId);

    const existing = await db.learning_logs.get(localKey);
    const tombstone: DexieLearningLog = {
      ...(existing || { id: logId, folderId: "", date: "", minutes: 0 }),
      id: logId,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieLearningLog;

    await db.transaction("rw", [db.learning_logs, db.sync_queue], async () => {
      await db.learning_logs.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "learning_logs", logId);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "learning_logs",
          recordId: logId,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },
};
