/**
 * Diary Repository (lib/repositories/diaryRepository.ts)
 */

import { db, type DexieDiaryTopic, type DexieDiaryEntry } from "../db";
import type { DiaryTopic, DiaryEntry } from "../../types";

export const diaryRepository = {
  // ==================== TOPICS ====================

  async getTopics(userId: string, includeDeleted = false): Promise<DiaryTopic[]> {
    const cleanUserId = userId?.trim() || "guest";
    const topics = await db.diary_topics
      .where("userId")
      .equals(cleanUserId)
      .toArray();

    const filteredTopics = includeDeleted ? topics : topics.filter((t) => !t.isDeleted);

    // Fetch entries for topics
    const entries = await db.diary_entries
      .where("userId")
      .equals(cleanUserId)
      .toArray();

    const nonDeletedEntries = includeDeleted ? entries : entries.filter((e) => !e.isDeleted);

    const entryMap = new Map<string, DiaryEntry[]>();
    for (const e of nonDeletedEntries) {
      if (!e.topicId) continue;
      const list = entryMap.get(e.topicId) || [];
      list.push(e);
      entryMap.set(e.topicId, list);
    }

    return filteredTopics.map((t) => ({
      ...t,
      entries: entryMap.get(t.id) || t.entries || [],
    }));
  },

  async saveTopic(userId: string, topic: DiaryTopic): Promise<DiaryTopic> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = topic.id || `topic_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieDiaryTopic = {
      ...topic,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: topic.updatedAt || now,
      createdAt: topic.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.diary_topics, db.sync_queue], async () => {
      await db.diary_topics.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "diary_topics", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "diary_topics",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    // Save attached entries if any
    if (Array.isArray(topic.entries)) {
      for (const entry of topic.entries) {
        await this.saveEntry(cleanUserId, id, entry);
      }
    }

    return record;
  },

  async softDeleteTopic(userId: string, topicId: string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const localKey = db.makeLocalKey(cleanUserId, topicId);

    const existing = await db.diary_topics.get(localKey);
    const tombstone: DexieDiaryTopic = {
      ...(existing || { id: topicId, title: "" }),
      id: topicId,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieDiaryTopic;

    await db.transaction("rw", [db.diary_topics, db.diary_entries, db.sync_queue], async () => {
      await db.diary_topics.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "diary_topics", topicId);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "diary_topics",
          recordId: topicId,
          updatedAt: now,
          isDeleted: true,
        });
      }

      // Cascade soft delete entries
      const entries = await db.diary_entries
        .where("[userId+topicId]")
        .equals([cleanUserId, topicId])
        .toArray();

      for (const entry of entries) {
        const entryTombstone: DexieDiaryEntry = {
          ...entry,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        };
        await db.diary_entries.put(entryTombstone);

        if (cleanUserId !== "guest") {
          const entryQueueKey = db.makeSyncQueueKey(cleanUserId, "diary_entries", entry.id);
          await db.sync_queue.put({
            localKey: entryQueueKey,
            userId: cleanUserId,
            storeName: "diary_entries",
            recordId: entry.id,
            updatedAt: now,
            isDeleted: true,
          });
        }
      }
    });
  },

  // ==================== ENTRIES ====================

  async saveEntry(userId: string, topicId: string, entry: DiaryEntry): Promise<DiaryEntry> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = entry.id || `entry_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieDiaryEntry = {
      ...entry,
      id,
      topicId,
      userId: cleanUserId,
      localKey,
      updatedAt: entry.updatedAt || now,
      createdAt: entry.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.diary_entries, db.sync_queue], async () => {
      await db.diary_entries.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "diary_entries", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "diary_entries",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async softDeleteEntry(userId: string, entryId: string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const localKey = db.makeLocalKey(cleanUserId, entryId);

    const existing = await db.diary_entries.get(localKey);
    const tombstone: DexieDiaryEntry = {
      ...(existing || { id: entryId, topicId: "", content: "" }),
      id: entryId,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieDiaryEntry;

    await db.transaction("rw", [db.diary_entries, db.sync_queue], async () => {
      await db.diary_entries.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "diary_entries", entryId);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "diary_entries",
          recordId: entryId,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },
};
