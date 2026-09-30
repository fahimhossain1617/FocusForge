import { DiaryTopic, DiaryEntry } from "../types";
import { localDb } from "./localDbService";

export const diaryDbService = {
  /**
   * Fetches all diary topics and their entries belonging to the user from local-first database.
   */
  async fetchDiaryTopics(userId: string): Promise<DiaryTopic[]> {
    try {
      const cleanUserId = userId || "guest";
      const topics = await localDb.getAllForUser<DiaryTopic>("diary_topics", cleanUserId, false);
      const entries = await localDb.getAllForUser<DiaryEntry & { topicId: string }>("diary_entries", cleanUserId, false);

      // Group entries by topic
      const entryMap = new Map<string, DiaryEntry[]>();
      for (const e of entries) {
        if (!e.topicId) continue;
        const list = entryMap.get(e.topicId) || [];
        list.push(e);
        entryMap.set(e.topicId, list);
      }

      return topics.map((t) => ({
        ...t,
        entries: entryMap.get(t.id) || t.entries || [],
      }));
    } catch (err) {
      console.error("[diaryDbService] Error fetching local diary:", err);
      return [];
    }
  },

  /**
   * Saves or updates a diary topic in local-first database.
   */
  async saveDiaryTopic(topic: DiaryTopic, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("diary_topics", {
        ...topic,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });

      // Save entries if present
      if (Array.isArray(topic.entries)) {
        for (const entry of topic.entries) {
          await this.saveDiaryEntry(topic.id, entry, cleanUserId);
        }
      }
    } catch (err) {
      console.warn("[diaryDbService] Exception saving local topic:", err);
    }
  },

  /**
   * Saves or updates a diary entry in local-first database.
   */
  async saveDiaryEntry(topicId: string, entry: DiaryEntry, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("diary_entries", {
        ...entry,
        topicId,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[diaryDbService] Exception saving local entry:", err);
    }
  },

  /**
   * Soft-deletes a diary topic and all its entries in local-first database.
   */
  async deleteDiaryTopic(topicId: string, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("diary_topics", cleanUserId, topicId);

      const entries = await localDb.getAllForUser<DiaryEntry & { topicId: string }>("diary_entries", cleanUserId, false);
      for (const e of entries) {
        if (e.topicId === topicId) {
          await localDb.softDelete("diary_entries", cleanUserId, e.id);
        }
      }
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting local topic:", err);
    }
  },

  /**
   * Soft-deletes an individual diary entry.
   */
  async deleteDiaryEntry(entryId: string, userId: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("diary_entries", cleanUserId, entryId);
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting local entry:", err);
    }
  },
};
