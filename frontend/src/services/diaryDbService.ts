import { supabase } from "../lib/supabaseClient";
import { DiaryTopic, DiaryEntry } from "../types";
import { getBackendUrl } from "../lib/backendUrl";

export const diaryDbService = {
  /**
   * Fetches all diary topics and their entries belonging to the user from Supabase.
   */
  async fetchDiaryTopics(userId: string): Promise<DiaryTopic[]> {
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from("diary_topics")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (topicsError) {
        console.warn("[diaryDbService] Error fetching topics:", topicsError.message);
        return [];
      }

      if (!topicsData || topicsData.length === 0) return [];

      const { data: entriesData, error: entriesError } = await supabase
        .from("diary_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (entriesError) {
        console.warn("[diaryDbService] Error fetching entries:", entriesError.message);
      }

      return topicsData.map((t) => {
        const topicEntries: DiaryEntry[] = (entriesData || [])
          .filter((e) => e.topic_id === t.id)
          .map((e) => ({
            id: e.id,
            title: e.title || "",
            content: e.content || "",
            images: Array.isArray(e.images) ? e.images : [],
            createdAt: e.created_at,
            updatedAt: e.updated_at,
          }));

        return {
          id: t.id,
          order: t.sort_order,
          title: t.title,
          description: t.description || undefined,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          entries: topicEntries,
        };
      });
    } catch (err) {
      console.error("[diaryDbService] Unexpected error fetching diary:", err);
      return [];
    }
  },

  /**
   * Saves or updates a diary topic in Supabase PostgreSQL & syncs with Express backend.
   */
  async saveDiaryTopic(topic: DiaryTopic, userId: string): Promise<void> {
    try {
      // 1. Supabase PostgreSQL
      const { error } = await supabase.from("diary_topics").upsert({
        id: topic.id,
        user_id: userId,
        title: topic.title,
        description: topic.description || null,
        sort_order: topic.order,
        created_at: topic.createdAt,
        updated_at: topic.updatedAt || new Date().toISOString(),
      });

      if (error) {
        console.warn("[diaryDbService] Error saving topic:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/diary/topics`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: topic.id,
              title: topic.title,
              description: topic.description,
              order: topic.order,
            }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[diaryDbService] Exception saving topic:", err);
    }
  },

  /**
   * Saves or updates a diary entry in Supabase PostgreSQL & syncs with Express backend.
   */
  async saveDiaryEntry(topicId: string, entry: DiaryEntry, userId: string): Promise<void> {
    try {
      // 1. Supabase PostgreSQL
      const { error } = await supabase.from("diary_entries").upsert({
        id: entry.id,
        topic_id: topicId,
        user_id: userId,
        title: entry.title || "",
        content: entry.content || "",
        images: Array.isArray(entry.images) ? entry.images : [],
        created_at: entry.createdAt,
        updated_at: entry.updatedAt || new Date().toISOString(),
      });

      if (error) {
        console.warn("[diaryDbService] Error saving entry:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/diary/entries`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: entry.id,
              topicId,
              title: entry.title,
              content: entry.content,
              images: entry.images,
            }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[diaryDbService] Exception saving entry:", err);
    }
  },

  /**
   * Deletes a diary topic and its entries from Supabase PostgreSQL & syncs with backend.
   */
  async deleteDiaryTopic(topicId: string, userId: string): Promise<void> {
    try {
      // 1. Fetch entries to collect any storage paths for cleanup
      const { data: entries } = await supabase
        .from("diary_entries")
        .select("images")
        .eq("topic_id", topicId)
        .eq("user_id", userId);

      if (entries && entries.length > 0) {
        const paths: string[] = [];
        for (const e of entries) {
          if (Array.isArray(e.images)) {
            for (const img of e.images) {
              if (img?.storagePath) paths.push(img.storagePath);
            }
          }
        }
        if (paths.length > 0) {
          try {
            await supabase.storage.from("note-attachments").remove(paths);
          } catch (storageErr) {
            console.warn("[diaryDbService] Error removing topic image attachments:", storageErr);
          }
        }
      }

      // 2. Delete topic from PostgreSQL (cascades to diary_entries)
      const { error } = await supabase
        .from("diary_topics")
        .delete()
        .eq("id", topicId)
        .eq("user_id", userId);

      if (error) {
        console.warn("[diaryDbService] Error deleting topic from Supabase:", error.message);
      }

      // 3. Sync delete with Express backend if running
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/diary/topics/${topicId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting topic:", err);
    }
  },

  /**
   * Deletes a diary entry from Supabase PostgreSQL & syncs with backend.
   */
  async deleteDiaryEntry(entryId: string, userId: string): Promise<void> {
    try {
      // 1. Fetch entry to clean up storage image attachments
      const { data: entry } = await supabase
        .from("diary_entries")
        .select("images")
        .eq("id", entryId)
        .eq("user_id", userId)
        .maybeSingle();

      if (entry && Array.isArray(entry.images)) {
        const paths = entry.images.map((img: any) => img?.storagePath).filter(Boolean);
        if (paths.length > 0) {
          try {
            await supabase.storage.from("note-attachments").remove(paths);
          } catch (storageErr) {
            console.warn("[diaryDbService] Error removing entry image attachments:", storageErr);
          }
        }
      }

      // 2. Delete entry from PostgreSQL
      const { error } = await supabase
        .from("diary_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", userId);

      if (error) {
        console.warn("[diaryDbService] Error deleting entry from Supabase:", error.message);
      }

      // 3. Sync delete with Express backend if running
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${getBackendUrl()}/api/diary/entries/${entryId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting entry:", err);
    }
  },
};
