import { supabase } from "../lib/supabaseClient";
import { MindItem } from "../types";
import { getBackendUrl } from "../lib/backendUrl";

const getUrl = () => getBackendUrl();

export const mindService = {
  /**
   * Fetches all mind items belonging to the authenticated user from Supabase PostgreSQL.
   */
  async fetchMindItems(userId: string): Promise<MindItem[]> {
    try {
      const { data, error } = await supabase
        .from("mind_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[mindService] Error fetching mind items:", error.message);
        return [];
      }

      if (!data) return [];
      return data.map((row) => ({
        id: row.id,
        content: row.content,
        type: row.type || "thought",
        source: row.source || "home",
        createdAt: row.created_at,
        processedAt: row.processed_at,
      }));
    } catch (err) {
      console.error("[mindService] Unexpected error fetching mind items:", err);
      return [];
    }
  },

  /**
   * Saves or creates a mind item in Supabase PostgreSQL & syncs with Express backend.
   */
  async saveMindItem(item: MindItem, userId: string): Promise<void> {
    try {
      // 1. Supabase PostgreSQL
      const { error } = await supabase.from("mind_items").upsert({
        id: item.id,
        user_id: userId,
        content: item.content,
        type: item.type || "thought",
        source: item.source || "home",
        created_at: item.createdAt,
        processed_at: item.processedAt || null,
      });
      if (error) {
        console.warn("[mindService] Error saving mind item:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/mind`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(item),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[mindService] Exception saving mind item:", err);
    }
  },

  /**
   * Updates the content of a mind item in Supabase PostgreSQL & syncs with backend.
   */
  async updateMindItem(id: string, content: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("mind_items")
        .update({ content })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        console.warn("[mindService] Error updating mind item:", error.message);
      }

      // Sync with Express backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/mind`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, content }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[mindService] Exception updating mind item:", err);
    }
  },

  /**
   * Deletes a mind item from Supabase PostgreSQL & syncs with backend.
   */
  async deleteMindItem(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("mind_items")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        console.warn("[mindService] Error deleting mind item:", error.message);
      }

      // Sync with Express backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/mind/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[mindService] Exception deleting mind item:", err);
    }
  },

  /**
   * Deletes all mind items belonging to the user from Supabase PostgreSQL & syncs with backend.
   */
  async deleteAllMindItems(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("mind_items")
        .delete()
        .eq("user_id", userId);
      if (error) {
        console.warn("[mindService] Error deleting all mind items:", error.message);
      }

      // Sync with Express backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/mind`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[mindService] Exception deleting all mind items:", err);
    }
  },
};
