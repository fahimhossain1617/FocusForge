/**
 * Routine Template Repository (lib/repositories/routineRepository.ts)
 */

import { db, type DexieRoutineTemplate } from "../db";
import type { RoutineTemplate } from "../../types";

export const routineRepository = {
  async getAll(userId: string, includeDeleted = false): Promise<RoutineTemplate[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.routine_templates
      .where("userId")
      .equals(cleanUserId)
      .toArray();
    if (includeDeleted) return items;
    return items.filter((r) => !r.isDeleted);
  },

  async save(userId: string, template: RoutineTemplate): Promise<RoutineTemplate> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = template.id || `routine_${template.weekday || "day"}_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieRoutineTemplate = {
      ...template,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: template.updatedAt || now,
      createdAt: template.createdAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.routine_templates, db.sync_queue], async () => {
      await db.routine_templates.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "routine_templates", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "routine_templates",
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

    const existing = await db.routine_templates.get(localKey);
    const tombstone: DexieRoutineTemplate = {
      ...(existing || { id, weekday: "saturday", tasks: [] }),
      id,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieRoutineTemplate;

    await db.transaction("rw", [db.routine_templates, db.sync_queue], async () => {
      await db.routine_templates.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "routine_templates", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "routine_templates",
          recordId: id,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },
};
