import { supabase } from "../lib/supabaseClient";
import { FocusSession, DistractionEntry } from "../types";
import { getBackendUrl } from "../lib/backendUrl";

export const focusDbService = {
  /**
   * Fetches all focus sessions belonging to the user from Supabase PostgreSQL.
   */
  async fetchFocusSessions(userId: string): Promise<FocusSession[]> {
    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (error) {
        console.warn("[focusDbService] Error fetching focus sessions:", error.message);
        return [];
      }

      if (!data) return [];

      return data.map((row) => ({
        id: row.id,
        taskId: row.task_id ? Number(row.task_id) : undefined,
        taskName: row.task_name,
        category: row.category || "",
        startedAt: row.started_at,
        endedAt: row.ended_at || undefined,
        targetMinutes: row.target_minutes,
        durationMinutes: row.duration_minutes,
        completed: row.completed,
        distractions: Array.isArray(row.distractions) ? row.distractions : [],
      }));
    } catch (err) {
      console.error("[focusDbService] Unexpected error fetching focus sessions:", err);
      return [];
    }
  },

  /**
   * Saves or starts a focus session in Supabase PostgreSQL & syncs with Express backend.
   */
  async saveFocusSession(session: FocusSession, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Save to Supabase PostgreSQL
      const { error } = await supabase.from("focus_sessions").upsert({
        id: session.id,
        user_id: uid,
        task_id: session.taskId || null,
        task_name: session.taskName,
        category: session.category || null,
        started_at: session.startedAt,
        ended_at: session.endedAt || null,
        target_minutes: session.targetMinutes || 25,
        duration_minutes: session.durationMinutes || 0,
        completed: session.completed || false,
        distractions: Array.isArray(session.distractions) ? session.distractions : [],
      });

      if (error) {
        console.warn("[focusDbService] Error saving focus session:", error.message);
      }

      // 2. Sync with Express backend
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/focus/sessions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: session.id,
              taskId: session.taskId,
              taskName: session.taskName,
              category: session.category,
              startedAt: session.startedAt,
              targetMinutes: session.targetMinutes,
            }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[focusDbService] Exception saving focus session:", err);
    }
  },

  /**
   * Updates an ended focus session (completed naturally or quit early).
   */
  async endFocusSession(
    sessionId: string,
    durationMinutes: number,
    completed: boolean,
    userId?: string
  ): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      const endedAt = new Date().toISOString();

      // 1. Update in Supabase PostgreSQL
      const { error } = await supabase
        .from("focus_sessions")
        .update({
          ended_at: endedAt,
          duration_minutes: durationMinutes,
          completed,
        })
        .eq("id", sessionId)
        .eq("user_id", uid);

      if (error) {
        console.warn("[focusDbService] Error concluding focus session:", error.message);
      }

      // 2. Sync with Express backend
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/focus/sessions/${sessionId}/end`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              durationMinutes,
              completed,
              endedAt,
            }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[focusDbService] Exception concluding focus session:", err);
    }
  },

  /**
   * Logs a distraction for a focus session.
   */
  async addDistraction(
    sessionId: string,
    distraction: DistractionEntry,
    userId?: string
  ): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Fetch current distractions from Supabase
      const { data: current } = await supabase
        .from("focus_sessions")
        .select("distractions")
        .eq("id", sessionId)
        .eq("user_id", uid)
        .maybeSingle();

      const existing = Array.isArray(current?.distractions) ? current.distractions : [];
      const updated = [...existing, distraction];

      await supabase
        .from("focus_sessions")
        .update({ distractions: updated })
        .eq("id", sessionId)
        .eq("user_id", uid);

      // 2. Sync with Express backend
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/focus/sessions/${sessionId}/distractions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: distraction.content }),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[focusDbService] Exception logging distraction:", err);
    }
  },
};
