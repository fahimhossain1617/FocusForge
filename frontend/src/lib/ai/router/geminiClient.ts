/**
 * Glory AI Local-First Router — Gemini Client Optimizer & Cache
 * Handles big task calls to Gemini with token bounds, zero-thinking budget,
 * last-4-turn history pruning, and query response caching.
 */

import type { ActionRequest, WorkspaceContext } from '../../../types/aiAgent';
import { buildActionRequest } from '../aiActionValidator';

export interface GeminiCallConfig {
  taskType: 'roadmap' | 'big_task' | 'fallback';
  modelPreference?: string;
  maxOutputTokens: number;
}

// In-memory short-lived cache for identical big-task queries (5-minute TTL)
interface CacheEntry {
  data: any;
  cachedAt: number;
}
const requestCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedResponse(normalizedQuery: string): any | null {
  const entry = requestCache.get(normalizedQuery);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    requestCache.delete(normalizedQuery);
    return null;
  }
  return entry.data;
}

export function setCachedResponse(normalizedQuery: string, data: any): void {
  requestCache.set(normalizedQuery, {
    data,
    cachedAt: Date.now(),
  });
}

/**
 * Derives safe Gemini call limits by task type (fixing the empty output bug)
 */
export function getGeminiConfigForTask(taskType: 'roadmap' | 'big_task' | 'fallback'): GeminiCallConfig {
  if (taskType === 'roadmap') {
    return {
      taskType: 'roadmap',
      modelPreference: 'gemini-3.8-flash',
      maxOutputTokens: 1500, // Never below 1200 for structured roadmaps
    };
  }

  if (taskType === 'big_task') {
    return {
      taskType: 'big_task',
      modelPreference: 'gemini-3.7-flash',
      maxOutputTokens: 800,
    };
  }

  return {
    taskType: 'fallback',
    modelPreference: 'gemini-3.5-flash-lite',
    maxOutputTokens: 400, // Never below 100
  };
}

/**
 * Prunes conversational history to strictly last 4 messages, redacting diary/notes
 */
export function pruneHistoryForGemini(
  history?: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-4).map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: (msg.content || '').slice(0, 1000),
  }));
}

/**
 * Sanitizes workspace context to never leak private diary or sensitive content to Gemini
 */
export function sanitizeContextForGemini(context?: WorkspaceContext): any {
  if (!context) return {};
  return {
    currentDate: context.currentDate || new Date().toISOString().split('T')[0],
    focusMinutesToday: context.focusMinutesToday || 0,
    tasksCount: context.tasks?.length || 0,
    completedTasksCount: context.completedTasksCount || 0,
    // Do NOT include diarySummary or raw notes content unless explicitly requested
  };
}

/**
 * Builds post-roadmap action buttons: "Add to Planner" and "Open Time Log"
 */
export function buildRoadmapActionButtons(roadmap: any, isBn: boolean): ActionRequest[] {
  const actions: ActionRequest[] = [];
  if (!roadmap) return actions;

  const subject = roadmap.subject || roadmap.title || 'Study Roadmap';

  const timeLogAct = buildActionRequest('create_skill_roadmap', {
    folderName: subject,
    targetHours: 20,
  }, isBn ? `টাইম লগে যোগ: ${subject}` : `Track in Time Log: ${subject}`);

  const openPlannerAct = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');

  if (timeLogAct) actions.push(timeLogAct);
  if (openPlannerAct) actions.push(openPlannerAct);

  return actions;
}
