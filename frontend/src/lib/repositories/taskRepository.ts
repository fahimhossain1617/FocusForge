/**
 * Task Repository (lib/repositories/taskRepository.ts)
 */

import { db, type DexieTask } from "../db";
import type { Task } from "../../types";

export const taskRepository = {
  async getById(userId: string, id: number | string): Promise<Task | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const item = await db.tasks.get(localKey);
    if (!item || item.isDeleted) return null;
    return item;
  },

  async getAll(userId: string, includeDeleted = false): Promise<Task[]> {
    const cleanUserId = userId?.trim() || "guest";
    const collection = db.tasks.where("userId").equals(cleanUserId);
    const items = await collection.toArray();
    if (includeDeleted) return items;
    return items.filter((t) => !t.isDeleted);
  },

  async getByDate(userId: string, date: string): Promise<Task[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.tasks
      .where("[userId+targetDate]")
      .equals([cleanUserId, date])
      .toArray();
    return items.filter((t) => !t.isDeleted);
  },

  async save(userId: string, task: Partial<Task>): Promise<Task> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = task.id || Date.now();
    const taskTitle = (task.title || task.name || "").trim();
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieTask = {
      ...task,
      id,
      title: taskTitle,
      name: taskTitle,
      userId: cleanUserId,
      localKey,
      updatedAt: task.updatedAt || now,
      createdAt: task.createdAt || now,
      isDeleted: false,
    } as DexieTask;

    await db.transaction("rw", [db.tasks, db.sync_queue], async () => {
      await db.tasks.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "tasks", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "tasks",
          recordId: id,
          updatedAt: record.updatedAt || now,
          isDeleted: false,
        });
      }
    });

    return record;
  },

  async bulkSave(userId: string, tasks: Task[]): Promise<void> {
    if (!tasks || tasks.length === 0) return;
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();

    const records: DexieTask[] = tasks.map((t) => ({
      ...t,
      id: t.id || Date.now(),
      userId: cleanUserId,
      localKey: db.makeLocalKey(cleanUserId, t.id || Date.now()),
      updatedAt: t.updatedAt || now,
      createdAt: t.createdAt || now,
      isDeleted: Boolean((t as any).isDeleted),
    }));

    await db.transaction("rw", [db.tasks, db.sync_queue], async () => {
      await db.tasks.bulkPut(records);

      if (cleanUserId !== "guest") {
        const queueItems = records.map((r) => ({
          localKey: db.makeSyncQueueKey(cleanUserId, "tasks", r.id),
          userId: cleanUserId,
          storeName: "tasks",
          recordId: r.id,
          updatedAt: r.updatedAt || now,
          isDeleted: Boolean(r.isDeleted),
        }));
        await db.sync_queue.bulkPut(queueItems);
      }
    });
  },

  async update(userId: string, id: number | string, updates: Partial<Task>): Promise<Task | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const existing = await db.tasks.get(localKey);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: DexieTask = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    await db.transaction("rw", [db.tasks, db.sync_queue], async () => {
      await db.tasks.put(updated);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "tasks", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "tasks",
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

    const existing = await db.tasks.get(localKey);
    const tombstone: DexieTask = {
      ...(existing || { id, title: "", name: "" }),
      id,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieTask;

    await db.transaction("rw", [db.tasks, db.sync_queue], async () => {
      await db.tasks.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "tasks", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "tasks",
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
    const queueKey = db.makeSyncQueueKey(cleanUserId, "tasks", id);

    await db.transaction("rw", [db.tasks, db.sync_queue], async () => {
      await db.tasks.delete(localKey);
      await db.sync_queue.delete(queueKey);
    });
  },
};
