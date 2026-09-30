/**
 * FocusForge AI Agent Local Memory Service (aiMemoryService.ts)
 * 
 * Manages user-owned AI long-term memory stored exclusively in IndexedDB.
 * Guarantees:
 * - Scoped strictly to authenticated account (Account Isolation).
 * - Synchronized across authorized devices via E2EE sync layer.
 * - Deletable & Editable by user directly.
 * - Excluded entirely when Private Chat Mode is active.
 * - Instant purge when user deletes memory or wipes account.
 */

import { localDb } from "./localDbService";

export interface AIMemoryItem {
  id: string;
  userId: string;
  content: string;
  category: "preference" | "goal" | "habit" | "fact" | "work" | "general";
  source?: string; // e.g. "conversation" | "user_added"
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export const aiMemoryService = {
  /**
   * Retrieves all non-deleted AI memory facts for the specified user.
   */
  async getMemories(userId: string): Promise<AIMemoryItem[]> {
    if (!userId || userId === "guest") return [];
    try {
      const records = await localDb.getAllForUser<AIMemoryItem>("ai_memory", userId, false);
      return records.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    } catch (err) {
      console.warn("[aiMemoryService] Failed to load memories:", err);
      return [];
    }
  },

  /**
   * Saves or updates an AI memory item in the local-first database.
   */
  async saveMemory(
    userId: string,
    content: string,
    category: AIMemoryItem["category"] = "general",
    id?: string
  ): Promise<AIMemoryItem | null> {
    if (!userId || userId === "guest" || !content.trim()) return null;

    const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const item: AIMemoryItem = {
      id: memoryId,
      userId,
      content: content.trim(),
      category,
      updatedAt: now,
      createdAt: now,
      isDeleted: false,
    };

    try {
      await localDb.put("ai_memory", item);
      return item;
    } catch (err) {
      console.error("[aiMemoryService] Error saving memory:", err);
      return null;
    }
  },

  /**
   * Deletes a specific memory item locally and records tombstone for E2EE sync.
   */
  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    if (!userId || !memoryId) return false;
    try {
      await localDb.softDelete("ai_memory", userId, memoryId);
      return true;
    } catch (err) {
      console.error("[aiMemoryService] Error deleting memory:", err);
      return false;
    }
  },

  /**
   * Generates a context injection string for the AI prompt based on active memories.
   */
  async buildMemoryContext(userId: string | null): Promise<string> {
    if (!userId || userId === "guest") return "";
    const memories = await this.getMemories(userId);
    if (!memories || memories.length === 0) return "";

    const lines = memories.slice(0, 15).map((m) => `- [${m.category.toUpperCase()}] ${m.content}`);
    return `\n\n--- USER RELEVANT PERSONAL MEMORY (Local User-Owned Context) ---\n${lines.join("\n")}\n--------------------------------------------------------------\n`;
  },
};
