import { LearningFolder, LearningLog } from "../types";
import { fetchBackend } from "../lib/apiClient";

export const learningDbService = {
  /**
   * Fetches all learning folders and logs belonging to the user via Backend API.
   */
  async fetchLearningData(userId?: string): Promise<{ folders: LearningFolder[]; logs: LearningLog[] }> {
    try {
      return await fetchBackend<{ folders: LearningFolder[]; logs: LearningLog[] }>("/api/learning/data");
    } catch (err) {
      console.error("[learningDbService] Unexpected error fetching learning data:", err);
      return { folders: [], logs: [] };
    }
  },

  /**
   * Saves or creates a learning folder via Backend API.
   */
  async saveFolder(folder: LearningFolder, userId?: string): Promise<void> {
    try {
      await fetchBackend("/api/learning/folders", {
        method: "POST",
        body: JSON.stringify(folder),
      });
    } catch (err) {
      console.warn("[learningDbService] Exception saving folder:", err);
    }
  },

  /**
   * Updates an existing folder (e.g., toggle completion or rename) via Backend API.
   */
  async updateFolder(folderId: string, updates: Partial<LearningFolder>, userId?: string): Promise<void> {
    try {
      await fetchBackend(`/api/learning/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn("[learningDbService] Exception updating folder:", err);
    }
  },

  /**
   * Deletes a folder and all its associated logs via Backend API.
   */
  async deleteFolder(folderId: string, userId?: string): Promise<void> {
    try {
      await fetchBackend(`/api/learning/folders/${folderId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[learningDbService] Exception deleting folder:", err);
    }
  },

  /**
   * Saves or creates a learning log via Backend API.
   */
  async saveLog(log: LearningLog, userId?: string): Promise<void> {
    try {
      await fetchBackend("/api/learning/logs", {
        method: "POST",
        body: JSON.stringify(log),
      });
    } catch (err) {
      console.warn("[learningDbService] Exception saving learning log:", err);
    }
  },

  /**
   * Deletes a learning log via Backend API.
   */
  async deleteLog(logId: string, userId?: string): Promise<void> {
    try {
      await fetchBackend(`/api/learning/logs/${logId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[learningDbService] Exception deleting learning log:", err);
    }
  },
};
