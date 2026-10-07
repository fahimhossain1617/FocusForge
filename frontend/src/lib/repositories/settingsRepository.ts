/**
 * Settings & App State Repository (lib/repositories/settingsRepository.ts)
 */

import { db, type DexieAppPreferences, type DexieAppStateBackup } from "../db";
import type { AppState } from "../../types";

export const settingsRepository = {
  async getPreferences(userId: string): Promise<DexieAppPreferences | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, "prefs");
    const item = await db.app_preferences.get(localKey);
    return item || null;
  },

  async savePreferences(userId: string, prefs: Partial<DexieAppPreferences>): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, "prefs");
    const now = new Date().toISOString();

    const record: DexieAppPreferences = {
      localKey,
      userId: cleanUserId,
      theme: prefs.theme,
      lang: prefs.lang,
      notifPreferences: prefs.notifPreferences,
      calendarPreferences: prefs.calendarPreferences,
      updatedAt: now,
    };

    await db.app_preferences.put(record);
  },

  async getAppStateBackup(userId: string): Promise<Partial<AppState> | null> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, "state_backup");
    const item = await db.app_state.get(localKey);
    return item?.state || null;
  },

  async saveAppStateBackup(userId: string, state: Partial<AppState>): Promise<void> {
    const cleanUserId = userId?.trim() || "guest";
    const localKey = db.makeLocalKey(cleanUserId, "state_backup");
    const now = new Date().toISOString();

    const record: DexieAppStateBackup = {
      localKey,
      userId: cleanUserId,
      state,
      updatedAt: now,
    };

    await db.app_state.put(record);
  },
};
