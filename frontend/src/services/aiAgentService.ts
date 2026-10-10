import type { AIAgentLanguage, AIAgentModel, AgentMessage, WorkspaceContext, ActionRequest, PrivacyMode, AIAgentIntent } from "@/types/aiAgent";
import { supabase } from "../lib/supabaseClient";
import { localDb } from "./localDbService";
import { aiMemoryService } from "./aiMemoryService";
import { buildActionRequest, validateAndSanitizeAction } from "../lib/ai/aiActionValidator";
import { 
  routeUserMessage, 
  pruneHistoryForGemini, 
  sanitizeContextForGemini, 
  buildRoadmapActionButtons,
  setCachedResponse 
} from "../lib/ai/router";

export interface TokenStatus {
  total: number;
  used: number;
  remaining: number;
  resetAt: string;
  isExhausted: boolean;
  formattedResetDate?: string;
  formattedRemainingTime?: string;
}

export interface ChatSession {
  id: string;
  user_id?: string | null;
  title: string;
  created_at?: string;
  updated_at: string;
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  } catch {
    return "";
  }
}

function getGuestId(): string {
  if (typeof window === "undefined") return "guest";
  let gid = localStorage.getItem("focusforge_guest_id");
  if (!gid) {
    gid = "guest_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("focusforge_guest_id", gid);
  }
  return gid;
}

import { getBackendUrl } from "../lib/backendUrl";

function getApiUrl(): string {
  const base = getBackendUrl();
  return base ? `${base}/api` : "/api";
}

export function formatClientResetTime(resetDate: Date, lang: string = 'bn'): { formattedDate: string; formattedTimeRemaining: string } {
  const now = Date.now();
  const diffMs = Math.max(0, resetDate.getTime() - now);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const toBnDigits = (num: number): string => {
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map((d) => bnNums[parseInt(d, 10)] ?? d).join('');
  };

  if (lang === 'bn') {
    const timeRemainingStr = hours > 0
      ? `${toBnDigits(hours)} ঘণ্টা ${toBnDigits(minutes)} মিনিট`
      : `${toBnDigits(minutes)} মিনিট`;

    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const dateStr = resetDate.toLocaleDateString('bn-BD', options);
    return { formattedDate: dateStr, formattedTimeRemaining: timeRemainingStr };
  }

  const timeRemainingStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const dateStr = resetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { formattedDate: dateStr, formattedTimeRemaining: timeRemainingStr };
}

export async function getAITokenStatus(lang: string = "bn"): Promise<TokenStatus> {
  const token = await getToken();
  const isAuth = !!token;
  const targetTotal = isAuth ? 5000 : 1000;
  const quotaKey = isAuth ? "focusforge_auth_token_quota" : "focusforge_guest_token_quota";

  try {
    const guestId = getGuestId();
    const res = await fetch(`${getApiUrl()}/ai/tokens?lang=${lang}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-guest-id": guestId,
        "x-app-lang": lang,
      },
    });
    if (res.ok) {
      const serverStatus: TokenStatus = await res.json();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(quotaKey, JSON.stringify({
            total: serverStatus.total,
            used: serverStatus.used,
            resetAt: serverStatus.resetAt,
            isExhausted: serverStatus.isExhausted
          }));
        } catch {}
      }
      return serverStatus;
    }
  } catch {}

  // Local persistent quota check across browser refresh / app restarts
  let quotaRecord: { total: number; used: number; resetAt: string; isExhausted?: boolean } | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(quotaKey);
      if (stored) {
        quotaRecord = JSON.parse(stored);
      }
    } catch {}
  }

  const now = new Date();
  let usedTokens = 0;
  let resetAtDate = new Date(Date.now() + 86400000);

  if (quotaRecord && quotaRecord.resetAt) {
    const recordReset = new Date(quotaRecord.resetAt);
    if (recordReset > now) {
      usedTokens = quotaRecord.used || 0;
      resetAtDate = recordReset;
    }
  }

  const remaining = Math.max(0, targetTotal - usedTokens);
  const isExhausted = remaining <= 0;
  const { formattedDate, formattedTimeRemaining } = formatClientResetTime(resetAtDate, lang);

  const finalStatus: TokenStatus = {
    total: targetTotal,
    used: usedTokens,
    remaining,
    resetAt: resetAtDate.toISOString(),
    isExhausted,
    formattedResetDate: formattedDate,
    formattedRemainingTime: formattedTimeRemaining,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(quotaKey, JSON.stringify({
        total: targetTotal,
        used: usedTokens,
        resetAt: resetAtDate.toISOString(),
        isExhausted
      }));
    } catch {}
  }

  return finalStatus;
}

export function estimateClientTokenUsage(
  promptText: string = '', 
  responseText: string = '',
  modelMode: AIAgentModel = 'fast'
): number {
  const normalizedMode = (modelMode || '').toLowerCase().trim();
  const isPlanning = 
    normalizedMode === 'planning' || 
    normalizedMode === 'deep' || 
    normalizedMode === 'pro' || 
    normalizedMode === 'focentia-pro';

  if (isPlanning) {
    // Focentia Pro / Deep Planning: strictly 25 to 30 tokens per interaction
    const responseLen = typeof responseText === 'string' ? responseText.length : 0;
    if (responseLen > 350) return 30;
    if (responseLen > 150) return 28;
    return 25;
  }

  // Focentia 2.0 / 2.1 / Fast / Standard Mode: 4 to 5 tokens (strictly capped at max 6 tokens)
  const promptLen = typeof promptText === 'string' ? promptText.length : 0;
  const responseLen = typeof responseText === 'string' ? responseText.length : 0;
  
  if (responseLen > 400) {
    return 6;
  } else if (responseLen > 150 || promptLen > 250) {
    return 5;
  }
  return 4;
}

/**
 * Fetch chat sessions directly from database with local-first fallback
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const token = await getToken();
  const guestId = getGuestId();

  // 1. Try server database first
  try {
    const res = await fetch(`${getApiUrl()}/ai/sessions`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-guest-id": guestId,
      },
    });
    if (res.ok) {
      const serverSessions = await res.json();
      if (Array.isArray(serverSessions) && serverSessions.length > 0) {
        return serverSessions.map((s: any) => ({
          id: s.id,
          title: s.title || "Chat",
          user_id: s.user_id || null,
          created_at: s.created_at,
          updated_at: s.updated_at || s.created_at || new Date().toISOString(),
        })).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      }
    }
  } catch (netErr) {
    console.warn("[aiAgentService] Server sessions fetch notice:", netErr);
  }

  // 2. Fallback to localDb
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    if (userId) {
      const sessions = await localDb.getAllForUser<any>("ai_sessions", userId, false);
      if (sessions.length > 0) {
        return sessions.map((s) => ({
          id: s.id,
          title: s.title || "Chat",
          user_id: s.userId || userId,
          created_at: s.createdAt,
          updated_at: s.updatedAt || s.createdAt || new Date().toISOString(),
        })).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      }
    }
  } catch (err) {
    console.warn("[aiAgentService] Error reading local sessions:", err);
  }

  // 3. Fallback to cache / guest storage
  if (typeof window !== "undefined") {
    try {
      const guestStored = localStorage.getItem("focusforge_guest_sessions_list") || sessionStorage.getItem("focusforge_guest_sessions_list");
      if (guestStored) {
        const parsed = JSON.parse(guestStored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }

  return [];
}

/**
 * Create a new chat session in local-first database
 */
export async function createChatSession(title: string): Promise<ChatSession> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    const session: ChatSession = { id: newId, title, user_id: userId, updated_at: now, created_at: now };
    if (userId) {
      await localDb.put("ai_sessions", {
        ...session,
        userId,
        createdAt: now,
        updatedAt: now,
      } as any);
    } else {
      if (typeof window !== "undefined") {
        const existing = JSON.parse(localStorage.getItem("focusforge_guest_sessions_list") || sessionStorage.getItem("focusforge_guest_sessions_list") || "[]");
        const updated = [session, ...existing];
        localStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updated));
        sessionStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updated));
      }
    }
    return session;
  } catch {
    return { id: newId, title, updated_at: now };
  }
}

/**
 * Delete a session and its messages from database and local storage
 */
export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  const token = await getToken();
  const guestId = getGuestId();

  // 1. Delete on server API
  try {
    await fetch(`${getApiUrl()}/ai/sessions/${sessionId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-guest-id": guestId,
      },
    });
  } catch (netErr) {
    console.warn("[aiAgentService] Server delete session error:", netErr);
  }

  // 2. Delete in localDb
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    if (userId) {
      await localDb.softDelete("ai_sessions", userId, sessionId);
      const allMsgs = await localDb.getAllForUser<any>("ai_messages", userId, false);
      for (const m of allMsgs) {
        if (m.sessionId === sessionId) {
          await localDb.softDelete("ai_messages", userId, m.id);
        }
      }
    }
  } catch (err) {
    console.warn("[aiAgentService] Error deleting local chat session:", err);
  }

  // 3. Clear cache keys
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_auth_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_chat_msg_${sessionId}`);
  }

  return { success: true };
}

/**
 * Clear all chat sessions and messages for the user
 */
export async function clearAllChatSessions(): Promise<{ success: boolean }> {
  let userId: string | null = null;
  const token = await getToken();
  const guestId = getGuestId();

  // 1. Clear on server API
  try {
    await fetch(`${getApiUrl()}/ai/sessions`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-guest-id": guestId,
      },
    });
  } catch (netErr) {
    console.warn("[aiAgentService] Server clear sessions error:", netErr);
  }

  // 2. Clear in localDb
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
    if (userId) {
      const sessions = await localDb.getAllForUser<any>("ai_sessions", userId, false);
      for (const s of sessions) {
        await localDb.softDelete("ai_sessions", userId, s.id);
      }
      const allMsgs = await localDb.getAllForUser<any>("ai_messages", userId, false);
      for (const m of allMsgs) {
        await localDb.softDelete("ai_messages", userId, m.id);
      }
    }
  } catch (err) {
    console.warn("[aiAgentService] Error clearing local chat sessions:", err);
  }

  // 3. Clear storage
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("focusforge_guest_sessions_list");
      localStorage.removeItem("focusforge_guest_sessions_list");
      localStorage.removeItem("focusforge_active_sessions_cache");
      localStorage.removeItem("focusforge_ai_sessions_guest");
      if (userId) {
        localStorage.removeItem(`focusforge_ai_sessions_${userId}`);
      }
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("focusforge_auth_msg_") || k.startsWith("focusforge_chat_msg_") || k.startsWith("focusforge_guest_msg_") || k.startsWith("focusforge_ai_sessions_")) {
          localStorage.removeItem(k);
        }
      });
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("focusforge_guest_msg_")) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
  }

  return { success: true };
}

/**
 * Fetch messages for a specific session from database or local-first storage
 */
export async function getChatMessages(sessionId: string): Promise<AgentMessage[]> {
  const token = await getToken();
  const guestId = getGuestId();

  // 1. Try server database first
  try {
    const res = await fetch(`${getApiUrl()}/ai/sessions/${sessionId}/messages`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-guest-id": guestId,
      },
    });
    if (res.ok) {
      const serverMsgs = await res.json();
      if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
        return serverMsgs.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          intent: m.intent,
          payload: m.payload_json || m.payload,
          roadmap: m.payload_json?.stages ? m.payload_json : null,
          createdAt: new Date(m.created_at || m.createdAt || Date.now()),
        }));
      }
    }
  } catch (netErr) {
    console.warn("[aiAgentService] Server messages fetch notice:", netErr);
  }

  // 2. Fallback to localDb
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    if (userId) {
      const msgs = await localDb.getAllForUser<any>("ai_messages", userId, false);
      const sessionMsgs = msgs.filter((m) => m.sessionId === sessionId);
      if (sessionMsgs.length > 0) {
        return sessionMsgs
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            intent: m.intent,
            payload: m.payload,
            createdAt: new Date(m.createdAt || Date.now()),
          }));
      }
    }
  } catch (err) {
    console.warn("[aiAgentService] Error reading local messages:", err);
  }

  // 3. Fallback to cache / storage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`focusforge_chat_msg_${sessionId}`) ||
                     localStorage.getItem(`focusforge_auth_msg_${sessionId}`) ||
                     localStorage.getItem(`focusforge_guest_msg_${sessionId}`) ||
                     sessionStorage.getItem(`focusforge_guest_msg_${sessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt || m.created_at || Date.now()),
          }));
        }
      }
    } catch {}
  }

  return [];
}

const CANDIDATE_GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

/**
 * Fast-path local navigation intent detector for instant zero-latency responses (<50ms)
 */
export function detectFastPathNavigation(
  query: string,
  isBn: boolean
): { message: string; intent: AIAgentIntent; action: ActionRequest } | null {
  const q = (query || "").trim().toLowerCase();

  // Focus navigation
  if (/^(open\s+focus|go\s+to\s+focus|start\s+focus|take\s+me\s+to\s+focus|ফোকাস\s*খুলুন|ফোকাস\s*খোলো|ফোকাসে\s*যাও|ফোকাস\s*টাইমার)$/i.test(q)) {
    const act = buildActionRequest("open_focus", {}, isBn ? "ফোকাস টাইমার খুলুন" : "Open Focus Timer");
    return act ? {
      message: isBn ? "অবশ্যই, আমি তোমাকে Focus-এ নিয়ে যেতে পারি।" : "I can take you to Focus right now.",
      intent: "FOCUS_SESSION",
      action: act,
    } : null;
  }

  // Planner navigation
  if (/^(open\s+planner|go\s+to\s+planner|take\s+me\s+to\s+planner|view\s+planner|প্ল্যানার\s*খুলুন|প্ল্যানার\s*খোলো|প্ল্যানারে\s*যাও|রুটিন\s*খুলুন)$/i.test(q)) {
    const act = buildActionRequest("open_planner", {}, isBn ? "প্ল্যানার খুলুন" : "Open Planner");
    return act ? {
      message: isBn ? "অবশ্যই, চলো তোমার Planner দেখে আসি।" : "Sure thing, let's head over to your Planner.",
      intent: "PLANNER_CREATE",
      action: act,
    } : null;
  }

  // Diary navigation
  if (/^(open\s+diary|go\s+to\s+diary|take\s+me\s+to\s+diary|view\s+diary|my\s+diary|ডায়েরি\s*খুলুন|ডায়েরি\s*খোলো|ডায়েরিতে\s*যাও|মাই\s*ডায়েরি)$/i.test(q)) {
    const act = buildActionRequest("open_diary", {}, isBn ? "মাই ডায়েরি খুলুন" : "Open My Diary");
    return act ? {
      message: isBn ? "অবশ্যই, তোমার ব্যক্তিগত Diary খুলে দিচ্ছি।" : "Opening your private Diary for you.",
      intent: "MY_DIARY",
      action: act,
    } : null;
  }

  // Notes & Files navigation
  if (/^(open\s+notes|go\s+to\s+notes|notes\s+and\s+files|view\s+notes|নোটস\s*খুলুন|নোটস\s*খোলো|নোটসে\s*যাও|নোটস\s*ও\s*ফাইলস)$/i.test(q)) {
    const act = buildActionRequest("open_notes", {}, isBn ? "নোটস ও ফাইলস খুলুন" : "Open Notes & Files");
    return act ? {
      message: isBn ? "অবশ্যই, নোটস ও ফাইলস সেকশনে নিয়ে যাচ্ছি।" : "Taking you to Notes & Files.",
      intent: "NOTES_FILES",
      action: act,
    } : null;
  }

  // Mind Space navigation
  if (/^(open\s+mind|open\s+mind\s+space|mind\s+hub|problem\s+solver|মাইন্ড\s*স্পেস|মাইন্ড\s*হাব|প্রবলেম\s*সলভার)$/i.test(q)) {
    const act = buildActionRequest("open_mind", {}, isBn ? "মাইন্ড স্পেস খুলুন" : "Open Mind Space");
    return act ? {
      message: isBn ? "অবশ্যই, Mind Space-এ নিয়ে যাচ্ছি।" : "Taking you to Mind Space.",
      intent: "PROBLEM_SOLVER",
      action: act,
    } : null;
  }

  // Dashboard navigation
  if (/^(open\s+dashboard|go\s+to\s+dashboard|take\s+me\s+to\s+dashboard|ড্যাশবোর্ড\s*খুলুন|ড্যাশবোর্ড\s*খোলো|ড্যাশবোর্ডে\s*যাও)$/i.test(q)) {
    const act = buildActionRequest("open_dashboard", {}, isBn ? "ড্যাশবোর্ড খুলুন" : "Open Dashboard");
    return act ? {
      message: isBn ? "অবশ্যই, চলো Dashboard-এ তোমার আজকের অগ্রগতি দেখি।" : "Taking you to your Dashboard overview.",
      intent: "DASHBOARD",
      action: act,
    } : null;
  }

  // Time Log / Skill Builder navigation
  if (/^(open\s+time\s+log|go\s+to\s+time\s+log|skill\s+builder|টাইম\s*লগ\s*খুলুন|টাইম\s*লগ|স্কিল\s*বিল্ডার)$/i.test(q)) {
    const act = buildActionRequest("open_learning", {}, isBn ? "টাইম লগ খুলুন" : "Open Time Log");
    return act ? {
      message: isBn ? "অবশ্যই, তোমার Time Log ও স্কিল বিল্ডারে নিয়ে যাচ্ছি।" : "Taking you to your Time Log & Skill Builder.",
      intent: "LEARNING_HUB",
      action: act,
    } : null;
  }

  return null;
}

/**
 * Converts legacy/Gemini intent payloads into structured ActionRequest objects
 */
export function convertIntentPayloadToActions(intent?: string, payload?: any, isBn: boolean = false): ActionRequest[] {
  if (!intent || !payload || intent === "GREETING_OR_GENERAL") return [];

  const actions: ActionRequest[] = [];

  if (intent === "PLANNER_CREATE") {
    if (Array.isArray(payload.tasks) && payload.tasks.length > 1) {
      const act = buildActionRequest("create_tasks", { tasks: payload.tasks }, isBn ? "প্ল্যানারে এই কাজগুলো যোগ করবেন?" : "Add these tasks to Planner?");
      if (act) actions.push(act);
    } else {
      const task = Array.isArray(payload.tasks) ? payload.tasks[0] : payload;
      if (task) {
        const title = task.title || (isBn ? "নতুন স্টাডি টাস্ক" : "New Study Task");
        const act = buildActionRequest("create_task", {
          title,
          estimatedMinutes: task.estimatedMinutes || 30,
          targetDate: task.targetDate || payload.targetDate,
          time: task.time,
          priority: task.priority || "medium",
          category: task.category || "Study",
          notes: task.notes || ""
        }, isBn ? `টাস্ক যোগ করবেন: ${title}` : `Add Task: ${title}`);
        if (act) actions.push(act);
      }
    }
  } else if (intent === "FOCUS_SESSION") {
    const mins = payload.durationMinutes || 25;
    const goal = payload.goal || (isBn ? "ডিপ ওয়ার্ক সেশন" : "Deep Work Session");
    const act = buildActionRequest("create_focus_session", {
      durationMinutes: mins,
      goal,
      mode: payload.mode || "deep"
    }, isBn ? `${mins} মিনিটের ফোকাস সেশন শুরু করবেন?` : `Start ${mins}m Focus Session?`);
    if (act) actions.push(act);
  } else if (intent === "NOTES_FILES") {
    const act = buildActionRequest("create_note", {
      title: payload.title || (isBn ? "নতুন স্টাডি নোট" : "New Study Note"),
      content: payload.content || "",
      category: payload.category || "AI Generated"
    }, isBn ? "নতুন নোট তৈরি করবেন?" : "Create this note?");
    if (act) actions.push(act);
  } else if (intent === "MY_DIARY" || intent === "DIARY_ENTRY") {
    const act = buildActionRequest("create_diary_entry", {
      title: payload.title || (isBn ? "আজকের ডায়েরি" : "Today's Diary Entry"),
      content: payload.content || "",
      mood: payload.mood || "reflective",
      topicTitle: payload.topicTitle || "General"
    }, isBn ? "ডায়েরি এন্ট্রি সেভ করবেন?" : "Save diary entry?");
    if (act) actions.push(act);
  }

  return actions;
}

function extractMessageAndIntentFromJson(text: string, isBn: boolean): {
  message: string;
  intent: AIAgentIntent;
  payload: any;
  roadmap?: any;
  actions: ActionRequest[];
  structuredResponse?: any;
  emotion?: string;
  reaction?: string | null;
} {
  let clean = text.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(clean);
    const intent: AIAgentIntent = parsed.intent || "GREETING_OR_GENERAL";
    const payload = parsed.payload || null;
    const roadmap = parsed.roadmap || (payload && payload.stages ? payload : (parsed.data && parsed.data.stages ? parsed.data : null));
    let actions: ActionRequest[] = [];

    if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
      for (const act of parsed.actions) {
        const built = buildActionRequest(act.type, act.parameters || act.args || {}, act.titleBn || act.title, act.titleEn || act.title);
        if (built) actions.push(built);
      }
    }

    if (actions.length === 0 && payload) {
      actions = convertIntentPayloadToActions(intent, payload, isBn);
    }

    return {
      message: parsed.message || (isBn ? "তোমার অনুরোধটি প্রস্তুত করা হয়েছে।" : "I processed your request."),
      intent,
      payload,
      roadmap,
      actions,
      structuredResponse: parsed,
      emotion: parsed.emotion,
      reaction: parsed.reaction || null,
    };
  } catch (err) {
    const messageMatch = clean.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const intentMatch = clean.match(/"intent"\s*:\s*"([A-Z_]+)"/);
    
    if (messageMatch && messageMatch[1]) {
      let extractedMsg = messageMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      
      let payloadObj = null;
      const payloadMatch = clean.match(/"payload"\s*:\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/);
      if (payloadMatch && payloadMatch[1]) {
        try {
          payloadObj = JSON.parse(payloadMatch[1]);
        } catch {}
      }

      const intent: AIAgentIntent = (intentMatch ? intentMatch[1] : "GREETING_OR_GENERAL") as AIAgentIntent;
      const actions = convertIntentPayloadToActions(intent, payloadObj, isBn);

      return {
        message: extractedMsg,
        intent,
        payload: payloadObj,
        actions,
      };
    }

    const sanitized = clean
      .replace(/^[^{]*\{/, '')
      .replace(/\}[^}]*$/, '')
      .replace(/"message"\s*:\s*"?/gi, '')
      .replace(/"intent"\s*:\s*"[A-Z_]*"/gi, '')
      .replace(/"payload"\s*:\s*(?:\{[\s\S]*?\}|null)/gi, '')
      .replace(/[{}\[\]",]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      message: sanitized && sanitized.length > 5 ? sanitized : clean.replace(/^[{\s"']+|[}\s"']+$/g, ''),
      intent: "GREETING_OR_GENERAL",
      payload: null,
      actions: [],
    };
  }
}

const FAST_GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

const SMART_GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

const PLANNING_GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

/**
 * Clean offline fallback when network is unavailable (never fakes tasks or databases)
 */
function generateClientRuleBasedResponse(
  query: string, 
  isBn: boolean,
  history: Array<{ role: string; content: string }> = [],
  model: AIAgentModel = "smart"
): { message: string; intent: AIAgentIntent; payload: any } {
  return {
    intent: "GREETING_OR_GENERAL",
    message: isBn
      ? "দুঃখিত, এআই সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করো।"
      : "Could not establish connection to the AI service. Please check your network and try again.",
    payload: null
  };
}

/**
 * Generates an intelligent AI response directly using Gemini if the backend server is unreachable
 */
async function generateClientGeminiResponse(
  message: string,
  context: WorkspaceContext,
  history: Array<{ role: string; content: string }> = [],
  lang: string = "bn",
  modelMode: AIAgentModel = "smart",
  signal?: AbortSignal
): Promise<{ 
  message: string; 
  intent: AIAgentIntent | string; 
  payload: any;
  roadmap?: any;
  actions?: ActionRequest[];
  structuredResponse?: any;
  emotion?: string;
  reaction?: string | null;
}> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const banglishIndicators = /\b(ami|amar|tumi|tomar|apni|apnar|korbo|korchi|korte|chai|dorkar|shikhbo|hobe|kemon|achho|achen|bhalo|parbo|ki|kibhabe|kothay|kokhon|porbo|porte|porashona|ajke|aajke|ekhon|shuru|routine)\b/i;
  const isBn = /[\u0980-\u09FF]/.test(message) || banglishIndicators.test(message) || (lang === "bn" && !/^[a-zA-Z0-9\s.,!?'"-]+$/.test(message.trim()));
  
  const q = (message || '').trim().toLowerCase();
  if (!q) {
    const fallback = generateClientRuleBasedResponse(message, isBn, history, modelMode);
    return {
      ...fallback,
      actions: [],
      emotion: "neutral",
      reaction: null,
    };
  }


  const fallback = generateClientRuleBasedResponse(message, isBn, history, modelMode);
  return {
    ...fallback,
    actions: convertIntentPayloadToActions(fallback.intent, fallback.payload, isBn),
    emotion: "neutral",
    reaction: null,
  };
}

export async function generateSmartTitle(message: string): Promise<string> {
  const clean = message.trim().replace(/[\r\n]+/g, ' ');
  if (clean.length <= 30) return clean;
  return clean.substring(0, 28) + '...';
}

/**
 * Main function to send message:
 * 1. Checks fast path for instant zero-latency navigation
 * 2. Injects relevant local memory & captures corrections (when AI improvement enabled)
 * 3. Generates response via Gemini / API
 * 4. Normalizes structured actions requiring user confirmation
 * 5. Respects privacyMode: disappearing mode skips all persistence
 */
export async function sendAgentMessage(
  message: string, 
  context: WorkspaceContext, 
  sessionId?: string,
  history?: Array<{ role: string; content: string }>,
  lang: string = "bn",
  model: AIAgentModel = "smart",
  signal?: AbortSignal,
  privacyMode: PrivacyMode = "improvement"
): Promise<{ sessionId: string; sessionTitle?: string; aiMessage: AgentMessage; tokenStatus?: TokenStatus }> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // 1. GLORY LOCAL-FIRST ROUTER: Deterministic on-device resolution (0 tokens)
  const isBn = lang === 'bn';
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isAuth = !!currentUser?.id;
  const userName = currentUser?.user_metadata?.name || currentUser?.user_metadata?.full_name || '';

  const localResolution = await routeUserMessage(message, context, history, isAuth, userName);

  if (!localResolution.shouldCallGemini) {
    const targetSessionId = (sessionId && isUuid.test(sessionId)) ? sessionId : crypto.randomUUID();
    const currentTokenStatus = await getAITokenStatus(lang);

    const localAiMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: localResolution.message,
      intent: localResolution.intent as any,
      actions: localResolution.actions,
      roadmap: localResolution.roadmap || null,
      emotion: localResolution.orbEmotion,
      privacyMode,
      createdAt: new Date(),
    };

    return {
      sessionId: targetSessionId,
      sessionTitle: message.slice(0, 30),
      aiMessage: localAiMessage,
      tokenStatus: currentTokenStatus,
    };
  }

  // Ensure valid UUID for PostgreSQL uuid type
  const targetSessionId = (sessionId && isUuid.test(sessionId)) ? sessionId : crypto.randomUUID();
  const token = await getToken();
  const guestId = getGuestId();

  // 2. PRIVACY & MEMORY INJECTION: Retrieve relevant memory based on query
  let enrichedContext = context;
  try {
    if (currentUser?.id) {
      if (privacyMode === "improvement") {
        aiMemoryService.detectAndSaveCorrection(currentUser.id, message, "improvement").catch(() => {});
      }
      const memoryContext = await aiMemoryService.buildMemoryContext(currentUser.id, message, privacyMode);
      if (memoryContext) {
        enrichedContext = {
          ...context,
          instructions: (context.instructions || "") + memoryContext,
        };
      }
    }
  } catch {}

  let resData: any = null;

  // 3. Optimized Gemini API call (Pruned to last 4 messages, sanitized context)
  const prunedHistory = pruneHistoryForGemini(history);
  const sanitizedCtx = sanitizeContextForGemini(enrichedContext);

  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/chat`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-guest-id': guestId,
        'x-app-lang': lang,
      },
      body: JSON.stringify({ 
        sessionId: targetSessionId, 
        message, 
        context: sanitizedCtx, 
        history: prunedHistory, 
        model,
        privacyMode 
      })
    });
    
    if (res.ok) {
      resData = await res.json();
    } else {
      console.warn(`[AI Agent Service] Server returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    console.warn('[AI Agent Service] Network fetch notice:', err?.message || err);
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // 4. Client-side Gemini Fallback if server returned no answer
  if (!resData || !resData.aiMessage?.content || resData.sessionId?.startsWith('session_')) {
    const generated = await generateClientGeminiResponse(message, context, prunedHistory, lang, model, signal);
    resData = {
      sessionId: targetSessionId,
      sessionTitle: undefined,
      aiMessage: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generated.message,
        intent: generated.intent as any,
        payload: generated.payload,
        roadmap: generated.roadmap || null,
        actions: generated.actions || [],
        structuredResponse: generated.structuredResponse,
        emotion: generated.emotion,
        reaction: generated.reaction,
        privacyMode,
        createdAt: new Date()
      }
    };
  }

  // Attach post-roadmap buttons if a roadmap was generated
  if (resData.aiMessage?.roadmap) {
    const roadmapBtns = buildRoadmapActionButtons(resData.aiMessage.roadmap, isBn);
    resData.aiMessage.actions = [...(resData.aiMessage.actions || []), ...roadmapBtns];
    setCachedResponse(message.toLowerCase().trim(), resData.aiMessage);
  }

  // 5. Ensure actions are populated on assistant message
  if (!resData.aiMessage.actions || resData.aiMessage.actions.length === 0) {
    const payload = resData.aiMessage.payload || (resData.aiMessage as any).payload_json;
    resData.aiMessage.actions = convertIntentPayloadToActions(resData.aiMessage.intent, payload, isBn);
  }
  resData.aiMessage.privacyMode = privacyMode;

  // Ensure sessionId is a valid UUID
  if (!resData.sessionId || !isUuid.test(resData.sessionId)) {
    resData.sessionId = targetSessionId;
  }

  // Generate or determine smart title
  let finalTitle = resData.sessionTitle;
  if (!finalTitle || finalTitle.startsWith('session_')) {
    finalTitle = await generateSmartTitle(message);
    resData.sessionTitle = finalTitle;
  }

  // 6. DISAPPEARING MESSAGE MODE ENFORCEMENT: ZERO local persistence
  if (privacyMode === "disappearing") {
    return resData;
  }

  // Handle persistence & token calculation
  const userId = currentUser?.id || null;

  // Client-side token consumption calculation if server didn't already return tokenStatus
  if (!resData.tokenStatus) {
    const tokensUsed = estimateClientTokenUsage(message, resData.aiMessage.content, model);
    const targetTotal = isAuth ? 5000 : 1000;
    const tokenKey = isAuth ? "focusforge_auth_tokens_used" : "focusforge_guest_tokens_used";
    let currentUsed = 0;
    if (typeof window !== "undefined") {
      try {
        const stored = isAuth ? localStorage.getItem(tokenKey) : sessionStorage.getItem(tokenKey);
        currentUsed = stored ? parseInt(stored, 10) : 0;
        const newUsed = Math.min(targetTotal, currentUsed + tokensUsed);
        if (isAuth) {
          localStorage.setItem(tokenKey, newUsed.toString());
        } else {
          sessionStorage.setItem(tokenKey, newUsed.toString());
        }
        resData.tokenStatus = {
          total: targetTotal,
          used: newUsed,
          remaining: Math.max(0, targetTotal - newUsed),
          resetAt: new Date(Date.now() + 86400000).toISOString(),
          isExhausted: (targetTotal - newUsed) <= 0,
          formattedResetDate: "",
          formattedRemainingTime: "24h",
        };
      } catch {}
    }
  }

  if (isAuth && userId) {
    // If privacyMode is "private", ZERO persistent storage writes!
    // Messages stay in React memory only and are never saved to IndexedDB or localStorage.
    if (privacyMode !== "private") {
      try {
        const nowStr = new Date().toISOString();

        // 1. Upsert session locally
        await localDb.put("ai_sessions", {
          id: resData.sessionId,
          title: finalTitle,
          userId,
          updatedAt: nowStr,
          createdAt: nowStr,
        } as any);

        // 2. Insert user message locally
        await localDb.put("ai_messages", {
          id: crypto.randomUUID(),
          sessionId: resData.sessionId,
          userId,
          role: 'user',
          content: message,
          createdAt: nowStr,
        } as any);

        // 3. Insert assistant message locally
        await localDb.put("ai_messages", {
          id: isUuid.test(resData.aiMessage.id) ? resData.aiMessage.id : crypto.randomUUID(),
          sessionId: resData.sessionId,
          userId,
          role: 'assistant',
          content: resData.aiMessage.content,
          intent: resData.aiMessage.intent || null,
          payload: (resData.aiMessage as any).payload || (resData.aiMessage as any).payload_json || null,
          createdAt: nowStr,
        } as any);
      } catch (saveErr) {
        console.warn("[aiAgentService] LocalDb message save error:", saveErr);
      }

      if (typeof window !== "undefined") {
        try {
          const sessionsCacheKey = userId ? `focusforge_ai_sessions_${userId}` : "focusforge_ai_sessions_guest";
          const cachedSessions = localStorage.getItem(sessionsCacheKey) || localStorage.getItem("focusforge_active_sessions_cache") || "[]";
          const parsed: ChatSession[] = JSON.parse(cachedSessions);
          const existingIdx = parsed.findIndex(s => s.id === resData.sessionId);
          let updatedList: ChatSession[];
          if (existingIdx >= 0) {
            updatedList = [...parsed];
            updatedList[existingIdx] = {
              ...updatedList[existingIdx],
              title: finalTitle,
              updated_at: new Date().toISOString()
            };
          } else {
            updatedList = [{ id: resData.sessionId, title: finalTitle, updated_at: new Date().toISOString() }, ...parsed];
          }
          localStorage.setItem(sessionsCacheKey, JSON.stringify(updatedList));
        } catch {}
      }
    }
  } else {
    // Guest Mode: ZERO database writes! Temporary sessionStorage only!
    if (typeof window !== "undefined") {
      try {
        // Save guest sessions to sessionStorage
        const cachedSessions = sessionStorage.getItem("focusforge_guest_sessions_list") || "[]";
        const parsed: ChatSession[] = JSON.parse(cachedSessions);
        const existingIdx = parsed.findIndex(s => s.id === resData.sessionId);
        let updatedList: ChatSession[];
        if (existingIdx >= 0) {
          updatedList = [...parsed];
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            title: finalTitle,
            updated_at: new Date().toISOString()
          };
        } else {
          updatedList = [{ id: resData.sessionId, title: finalTitle, updated_at: new Date().toISOString() }, ...parsed];
        }
        sessionStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updatedList));

        // Save guest messages to sessionStorage
        const msgKey = `focusforge_guest_msg_${resData.sessionId}`;
        const existingMsgs = JSON.parse(sessionStorage.getItem(msgKey) || "[]");
        existingMsgs.push(
          { id: crypto.randomUUID(), role: 'user', content: message, createdAt: new Date() },
          { id: resData.aiMessage.id, role: 'assistant', content: resData.aiMessage.content, intent: resData.aiMessage.intent, payload: resData.aiMessage.payload, createdAt: new Date() }
        );
        sessionStorage.setItem(msgKey, JSON.stringify(existingMsgs));
      } catch {}
    }
  }

  return resData;
}

export async function transcribeAudioBlob(blob: Blob, language?: string): Promise<string> {
  const token = await getToken();
  const guestId = getGuestId();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = ((reader.result as string) || '').split(',')[1] || '';
        if (!base64Data) {
          resolve('');
          return;
        }

        // 1. Primary: Express backend /api/ai/transcribe (fast 6s timeout)
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6500);
          const res = await fetch(`${getApiUrl()}/ai/transcribe`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'x-guest-id': guestId,
              'x-app-lang': language || 'auto',
            },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: blob.type || 'audio/webm',
              language: language || 'auto',
            }),
          });
          clearTimeout(timer);

          if (res.ok) {
            const data = await res.json();
            if (data && typeof data.text === 'string' && data.text.trim()) {
              resolve(data.text.trim());
              return;
            }
          }
        } catch (backendErr) {
          console.warn('[aiAgentService] Backend transcribe error/timeout, trying Next.js internal route:', backendErr);
        }

        // 2. Secondary: Next.js internal route /api/ai/transcribe
        try {
          const controller2 = new AbortController();
          const timer2 = setTimeout(() => controller2.abort(), 6500);
          const res2 = await fetch('/api/ai/transcribe', {
            method: 'POST',
            signal: controller2.signal,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: blob.type || 'audio/webm',
              language: language || 'auto',
            }),
          });
          clearTimeout(timer2);

          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && typeof data2.text === 'string' && data2.text.trim()) {
              resolve(data2.text.trim());
              return;
            }
          }
        } catch (nextErr) {
          console.warn('[aiAgentService] Next.js transcribe route notice:', nextErr);
        }


        resolve('');
      } catch (err) {
        console.warn('[aiAgentService] Audio transcribe error:', err);
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}
