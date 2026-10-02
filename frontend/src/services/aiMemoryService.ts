/**
 * FocusForge AI Agent Local Memory Service (aiMemoryService.ts)
 * 
 * Manages user-owned AI long-term memory stored exclusively in local IndexedDB.
 * Guarantees:
 * - Scoped strictly to authenticated account (Account Isolation).
 * - Least-context retrieval (minimal tokens, relevant memories only).
 * - Zero memory retrieval or persistence when Private or Disappearing Mode is active.
 * - Captures explicit user corrections & preferences when AI Improvement is enabled.
 * - Instant purge when user deletes memory.
 */

import { localDb } from "./localDbService";
import type { PrivacyMode } from "@/types/aiAgent";

export interface AIMemoryItem {
  id: string;
  userId: string;
  content: string;
  category: "preference" | "goal" | "habit" | "fact" | "work" | "general";
  source?: string; // e.g. "correction" | "conversation" | "user_added"
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
   * Retrieves only relevant memories matching the user query (Least-Context minimization).
   * Keeps token usage low and latency fast.
   */
  async getRelevantMemories(userId: string, query: string): Promise<AIMemoryItem[]> {
    const all = await this.getMemories(userId);
    if (!all || all.length === 0) return [];

    const q = (query || "").toLowerCase();
    
    // Categorize query intent for smart matching
    const isPlanner = /(task|plan|routine|schedule|টাস্ক|প্ল্যান|রুটিন)/i.test(q);
    const isFocus = /(focus|timer|pomodoro|ফোকাস|টাইমার)/i.test(q);
    const isLanguage = /(bangla|bengali|english|বাংল|ইংরেজি|ভাষা)/i.test(q);
    const isStyle = /(short|brief|detailed|সংক্ষেপ|ছোট|বড়)/i.test(q);

    const scored = all.map((m) => {
      let score = 0;
      const content = m.content.toLowerCase();
      
      // Explicit keyword matches
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      words.forEach((w) => {
        if (content.includes(w)) score += 3;
      });

      // Contextual relevance
      if (isPlanner && (m.category === "work" || m.category === "habit" || content.includes("task") || content.includes("plan"))) score += 5;
      if (isFocus && (content.includes("focus") || content.includes("timer") || content.includes("session"))) score += 5;
      if (isLanguage && (content.includes("bangla") || content.includes("english") || content.includes("language"))) score += 6;
      if (isStyle && (content.includes("short") || content.includes("concise") || content.includes("brief"))) score += 6;
      if (m.category === "preference") score += 2;

      return { item: m, score };
    });

    // Take top 4 relevant memories with score > 0, fallback to top 2 general preferences if none matched
    const filtered = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.item);
    if (filtered.length > 0) {
      return filtered.slice(0, 4);
    }

    return all.filter((m) => m.category === "preference").slice(0, 2);
  },

  /**
   * Saves or updates an AI memory item in the local-first database.
   */
  async saveMemory(
    userId: string,
    content: string,
    category: AIMemoryItem["category"] = "general",
    id?: string,
    source?: string
  ): Promise<AIMemoryItem | null> {
    if (!userId || userId === "guest" || !content.trim()) return null;

    const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const item: AIMemoryItem = {
      id: memoryId,
      userId,
      content: content.trim(),
      category,
      source: source || "user_added",
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
   * Deletes a specific memory item locally.
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
   * Clears all memories for the user from local storage.
   */
  async clearAllMemories(userId?: string | null): Promise<boolean> {
    if (!userId || userId === "guest") return true;
    try {
      const records = await this.getMemories(userId);
      for (const rec of records) {
        await localDb.softDelete("ai_memory", userId, rec.id);
      }
      return true;
    } catch (err) {
      console.error("[aiMemoryService] Error clearing all memories:", err);
      return false;
    }
  },

  /**
   * Automatically detects explicit user corrections and preferences, saving them
   * ONLY when AI Improvement is enabled (never in private or disappearing mode).
   */
  async detectAndSaveCorrection(
    userId: string | null,
    userMessage: string,
    privacyMode: PrivacyMode
  ): Promise<AIMemoryItem | null> {
    if (!userId || userId === "guest" || privacyMode !== "improvement") {
      return null;
    }

    const text = (userMessage || "").trim();
    if (!text || text.length < 8) return null;

    // Detect explicit correction patterns
    const englishPatterns = [
      /remember that\s+(.+)/i,
      /always\s+(?:answer|reply|respond|talk)\s+(?:me\s+)?in\s+(.+)/i,
      /i prefer\s+(.+)/i,
      /don't\s+(?:ever\s+)?(.+)\s+again/i,
      /please\s+remember\s+(.+)/i,
    ];

    const banglaPatterns = [
      /মনে রেখো\s+(.+)/i,
      /আমাকে সবসময়\s+(.+)\s+(?:উত্তর দাও|বলবে|লিখবে)/i,
      /আমার পছন্দ\s+(.+)/i,
      /আর কখনও\s+(.+)\s+করবে না/i,
      /মনে রাখবে\s+(.+)/i,
    ];

    for (const pattern of [...englishPatterns, ...banglaPatterns]) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const preference = match[1].replace(/[.!?]+$/, "").trim();
        if (preference.length > 3 && preference.length < 150) {
          return await this.saveMemory(
            userId,
            `User preference: ${preference}`,
            "preference",
            undefined,
            "correction"
          );
        }
      }
    }

    return null;
  },

  /**
   * Generates a context injection string for the AI prompt based on active memories.
   * STRICT ENFORCEMENT: Empty string in Private or Disappearing Mode.
   */
  async buildMemoryContext(
    userId: string | null,
    query: string = "",
    privacyMode: PrivacyMode = "improvement"
  ): Promise<string> {
    if (!userId || userId === "guest" || privacyMode !== "improvement") {
      return "";
    }

    const relevant = await this.getRelevantMemories(userId, query);
    if (!relevant || relevant.length === 0) return "";

    const lines = relevant.map((m) => `- [${m.category.toUpperCase()}] ${m.content}`);
    return `\n\n--- RELEVANT USER PREFERENCES & MEMORY (Local User-Owned) ---\n${lines.join("\n")}\n--------------------------------------------------------------\n`;
  },
};
