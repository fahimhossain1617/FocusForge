import { supabase } from "../lib/supabaseClient";
import { LearningFolder, LearningLog } from "../types";
import { getBackendUrl } from "../lib/backendUrl";

export const learningDbService = {
  /**
   * Fetches all learning folders and logs belonging to the user from Supabase PostgreSQL.
   */
  async fetchLearningData(userId?: string): Promise<{ folders: LearningFolder[]; logs: LearningLog[] }> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return { folders: [], logs: [] };

      const [foldersRes, logsRes] = await Promise.all([
        supabase
          .from("learning_folders")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: true }),
        supabase
          .from("learning_logs")
          .select("*")
          .eq("user_id", uid)
          .order("date", { ascending: false }),
      ]);

      if (foldersRes.error) {
        console.warn("[learningDbService] Error fetching folders:", foldersRes.error.message);
      }
      if (logsRes.error) {
        console.warn("[learningDbService] Error fetching logs:", logsRes.error.message);
      }

      const folders: LearningFolder[] = (foldersRes.data || []).map((row) => ({
        id: row.id,
        name: row.name,
        completed: row.completed,
        createdAt: row.created_at,
      }));

      const logs: LearningLog[] = (logsRes.data || []).map((row) => ({
        id: row.id,
        folderId: row.folder_id,
        date: row.date,
        watchMinutes: row.watch_minutes,
        practiceMinutes: row.practice_minutes,
        practiceDetails: row.practice_details || "",
        topics: row.topics || "",
        blockers: row.blockers || "",
      }));

      return { folders, logs };
    } catch (err) {
      console.error("[learningDbService] Unexpected error fetching learning data:", err);
      return { folders: [], logs: [] };
    }
  },

  /**
   * Saves or creates a learning folder in Supabase PostgreSQL & syncs with Express backend.
   */
  async saveFolder(folder: LearningFolder, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Supabase PostgreSQL
      const { error } = await supabase.from("learning_folders").upsert({
        id: folder.id,
        user_id: uid,
        name: folder.name,
        completed: folder.completed,
        created_at: folder.createdAt,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[learningDbService] Error saving folder:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/learning/folders`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(folder),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[learningDbService] Exception saving folder:", err);
    }
  },

  /**
   * Updates an existing folder (e.g., toggle completion or rename).
   */
  async updateFolder(folderId: string, updates: Partial<LearningFolder>, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.completed !== undefined) payload.completed = updates.completed;

      // 1. Supabase PostgreSQL
      const { error } = await supabase
        .from("learning_folders")
        .update(payload)
        .eq("id", folderId)
        .eq("user_id", uid);

      if (error) {
        console.warn("[learningDbService] Error updating folder:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/learning/folders/${folderId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[learningDbService] Exception updating folder:", err);
    }
  },

  /**
   * Deletes a folder and all its associated logs.
   */
  async deleteFolder(folderId: string, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Supabase PostgreSQL
      const { error } = await supabase
        .from("learning_folders")
        .delete()
        .eq("id", folderId)
        .eq("user_id", uid);

      if (error) {
        console.warn("[learningDbService] Error deleting folder:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/learning/folders/${folderId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
            },
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[learningDbService] Exception deleting folder:", err);
    }
  },

  /**
   * Saves or creates a learning log.
   */
  async saveLog(log: LearningLog, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Supabase PostgreSQL
      const { error } = await supabase.from("learning_logs").upsert({
        id: log.id,
        user_id: uid,
        folder_id: log.folderId,
        date: log.date,
        watch_minutes: log.watchMinutes,
        practice_minutes: log.practiceMinutes,
        practice_details: log.practiceDetails,
        topics: log.topics,
        blockers: log.blockers,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[learningDbService] Error saving learning log:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/learning/logs`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(log),
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[learningDbService] Exception saving learning log:", err);
    }
  },

  /**
   * Deletes a learning log.
   */
  async deleteLog(logId: string, userId?: string): Promise<void> {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      // 1. Supabase PostgreSQL
      const { error } = await supabase
        .from("learning_logs")
        .delete()
        .eq("id", logId)
        .eq("user_id", uid);

      if (error) {
        console.warn("[learningDbService] Error deleting learning log:", error.message);
      }

      // 2. Express Backend Sync
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) {
          await fetch(`${getBackendUrl()}/api/learning/logs/${logId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
            },
          }).catch(() => {});
        }
      } catch {}
    } catch (err) {
      console.warn("[learningDbService] Exception deleting learning log:", err);
    }
  },
};
