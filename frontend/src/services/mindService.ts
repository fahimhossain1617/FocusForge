import { MindItem } from "../types";
import { localDb } from "./localDbService";

export const mindService = {
  /**
   * Fetches all mind items belonging to the user from local-first database.
   */
  async fetchMindItems(userId: string): Promise<MindItem[]> {
    try {
      return await localDb.getAllForUser<MindItem>("mind_items", userId || "guest", false);
    } catch (err) {
      console.error("[mindService] Error fetching local mind items:", err);
      return [];
    }
  },

  /**
   * Saves or creates a mind item in local-first database.
   */
  async saveMindItem(item: MindItem, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("mind_items", {
        ...item,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[mindService] Exception saving local mind item:", err);
    }
  },

  /**
   * Updates the content of a mind item in local-first database.
   */
  async updateMindItem(id: string, content: string, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      const existing = await localDb.get<MindItem>("mind_items", cleanUserId, id);
      if (existing) {
        await localDb.put("mind_items", {
          ...existing,
          content,
          userId: cleanUserId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[mindService] Exception updating local mind item:", err);
    }
  },

  /**
   * Soft-deletes a mind item in local-first database.
   */
  async deleteMindItem(id: string, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("mind_items", cleanUserId, id);
    } catch (err) {
      console.warn("[mindService] Exception deleting local mind item:", err);
    }
  },

  /**
   * Deletes all mind items belonging to the user.
   */
  async clearAllMindItems(userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      const all = await localDb.getAllForUser<MindItem>("mind_items", cleanUserId, false);
      for (const item of all) {
        await localDb.softDelete("mind_items", cleanUserId, item.id);
      }
    } catch (err) {
      console.warn("[mindService] Exception clearing mind items:", err);
    }
  },

  async deleteAllMindItems(userId: string): Promise<void> {
    return this.clearAllMindItems(userId);
  },
};
