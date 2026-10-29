import { MindItem } from "../types";
import { localDb } from "./localDbService";
import { supabase } from "../lib/supabaseClient";

const GUEST_STORAGE_KEY = "focentia_guest_mind_items";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch (err) {
    console.warn("[mindService] Failed to get session token:", err);
  }
  return { "Content-Type": "application/json" };
}

function getGuestStorage(): MindItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setGuestStorage(items: MindItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("[mindService] Failed to set guest storage:", err);
  }
}

export const mindService = {
  /**
   * Fetches all mind items belonging to the user from local-first database,
   * with cloud sync fallback for authenticated users and localStorage fallback for guests.
   */
  async fetchMindItems(userId: string): Promise<MindItem[]> {
    const cleanUserId = userId || "guest";
    let localItems: MindItem[] = [];

    try {
      localItems = await localDb.getAllForUser<MindItem>("mind_items", cleanUserId, false);
    } catch (err) {
      console.error("[mindService] Error fetching local mind items:", err);
    }

    // Guest fallback: if localDb was empty, hydrate from guest localStorage
    if (cleanUserId === "guest") {
      if (localItems.length === 0) {
        const guestItems = getGuestStorage();
        if (guestItems.length > 0) {
          for (const item of guestItems) {
            await localDb.put("mind_items", { ...item, userId: "guest" }).catch(() => {});
          }
          return guestItems;
        }
      } else {
        // Keep localStorage mirrored
        setGuestStorage(localItems);
      }
      return localItems;
    }

    // Authenticated user: trigger silent non-blocking cloud merge in background
    if (typeof window !== "undefined" && navigator.onLine) {
      setTimeout(async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch("/api/mind-items", { headers });
          if (res.ok) {
            const cloudItems: MindItem[] = await res.json();
            if (Array.isArray(cloudItems) && cloudItems.length > 0) {
              const currentLocal = await localDb.getAllForUser<MindItem>("mind_items", cleanUserId, false).catch(() => []);
              const localMap = new Map(currentLocal.map(i => [i.id, i]));
              for (const cItem of cloudItems) {
                if (!localMap.has(cItem.id)) {
                  await localDb.put("mind_items", { ...cItem, userId: cleanUserId }).catch(() => {});
                }
              }
            }
          }
        } catch (err) {
          console.warn("[mindService] Background cloud fetch warning:", err);
        }
      }, 500);
    }

    return localItems;
  },

  /**
   * Saves or creates a mind item in local-first database and syncs to cloud / guest storage.
   */
  async saveMindItem(item: MindItem, userId: string): Promise<void> {
    const cleanUserId = userId || "guest";
    const record = {
      ...item,
      userId: cleanUserId,
      updatedAt: new Date().toISOString(),
    };

    try {
      await localDb.put("mind_items", record);
    } catch (err) {
      console.warn("[mindService] Exception saving local mind item:", err);
    }

    if (cleanUserId === "guest") {
      const items = getGuestStorage();
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        items[idx] = record;
      } else {
        items.unshift(record);
      }
      setGuestStorage(items);
      return;
    }

    // Authenticated: Sync to Supabase via server API
    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        const headers = await getAuthHeaders();
        fetch("/api/mind-items", {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: item.id,
            content: item.content,
            type: item.type || "thought",
            source: item.source || "home",
            createdAt: item.createdAt,
          }),
        }).catch((e) => console.warn("[mindService] Cloud save warning:", e));
      } catch {}
    }
  },

  /**
   * Updates the content of a mind item in local-first database and syncs to cloud / guest storage.
   */
  async updateMindItem(id: string, content: string, userId: string): Promise<void> {
    const cleanUserId = userId || "guest";
    let updatedRecord: MindItem | null = null;

    try {
      const existing = await localDb.get<MindItem>("mind_items", cleanUserId, id);
      if (existing) {
        updatedRecord = {
          ...existing,
          content,
          userId: cleanUserId,
          updatedAt: new Date().toISOString(),
        };
        await localDb.put("mind_items", updatedRecord);
      }
    } catch (err) {
      console.warn("[mindService] Exception updating local mind item:", err);
    }

    if (cleanUserId === "guest") {
      const items = getGuestStorage();
      const target = items.find(i => i.id === id);
      if (target) {
        target.content = content;
        target.updatedAt = new Date().toISOString();
        setGuestStorage(items);
      }
      return;
    }

    // Authenticated: Sync update to cloud
    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        const headers = await getAuthHeaders();
        fetch("/api/mind-items", {
          method: "POST",
          headers,
          body: JSON.stringify({ id, content }),
        }).catch((e) => console.warn("[mindService] Cloud update warning:", e));
      } catch {}
    }
  },

  /**
   * Soft-deletes a mind item in local-first database and syncs deletion to cloud / guest storage.
   */
  async deleteMindItem(id: string, userId: string): Promise<void> {
    const cleanUserId = userId || "guest";

    try {
      await localDb.softDelete("mind_items", cleanUserId, id);
    } catch (err) {
      console.warn("[mindService] Exception deleting local mind item:", err);
    }

    if (cleanUserId === "guest") {
      const items = getGuestStorage().filter(i => i.id !== id);
      setGuestStorage(items);
      return;
    }

    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        const headers = await getAuthHeaders();
        fetch(`/api/mind-items/${id}`, {
          method: "DELETE",
          headers,
        }).catch((e) => console.warn("[mindService] Cloud delete warning:", e));
      } catch {}
    }
  },

  /**
   * Deletes all mind items belonging to the user.
   */
  async clearAllMindItems(userId: string): Promise<void> {
    const cleanUserId = userId || "guest";
    try {
      const all = await localDb.getAllForUser<MindItem>("mind_items", cleanUserId, false);
      for (const item of all) {
        await localDb.softDelete("mind_items", cleanUserId, item.id);
      }
    } catch (err) {
      console.warn("[mindService] Exception clearing mind items:", err);
    }

    if (cleanUserId === "guest") {
      setGuestStorage([]);
    }
  },

  async deleteAllMindItems(userId: string): Promise<void> {
    return this.clearAllMindItems(userId);
  },
};
