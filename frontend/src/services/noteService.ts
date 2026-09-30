import { Note } from "../types";
import { localDb } from "./localDbService";

export const noteService = {
  /**
   * Fetches all notes belonging to the authenticated user from local-first database.
   */
  async fetchNotes(userId: string): Promise<Note[]> {
    try {
      const notes = await localDb.getAllForUser<Note>("notes", userId || "guest", false);
      return notes;
    } catch (err) {
      console.error("[noteService] Error fetching local notes:", err);
      return [];
    }
  },

  /**
   * Saves or creates a note in local-first database.
   */
  async saveNote(note: Note, userId: string): Promise<{ success: boolean; note?: Note; error?: string }> {
    try {
      const cleanUserId = userId || "guest";
      const saved = await localDb.put("notes", {
        ...note,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        note: saved,
      };
    } catch (err: any) {
      console.error("[noteService] Exception saving local note:", err);
      return { success: false, error: err.message || "Failed to save note" };
    }
  },

  /**
   * Partially updates a note in local-first database.
   */
  async updateNote(
    noteId: number,
    updates: Partial<Note>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanUserId = userId || "guest";
      const existing = await localDb.get<Note>("notes", cleanUserId, noteId);
      if (!existing) {
        return { success: false, error: "Note not found" };
      }

      await localDb.put("notes", {
        ...existing,
        ...updates,
        userId: cleanUserId,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      console.error("[noteService] Error updating local note:", err);
      return { success: false, error: err.message || "Failed to update note" };
    }
  },

  /**
   * Soft-deletes a note locally and records tombstone for E2EE sync propagation.
   */
  async deleteNote(noteId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanUserId = userId || "guest";
      await localDb.softDelete("notes", cleanUserId, noteId);
      return { success: true };
    } catch (err: any) {
      console.error("[noteService] Error deleting local note:", err);
      return { success: false, error: err.message || "Failed to delete note" };
    }
  },

  /**
   * Local changes listener (no Supabase realtime dependency).
   */
  subscribeToNotes(userId: string, onRemoteChange: () => void): () => void {
    return () => {};
  },
};
