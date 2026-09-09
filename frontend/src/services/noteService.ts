import { supabase } from "../lib/supabaseClient";
import { Note } from "../types";
import { fetchBackend } from "../lib/apiClient";

export interface DbNoteRow {
  id: number | string;
  user_id: string;
  title: string;
  category?: string | null;
  blocks: any;
  attachments?: any;
  links?: any;
  created_at: string;
  updated_at: string;
}

function mapDbToNote(row: DbNoteRow): Note {
  return {
    id: typeof row.id === "string" ? parseInt(row.id, 10) || Date.now() : row.id,
    title: row.title || "",
    category: row.category || undefined,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    links: Array.isArray(row.links) ? row.links : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const noteService = {
  /**
   * Fetches all notes belonging to the authenticated user via Backend API.
   */
  async fetchNotes(userId: string): Promise<Note[]> {
    try {
      const data = await fetchBackend<DbNoteRow[]>("/api/notes");
      if (!data) return [];
      return data.map((row) => mapDbToNote(row));
    } catch (err) {
      console.error("[noteService] Unexpected error fetching notes:", err);
      return [];
    }
  },

  /**
   * Saves or creates a note via Backend API.
   */
  async saveNote(note: Note, userId: string): Promise<{ success: boolean; note?: Note; error?: string }> {
    try {
      const data = await fetchBackend<DbNoteRow>("/api/notes", {
        method: "POST",
        body: JSON.stringify(note),
      });

      return {
        success: true,
        note: data ? mapDbToNote(data) : note,
      };
    } catch (err: any) {
      console.error("[noteService] Unexpected exception saving note:", err);
      return { success: false, error: err.message || "Failed to save note" };
    }
  },

  /**
   * Partially updates a note via Backend API.
   */
  async updateNote(
    noteId: number,
    updates: Partial<Note>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fetchBackend(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      return { success: true };
    } catch (err: any) {
      console.error("[noteService] Unexpected error updating note:", err);
      return { success: false, error: err.message || "Failed to update note" };
    }
  },

  /**
   * Deletes a note permanently via Backend API.
   */
  async deleteNote(noteId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await fetchBackend(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      return { success: true };
    } catch (err: any) {
      console.error("[noteService] Unexpected error deleting note:", err);
      return { success: false, error: err.message || "Failed to delete note" };
    }
  },

  /**
   * Subscribes to Supabase Realtime changes on user's notes.
   */
  subscribeToNotes(userId: string, onRemoteChange: () => void): () => void {
    const channel = supabase
      .channel(`notes-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onRemoteChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
