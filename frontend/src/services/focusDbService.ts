import { FocusSession, DistractionEntry } from "../types";
import { fetchBackend } from "../lib/apiClient";

export const focusDbService = {
  /**
   * Fetches all focus sessions belonging to the user via Backend API.
   */
  async fetchFocusSessions(userId: string): Promise<FocusSession[]> {
    try {
      return await fetchBackend<FocusSession[]>("/api/focus/sessions");
    } catch (err) {
      console.error("[focusDbService] Unexpected error fetching focus sessions:", err);
      return [];
    }
  },

  /**
   * Saves or starts a focus session via Backend API.
   */
  async saveFocusSession(session: FocusSession, userId?: string): Promise<void> {
    try {
      await fetchBackend("/api/focus/sessions", {
        method: "POST",
        body: JSON.stringify({
          id: session.id,
          taskId: session.taskId,
          taskName: session.taskName,
          category: session.category,
          startedAt: session.startedAt,
          targetMinutes: session.targetMinutes,
        }),
      });
    } catch (err) {
      console.warn("[focusDbService] Exception saving focus session:", err);
    }
  },

  /**
   * Updates an ended focus session (completed naturally or quit early) via Backend API.
   */
  async endFocusSession(
    sessionId: string,
    durationMinutes: number,
    completed: boolean,
    userId?: string
  ): Promise<void> {
    try {
      const endedAt = new Date().toISOString();
      await fetchBackend(`/api/focus/sessions/${sessionId}/end`, {
        method: "PATCH",
        body: JSON.stringify({
          durationMinutes,
          completed,
          endedAt,
        }),
      });
    } catch (err) {
      console.warn("[focusDbService] Exception concluding focus session:", err);
    }
  },

  /**
   * Logs a distraction for a focus session via Backend API.
   */
  async addDistraction(
    sessionId: string,
    distraction: DistractionEntry,
    userId?: string
  ): Promise<void> {
    try {
      await fetchBackend(`/api/focus/sessions/${sessionId}/distractions`, {
        method: "POST",
        body: JSON.stringify({ content: distraction.content }),
      });
    } catch (err) {
      console.warn("[focusDbService] Exception logging distraction:", err);
    }
  },
};
