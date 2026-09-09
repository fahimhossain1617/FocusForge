import { DiaryTopic, DiaryEntry } from "../types";
import { fetchBackend } from "../lib/apiClient";

export const diaryDbService = {
  /**
   * Fetches all diary topics and their entries belonging to the user via Backend API.
   */
  async fetchDiaryTopics(userId: string): Promise<DiaryTopic[]> {
    try {
      return await fetchBackend<DiaryTopic[]>("/api/diary/topics");
    } catch (err) {
      console.error("[diaryDbService] Unexpected error fetching diary:", err);
      return [];
    }
  },

  /**
   * Saves or updates a diary topic via Backend API.
   */
  async saveDiaryTopic(topic: DiaryTopic, userId: string): Promise<void> {
    try {
      await fetchBackend("/api/diary/topics", {
        method: "POST",
        body: JSON.stringify({
          id: topic.id,
          title: topic.title,
          description: topic.description,
          order: topic.order,
        }),
      });
    } catch (err) {
      console.warn("[diaryDbService] Exception saving topic:", err);
    }
  },

  /**
   * Saves or updates a diary entry via Backend API.
   */
  async saveDiaryEntry(topicId: string, entry: DiaryEntry, userId: string): Promise<void> {
    try {
      await fetchBackend("/api/diary/entries", {
        method: "POST",
        body: JSON.stringify({
          id: entry.id,
          topicId,
          title: entry.title,
          content: entry.content,
          images: entry.images,
        }),
      });
    } catch (err) {
      console.warn("[diaryDbService] Exception saving entry:", err);
    }
  },

  /**
   * Deletes a diary topic and its entries via Backend API.
   */
  async deleteDiaryTopic(topicId: string, userId: string): Promise<void> {
    try {
      await fetchBackend(`/api/diary/topics/${topicId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting topic:", err);
    }
  },

  /**
   * Deletes a diary entry via Backend API.
   */
  async deleteDiaryEntry(entryId: string, userId: string): Promise<void> {
    try {
      await fetchBackend(`/api/diary/entries/${entryId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[diaryDbService] Exception deleting entry:", err);
    }
  },
};
