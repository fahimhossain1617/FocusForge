import { MindItem } from "../types";
import { fetchBackend } from "../lib/apiClient";

export const mindService = {
  /**
   * Fetches all mind items belonging to the authenticated user via Backend API.
   */
  async fetchMindItems(userId: string): Promise<MindItem[]> {
    try {
      return await fetchBackend<MindItem[]>("/api/mind");
    } catch (err) {
      console.error("[mindService] Unexpected error fetching mind items:", err);
      return [];
    }
  },

  /**
   * Saves or creates a mind item via Backend API.
   */
  async saveMindItem(item: MindItem, userId: string): Promise<void> {
    try {
      await fetchBackend("/api/mind", {
        method: "POST",
        body: JSON.stringify(item),
      });
    } catch (err) {
      console.warn("[mindService] Exception saving mind item:", err);
    }
  },

  /**
   * Updates the content of a mind item via Backend API.
   */
  async updateMindItem(id: string, content: string, userId: string): Promise<void> {
    try {
      await fetchBackend("/api/mind", {
        method: "POST",
        body: JSON.stringify({ id, content }),
      });
    } catch (err) {
      console.warn("[mindService] Exception updating mind item:", err);
    }
  },

  /**
   * Deletes a mind item via Backend API.
   */
  async deleteMindItem(id: string, userId: string): Promise<void> {
    try {
      await fetchBackend(`/api/mind/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[mindService] Exception deleting mind item:", err);
    }
  },

  /**
   * Deletes all mind items belonging to the user via Backend API.
   */
  async deleteAllMindItems(userId: string): Promise<void> {
    try {
      await fetchBackend("/api/mind", {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[mindService] Exception deleting all mind items:", err);
    }
  },
};
