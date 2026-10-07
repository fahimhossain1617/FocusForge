/**
 * Note Repository (lib/repositories/noteRepository.ts)
 */

import { db, type DexieNote } from "../db";
import type { Note } from "../../types";

export const noteRepository = {
  async getById(userId: string, id: number | string): Promise<Note | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const item = await db.notes.get(localKey);
    if (!item || item.isDeleted) return null;
    return item;
  },

  async getAll(userId: string, includeDeleted = false): Promise<Note[]> {
    const cleanUserId = userId?.trim() || "guest";
    const collection = db.notes.where("userId").equals(cleanUserId);
    const items = await collection.toArray();
    if (includeDeleted) return items;
    return items.filter((n) => !n.isDeleted);
  },

  async getByCategory(userId: string, category: string): Promise<Note[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.notes
      .where("[userId+category]")
      .equals([cleanUserId, category])
      .toArray();
    return items.filter((n) => !n.isDeleted);
  },

  async save(userId: string, note: Note): Promise<Note> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = note.id || Date.now();
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieNote = {
      ...note,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: note.updatedAt || now,
      createdAt: note.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.notes, db.sync_queue], async () => {
      await db.notes.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "notes", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "notes",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async bulkSave(userId: string, notes: Note[]): Promise<void> {
    if (!notes || notes.length === 0) return;
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();

    const records: DexieNote[] = notes.map((n) => ({
      ...n,
      id: n.id || Date.now(),
      userId: cleanUserId,
      localKey: db.makeLocalKey(cleanUserId, n.id || Date.now()),
      updatedAt: n.updatedAt || now,
      createdAt: n.createdAt || now,
      isDeleted: Boolean((n as any).isDeleted),
    }));

    await db.transaction("rw", [db.notes, db.sync_queue], async () => {
      await db.notes.bulkPut(records);

      if (cleanUserId !== "guest") {
        const queueItems = records.map((r) => ({
          localKey: db.makeSyncQueueKey(cleanUserId, "notes", r.id),
          userId: cleanUserId,
          storeName: "notes",
          recordId: r.id,
          updatedAt: r.updatedAt || now,
          isDeleted: Boolean(r.isDeleted),
        }));
        await db.sync_queue.bulkPut(queueItems);
      }
    });
  },

  async update(userId: string, id: number | string, updates: Partial<Note>): Promise<Note | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const existing = await db.notes.get(localKey);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: DexieNote = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    await db.transaction("rw", [db.notes, db.sync_queue], async () => {
      await db.notes.put(updated);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "notes", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "notes",
          recordId: id,
          updatedAt: now,
          isDeleted: Boolean(updated.isDeleted),
        });
      }
    });

    return updated;
  },

  async softDelete(userId: string, id: number | string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const now = new Date().toISOString();

    const existing = await db.notes.get(localKey);
    const tombstone: DexieNote = {
      ...(existing || { id, title: "", blocks: [] }),
      id,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieNote;

    await db.transaction("rw", [db.notes, db.sync_queue], async () => {
      await db.notes.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "notes", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "notes",
          recordId: id,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },

  async hardDelete(userId: string, id: number | string): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const queueKey = db.makeSyncQueueKey(cleanUserId, "notes", id);

    await db.transaction("rw", [db.notes, db.sync_queue], async () => {
      await db.notes.delete(localKey);
      await db.sync_queue.delete(queueKey);
    });
  },
};
