import { supabase } from "../lib/supabaseClient";
import { Note } from "../types";

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
   * Fetches all notes belonging to the authenticated user from Supabase PostgreSQL.
   */
  async fetchNotes(userId: string): Promise<Note[]> {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("[noteService] Error fetching notes from Supabase:", error.message);
        return [];
      }

      if (!data) return [];
      return data.map((row) => mapDbToNote(row as DbNoteRow));
    } catch (err) {
      console.error("[noteService] Unexpected error fetching notes:", err);
      return [];
    }
  },

  /**
   * Saves or creates a note in Supabase PostgreSQL.
   * Handles upsert to ensure atomic synchronization.
   */
  async saveNote(note: Note, userId: string): Promise<{ success: boolean; note?: Note; error?: string }> {
    try {
      const payload: Partial<DbNoteRow> = {
        id: note.id,
        user_id: userId,
        title: note.title || "",
        category: note.category || "",
        blocks: note.blocks || [],
        attachments: note.attachments || [],
        links: note.links || [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("notes")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) {
        console.error("[noteService] Error saving note to Supabase:", error.message);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        note: data ? mapDbToNote(data as DbNoteRow) : note,
      };
    } catch (err: any) {
      console.error("[noteService] Unexpected exception saving note:", err);
      return { success: false, error: err.message || "Failed to save note" };
    }
  },

  /**
   * Partially updates a note in Supabase PostgreSQL.
   */
  async updateNote(
    noteId: number,
    updates: Partial<Note>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.blocks !== undefined) payload.blocks = updates.blocks;
      if (updates.attachments !== undefined) payload.attachments = updates.attachments;
      if (updates.links !== undefined) payload.links = updates.links;

      const { error } = await supabase
        .from("notes")
        .update(payload)
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) {
        console.error("[noteService] Error updating note:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[noteService] Unexpected error updating note:", err);
      return { success: false, error: err.message || "Failed to update note" };
    }
  },

  /**
   * Deletes a note permanently from Supabase PostgreSQL.
   */
  async deleteNote(noteId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) {
        console.error("[noteService] Error deleting note:", error.message);
        return { success: false, error: error.message };
      }

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
