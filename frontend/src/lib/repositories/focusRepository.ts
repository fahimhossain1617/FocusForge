/**
 * Focus Repository (lib/repositories/focusRepository.ts)
 */

import { db, type DexieFocusSession } from "../db";
import type { FocusSession } from "../../types";

export const focusRepository = {
  async getById(userId: string, id: string): Promise<FocusSession | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, id);
    const item = await db.focus_sessions.get(localKey);
    if (!item || item.isDeleted) return null;
    return item;
  },

  async getAll(userId: string, includeDeleted = false): Promise<FocusSession[]> {
    const cleanUserId = userId?.trim() || "guest";
    const items = await db.focus_sessions
      .where("userId")
      .equals(cleanUserId)
      .toArray();
    if (includeDeleted) return items;
    return items.filter((f) => !f.isDeleted);
  },

  async save(userId: string, session: FocusSession): Promise<FocusSession> {
    const cleanUserId = userId?.trim() || "guest";
    const now = new Date().toISOString();
    const id = session.id || `focus_${Date.now()}`;
    const localKey = db.makeLocalKey(cleanUserId, id);

    const record: DexieFocusSession = {
      ...session,
      id,
      userId: cleanUserId,
      localKey,
      updatedAt: (session as any).updatedAt || session.startedAt || now,
      createdAt: (session as any).createdAt || session.startedAt || now,
      isDeleted: false,
    };

    await db.transaction("rw", [db.focus_sessions, db.sync_queue], async () => {
      await db.focus_sessions.put(record);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "focus_sessions", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "focus_sessions",
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

    const existing = await db.focus_sessions.get(localKey);
    const tombstone: DexieFocusSession = {
      ...(existing || { id, startTime: "", durationMinutes: 0 }),
      id,
      localKey,
      userId: cleanUserId,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    } as DexieFocusSession;

    await db.transaction("rw", [db.focus_sessions, db.sync_queue], async () => {
      await db.focus_sessions.put(tombstone);

      if (cleanUserId !== "guest") {
        const queueKey = db.makeSyncQueueKey(cleanUserId, "focus_sessions", id);
        await db.sync_queue.put({
          localKey: queueKey,
          userId: cleanUserId,
          storeName: "focus_sessions",
          recordId: id,
          updatedAt: now,
          isDeleted: true,
        });
      }
    });
  },
};
