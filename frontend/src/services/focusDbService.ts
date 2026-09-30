import { FocusSession, DistractionEntry } from "../types";
import { localDb } from "./localDbService";

export const focusDbService = {
  /**
   * Fetches all focus sessions belonging to the user from local-first database.
   */
  async fetchFocusSessions(userId: string): Promise<FocusSession[]> {
    try {
      const cleanUserId = userId || "guest";
      return await localDb.getAllForUser<FocusSession>("focus_sessions", cleanUserId, false);
    } catch (err) {
      console.error("[focusDbService] Error fetching local focus sessions:", err);
      return [];
    }
  },

  /**
   * Saves or starts a focus session in local-first database.
   */
  async saveFocusSession(session: FocusSession, userId?: string): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.put("focus_sessions", {
        ...session,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[focusDbService] Exception saving local focus session:", err);
    }
  },

  /**
   * Updates an ended focus session in local-first database.
   */
  async endFocusSession(
    sessionId: string,
    durationMinutes: number,
    completed: boolean,
    userId?: string
  ): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      const existing = await localDb.get<FocusSession>("focus_sessions", cleanUserId, sessionId);
      if (existing) {
        await localDb.put("focus_sessions", {
          ...existing,
          durationMinutes,
          completed,
          endedAt: new Date().toISOString(),
          userId: cleanUserId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[focusDbService] Exception concluding local focus session:", err);
    }
  },

  /**
   * Logs a distraction entry during a focus session in local-first database.
   */
  async addDistraction(
    sessionId: string,
    distraction: DistractionEntry,
    userId?: string
  ): Promise<void> {
    try {
      const cleanUserId = userId || "guest";
      const existing = await localDb.get<FocusSession>("focus_sessions", cleanUserId, sessionId);
      if (existing) {
        const distractions = Array.isArray(existing.distractions) ? [...existing.distractions, distraction] : [distraction];
        await localDb.put("focus_sessions", {
          ...existing,
          distractions,
          userId: cleanUserId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[focusDbService] Exception logging local distraction:", err);
    }
  },
};
