/**
 * Mind Repository (lib/repositories/mindRepository.ts)
 */

import { db, type DexieMindItem } from "../db";
import type { MindItem } from "../../types";

export const mindRepository = {
  async getAll(userId: string, includeDeleted = false): Promise<MindItem[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.mind_items
      .where("userId")
      .equals(cleanUserId)
      .toArray();
    if (includeDeleted) return items;
    return items.filter((m) => !m.isDeleted);
  },

  async save(userId: string, item: MindItem): Promise<MindItem> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = item.id || `mind_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieMindItem = {
      ...item,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: (item as any).updatedAt || item.createdAt || now,
      createdAt: item.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.mind_items, db.sync_queue], async () => {
      await db.mind_items.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "mind_items", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "mind_items",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async softDelete(userId: string, id: string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const now = new Date().toISOString();

    const existing = await db.mind_items.get(localKey);
    const tombstone: DexieMindItem = {
      ...(existing || { id, content: "" }),
      id,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieMindItem;

    await db.transaction("rw", [db.mind_items, db.sync_queue], async () => {
      await db.mind_items.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "mind_items", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "mind_items",
          recordId: id,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },

  async clearAll(userId: string): Promise<void> {
    const items = await this.getAll(userId, false);
    for (const item of items) {
      await this.softDelete(userId, item.id);
    }
  },
};
