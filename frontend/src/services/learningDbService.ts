import { LearningFolder, LearningLog } from "../types";
import { localDb } from "./localDbService";

export const learningDbService = {
  /**
   * Fetches all learning folders and logs belonging to the user from local-first database.
   */
  async fetchLearningData(userId?: string): Promise<{ folders: LearningFolder[]; logs: LearningLog[] }> {
    try {
      const cleanUserId = userId || "guest";
      const folders = await localDb.getAllForUser<LearningFolder>("learning_folders", cleanUserId, false);
      const logs = await localDb.getAllForUser<LearningLog>("learning_logs", cleanUserId, false);
      return { folders, logs };
    } catch (err) {
      console.error("[learningDbService] Error fetching local learning data:", err);
      return { folders: [], logs: [] };
    }
  },

  /**
   * Saves or creates a learning folder in local-first database.
   */
  async saveFolder(folder: LearningFolder, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("learning_folders", {
        ...folder,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[learningDbService] Exception saving local folder:", err);
    }
  },

  /**
   * Updates an existing folder in local-first database.
   */
  async updateFolder(folderId: string, updates: Partial<LearningFolder>, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      const existing = await localDb.get<LearningFolder>("learning_folders", cleanUserId, folderId);
      if (existing) {
        await localDb.put("learning_folders", {
          ...existing,
          ...updates,
          userId: cleanUserId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[learningDbService] Exception updating local folder:", err);
    }
  },

  /**
   * Soft-deletes a folder and all its associated logs in local-first database.
   */
  async deleteFolder(folderId: string, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("learning_folders", cleanUserId, folderId);

      const logs = await localDb.getAllForUser<LearningLog>("learning_logs", cleanUserId, false);
      for (const log of logs) {
        if (log.folderId === folderId) {
          await localDb.softDelete("learning_logs", cleanUserId, log.id);
        }
      }
    } catch (err) {
      console.warn("[learningDbService] Exception deleting local folder:", err);
    }
  },

  /**
   * Saves or creates a learning log in local-first database.
   */
  async saveLog(log: LearningLog, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("learning_logs", {
        ...log,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[learningDbService] Exception saving local log:", err);
    }
  },

  /**
   * Soft-deletes a learning log in local-first database.
   */
  async deleteLog(logId: string, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("learning_logs", cleanUserId, logId);
    } catch (err) {
      console.warn("[learningDbService] Exception deleting local log:", err);
    }
  },
};
