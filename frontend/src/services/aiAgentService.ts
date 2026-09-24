import type { AIAgentLanguage, AIAgentModel, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
import { supabase } from "../lib/supabaseClient";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function getAITokenStatus(lang: string = "bn"): Promise<TokenStatus> {
  const token = await getToken();
  const isAuth = !!token;
  const targetTotal = isAuth ? 5000 : 1000;

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
      return await res.json();
    }
  } catch {}

  let usedTokens = 0;
  if (typeof window !== "undefined") {
    try {
      const key = isAuth ? "focusforge_auth_tokens_used" : "focusforge_guest_tokens_used";
      const stored = isAuth ? localStorage.getItem(key) : sessionStorage.getItem(key);
      usedTokens = stored ? parseInt(stored, 10) : 0;
    } catch {}
  }

  const remaining = Math.max(0, targetTotal - usedTokens);
  return {
    total: targetTotal,
    used: usedTokens,
    remaining,
    resetAt: new Date(Date.now() + 86400000).toISOString(),
    isExhausted: remaining <= 0,
    formattedResetDate: "",
    formattedRemainingTime: "24h",
  };
}

export function estimateClientTokenUsage(
  promptText: string = '', 
  responseText: string = '',
  modelMode: AIAgentModel = 'fast'
): number {
  const promptChars = promptText?.length || 0;
  const responseChars = responseText?.length || 0;
  const promptTokens = Math.ceil(promptChars / 3.5);
  const responseTokens = Math.ceil(responseChars / 3.5);
  const baseTokens = Math.max(10, promptTokens + responseTokens);

  if (modelMode === 'fast') {
    return Math.max(5, Math.round(baseTokens * 0.5));
  } else if (modelMode === 'planning') {
    return Math.max(30, Math.round(baseTokens * 2.0));
  }

  return Math.max(15, baseTokens);
}

/**
 * Fetch chat sessions directly from API / Supabase with session/cache fallback
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const token = await getToken();
  const guestId = getGuestId();

  // 1. Try server endpoint first
  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-guest-id': guestId,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (typeof window !== 'undefined' && token) {
          try { localStorage.setItem('focusforge_active_sessions_cache', JSON.stringify(data)); } catch {}
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[aiAgentService] Server sessions fetch error, trying direct Supabase:', err);
  }

  // 2. Direct Supabase fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('id, user_id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } else {
      // Guest mode: ONLY read temporary sessionStorage
      if (typeof window !== "undefined") {
        const guestStored = sessionStorage.getItem("focusforge_guest_sessions_list");
        if (guestStored) {
          const parsed = JSON.parse(guestStored);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [];
    }
  } catch (sbErr) {
    console.warn("[aiAgentService] Supabase direct sessions fetch error:", sbErr);
  }

  // Auth user local storage cache fallback
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("focusforge_active_sessions_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  return [];
}

/**
 * Create a new chat session in Supabase
 */
export async function createChatSession(title: string): Promise<ChatSession> {
  const newId = crypto.randomUUID();
  const token = await getToken();

  // Try API first
  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) return data;
    }
  } catch {}

  // Direct Supabase fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert([{ id: newId, title, user_id: user.id }])
        .select('id, user_id, title, created_at, updated_at')
        .single();

      if (!error && data) return data;
    }
  } catch (err) {
    console.warn("[aiAgentService] Supabase createChatSession error:", err);
  }

  return { id: newId, title, updated_at: new Date().toISOString() };
}

/**
 * Delete a session and its messages from both backend API and Supabase
 */
export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  const token = await getToken();

  // 1. Delete via backend API endpoint (triggers cascading delete in database)
  try {
    await fetch(`${getApiUrl()}/ai/agent/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    console.warn('[aiAgentService] Backend delete session notice:', err);
  }

  // 2. Direct Supabase delete fallback
  try {
    await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
  } catch (err) {
    console.warn("[aiAgentService] Supabase direct delete error:", err);
  }

  // 3. Clean local & session storage
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_auth_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_chat_msg_${sessionId}`);
  }

  return { success: true };
}

/**
 * Clear all chat sessions and messages
 */
export async function clearAllChatSessions(): Promise<{ success: boolean }> {
  const token = await getToken();

  // 1. Clear via backend API endpoint
  try {
    await fetch(`${getApiUrl()}/ai/agent/sessions`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    console.warn('[aiAgentService] Backend clear all sessions notice:', err);
  }

  // 2. Direct Supabase delete fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: userSessions } = await supabase
        .from('ai_chat_sessions')
        .select('id')
        .eq('user_id', user.id);
      
      if (Array.isArray(userSessions) && userSessions.length > 0) {
        const sessionIds = userSessions.map((s) => s.id);
        await supabase.from('ai_chat_messages').delete().in('session_id', sessionIds);
      }
      await supabase.from('ai_chat_sessions').delete().eq('user_id', user.id);
    }
  } catch (err) {
    console.warn("[aiAgentService] Supabase clearAllChatSessions error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("focusforge_guest_sessions_list");
      localStorage.removeItem("focusforge_active_sessions_cache");
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("focusforge_auth_msg_") || k.startsWith("focusforge_chat_msg_")) {
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
 * Fetch messages for a specific session
 */
export async function getChatMessages(sessionId: string): Promise<AgentMessage[]> {
  const token = await getToken();

  // 1. Try server API route first
  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions/${encodeURIComponent(sessionId)}/messages`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          intent: row.intent,
          payload: typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : (row.payload || row.payload_json),
          createdAt: new Date(row.created_at || Date.now()),
        }));
      }
    }
  } catch (err) {
    console.warn('[aiAgentService] Server getChatMessages error, trying direct Supabase:', err);
  }

  // 2. Direct Supabase fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, session_id, role, content, intent, payload_json, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          intent: row.intent,
          payload: typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json,
          createdAt: new Date(row.created_at || Date.now()),
        }));
      }
    }
  } catch (sbErr) {
    console.warn("[aiAgentService] Supabase getChatMessages error:", sbErr);
  }

  // Fallback to local / session storage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`focusforge_chat_msg_${sessionId}`) ||
                     localStorage.getItem(`focusforge_auth_msg_${sessionId}`) ||
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
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
];

/**
 * Bulletproof JSON response extractor that prevents raw JSON leaking into the user UI
 */
function extractMessageAndIntentFromJson(text: string, isBn: boolean): { message: string; intent: string; payload: any } {
  let clean = text.trim();
  // Strip markdown code fences if present (e.g. ```json ... ```)
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      message: parsed.message || (isBn ? "আপনার অনুরোধটি প্রসেস করা হয়েছে।" : "I processed your request."),
      intent: parsed.intent || "GREETING_OR_GENERAL",
      payload: parsed.payload || null
    };
  } catch (err) {
    // 1. Try regex extraction of "message", "intent", "payload" if JSON had trailing characters or truncation
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

      return {
        message: extractedMsg,
        intent: intentMatch ? intentMatch[1] : "GREETING_OR_GENERAL",
        payload: payloadObj
      };
    }

    // 2. If clean still contains JSON characters, clean it up completely
    if (clean.startsWith('{') || clean.includes('"message":')) {
      const sanitized = clean
        .replace(/^[^{]*\{/, '')
        .replace(/\}[^}]*$/, '')
        .replace(/"message"\s*:\s*"?/gi, '')
        .replace(/"intent"\s*:\s*"[A-Z_]*"/gi, '')
        .replace(/"payload"\s*:\s*(?:\{[\s\S]*?\}|null)/gi, '')
        .replace(/[{}\[\]",]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (sanitized && sanitized.length > 5) {
        return {
          message: sanitized,
          intent: "GREETING_OR_GENERAL",
          payload: null
        };
      }
    }

    return {
      message: clean.replace(/^[{\s"']+|[}\s"']+$/g, ''),
      intent: "GREETING_OR_GENERAL",
      payload: null
    };
  }
}

const FAST_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
];

const SMART_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
];

const PLANNING_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

/**
 * Intelligent client-side rule-based fallback when offline or when Gemini API is busy
 */
function generateClientRuleBasedResponse(
  query: string, 
  isBn: boolean,
  history: Array<{ role: string; content: string }> = [],
  model: AIAgentModel = "smart"
): { message: string; intent: string; payload: any } {
  const q = (query || '').toLowerCase().trim();
  const currentDate = new Date().toISOString().split('T')[0];

  // Affirmative or ambiguous confirmations: "হ্যাঁ", "হ্যাঁ করে দাও", "করো", "yes", "do it"
  const isAffirmative = /^(হ্যাঁ|হ্যা|হ্যাঁ করে দাও|করে দাও|কর|করো|হ্যাঁ প্লিজ|yes|yeah|sure|do it|okay|ok|thik ache|thik ache bhai|cholo)$/i.test(q);
  if (isAffirmative) {
    return {
      intent: "GREETING_OR_GENERAL",
      message: isBn
        ? "আপনার কাজটি আমি অবশ্যই সুন্দরভাবে করে দিতে পারব, তবে এর জন্য আমাকে প্রয়োজনীয় তথ্য দিন। যেমন:\n\n১. আপনি কি পড়ার মনোযোগ বা কোনো সমস্যা সমাধান করতে চান?\n২. একটি নতুন ফোকাস সেশন শুরু করতে চান?\n৩. নাকি একটি নির্দিষ্ট পড়ার রুটিন তৈরি করতে চান?\n\nকোন কাজটি করতে চান এবং বিস্তারিত জানালে আমি সাথে সাথে তা অ্যাপে যুক্ত করে দেব!"
        : "I can certainly do this for you, but please provide the necessary information. For example:\n\n1. Do you want to solve a study block or focus challenge?\n2. Do you want to start a focus timer session?\n3. Do you want to schedule a study routine?\n\nLet me know your choice and details, and I will add it to your app right away!",
      payload: null
    };
  }

  if (/^(hi|hello|hey|হাই|হ্যালো|আসসালামু আলাইকুম|আসসালামু|কেমন আছেন|হায়|হায়|kemon acho|kemon achen)$/i.test(q) || q.includes("কেমন আছেন") || q.includes("আসসালামু")) {
    return {
      intent: "GREETING_OR_GENERAL",
      message: isBn
        ? "হ্যালো! FocusForge AI-তে স্বাগতম! আমি আপনাকে প্রবলেম সলভিং, স্কিল বিল্ডার, মাই ডায়েরি, আইডিয়া ক্যাপচার, স্টাডি প্ল্যানার, ফোকাস সেশন এবং নোটস ও ফাইলস-এ সাহায্য করতে পারি। আপনি কোন ফিচারে কাজ করতে চান জানান!"
        : "Hello! Welcome to FocusForge AI. I can assist you with Problem Solving, Skill Builder, My Diary, Idea Capture, Study Planner, Focus Sessions, and Notes & Files. Let me know which feature you would like to explore!",
      payload: null
    };
  }

  // 1. Problem Solver Diagnostic Questions (Bangla & Banglish support)
  if (/(সমস্যা|সমাধান|অসুবিধা|কঠিন|বিপদ|মন বসছে না|অস্থির|mon bosche na|somossa|somosya|somosha|problem|solve|trouble|issue|stuck|parchi na|parbona|help lagbe|help me)/i.test(q)) {
    const hasDetailedAnswers = q.length > 40 && (q.includes("কারণ") || q.includes("চেষ্টা") || q.includes("লক্ষ্য") || q.includes("হবে") || q.includes("tried") || q.includes("goal") || q.includes("want") || q.includes("karon") || q.includes("cheshta"));
    if (!hasDetailedAnswers) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "আপনার সমস্যার কথা শুনে আমি বুঝতে পারছি আপনি কিছুটা চিন্তিত। আমি আপনাকে সম্পূর্ণ সাহায্য করব। সঠিকভাবে সেরা সমাধান তৈরি করতে আমাকে কয়েকটি বিষয় বলুন:\n\n১. সমস্যাটি ঠিক কী নিয়ে? (যেমন: পড়ার মনোযোগ না বসা, কোনো কঠিন কনসেপ্ট না বোঝা, নাকি সময় ব্যবস্থাপনা/আলসেমি?)\n২. এটার জন্য আপনি ইতিমধ্যে কী কী চেষ্টা করেছেন এবং মূল বাধা কোথায় মনে হচ্ছে?\n৩. আপনার কাঙ্ক্ষিত লক্ষ্য বা কেমন সমাধান চান?\n\nউত্তরগুলো জানালে আমি একটি পূর্ণাঙ্গ ও কার্যকরী অ্যাকশন প্ল্যান তৈরি করে আপনার মাইন্ড হাবে যুক্ত করে দেব!"
          : "I understand you're facing a challenge, and I'm here to help you work through it. To design the most effective solution for you, please let me know:\n\n1. What is the specific challenge? (e.g., study focus, understanding a hard topic, or procrastination?)\n2. What have you tried so far and where do you feel stuck?\n3. What specific outcome or goal are you aiming for?\n\nOnce you reply, I will craft a personalized action plan and save it directly to your Mind Hub!",
        payload: null
      };
    }

    return {
      intent: "PROBLEM_SOLVER",
      message: isBn
        ? "আপনার উত্তরের ভিত্তিতে পড়াশোনায় মনোযোগ ও গতি বাড়ানোর একটি কার্যকর সমাধান পরিকল্পনা মাইন্ড হাবে যুক্ত করা হয়েছে! নিচের বাটনে ক্লিক করে সমাধানটি দেখে নিতে পারেন।"
        : "Based on your inputs, a customized problem solving plan has been added to your Mind Hub! Click the button below to view it.",
      payload: {
        problem: isBn ? "পড়াশোনায় মনোযোগ ও গতি বাড়ানোর চ্যালেঞ্জ" : "Focus and Productivity Challenge",
        solutionSteps: isBn
          ? (model === "planning" 
              ? ["মূল সমস্যা চিহ্নিত করুন ও পড়ার পরিবেশ সম্পূর্ণ শান্ত রাখুন", "বড় অধ্যায়কে ছোট ২৫-৩০ মিনিটের সহজ ভাগে বিভক্ত করুন", "পোমোডোরো টেকনিক মেনে একটানা পড়ার পর ৫ মিনিট বিরতি নিন", "প্রতিদিনের অগ্রগতি মাইন্ড হাবে ট্র্যাক করুন"]
              : ["বড় লক্ষ্যকে ছোট ২৫ মিনিটের ব্লকে ভাগ করুন", "ডেস্ক থেকে ফোন ও বিভ্রান্তিকর জিনিস দূরে রাখুন", "প্রতি সেশন শেষে ৫ মিনিট রিল্যাক্স ও পানি পান করুন"])
          : ["Break tasks into 25-minute sprints", "Remove your phone and non-essential tabs", "Take a 5-minute breather between blocks", "Track progress in Mind Hub"]
      }
    };
  }

  // 2. Skill Builder Questions (Bangla & Banglish support)
  if (/(স্কিল|শেখা|শিখব|শিখতে|শেখো|পড়াশোনা|কোর্স|পাইথন|কোডিং|skill|learn|study|master|guide|tutorial|roadmap|shikhbo|sikhbo|shekha|sikhte|shikhte|course|coding|programming|python|javascript|react)/i.test(q)) {
    const hasSkillDetails = q.length > 35 && (q.includes("ঘণ্টা") || q.includes("মিনিট") || q.includes("beginner") || q.includes("বিগিনার") || q.includes("hours") || q.includes("daily") || q.includes("ghonta"));
    if (!hasSkillDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "নতুন স্কিল শেখার দারুণ উদ্যোগ! আপনার জন্য সেরা লার্নিং রোডম্যাপ সাজাতে আমাকে জানান:\n\n১. আপনি কোন স্কিলটি শিখতে চান এবং বর্তমানে আপনার অভিজ্ঞতা কেমন? (একদম বিগিনার, নাকি কিছুটা জানেন?)\n২. আপনার মূল লক্ষ্য কী? (প্রজেক্ট তৈরি, চাকরির প্রস্তুতি, নাকি নির্দিষ্ট পরীক্ষা?)\n৩. প্রতিদিন বা সপ্তাহে আপনি কত সময় দিতে পারবেন?\n\nউত্তরগুলো জানালে আমি একটি সুসংগঠিত লার্নিং রোডম্যাপ ও ট্র্যাকার তৈরি করে আপনার স্কিল বিল্ডারে যুক্ত করে দেব!"
          : "That's a fantastic initiative! To craft the best learning roadmap for you, please tell me:\n\n1. What skill do you want to learn, and what is your current level? (Absolute beginner or some prior knowledge?)\n2. What is your primary milestone or goal? (e.g. building projects, job preparation, or exams?)\n3. How much time can you commit daily or weekly?\n\nOnce you reply, I will structure a roadmap and add it directly to your Skill Builder!",
        payload: null
      };
    }

    const skillName = query.replace(/(স্কিল|skill|শিখতে চাই|শিখব|আই ওয়ান্ট টু লার্ন|learn|shikhbo|sikhbo|sikhte)/gi, '').trim() || (isBn ? "নতুন স্কিল" : "New Skill");
    return {
      intent: "LEARNING_HUB",
      message: isBn
        ? `আপনার '${skillName}' স্কিলের জন্য একটি নতুন লার্নিং ফোল্ডার ও রোডম্যাপ স্কিল বিল্ডারে যুক্ত করা হয়েছে! নিচের বাটনে ক্লিক করে এটি দেখতে পারেন।`
        : `A structured learning roadmap for '${skillName}' has been added to your Skill Builder! Click the button below to view it.`,
      payload: {
        folderName: skillName,
        skillName: skillName,
        targetHours: 20,
        suggestedMinutes: 60,
        roadmapSteps: isBn ? ["মৌলিক ধারণা ও বেসিক সিনট্যাক্স", "বাস্তব প্র্যাকটিস ও ছোট প্রজেক্ট", "উন্নত কনসেপ্ট ও রিভিশন"] : ["Fundamentals & Basics", "Hands-on Practice & Mini Projects", "Advanced Concepts & Review"]
      }
    };
  }

  // 3. My Diary Questions (Bangla & Banglish support)
  if (/(ডায়েরি|ডায়েরী|জার্নাল|অনুভূতি|মনের কথা|আজকের দিন|কেমন গেল|mon kharap|bhalo lagche na|ajker din|kemon gelo|onubhuti|diary|journal|feelings|reflection|sad|depressed)/i.test(q)) {
    const hasDiaryDetails = q.length > 40 && (q.includes("আজকে") || q.includes("ঘটেছে") || q.includes("অনুভব") || q.includes("felt") || q.includes("today") || q.includes("ajke"));
    if (!hasDiaryDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "ডায়েরিতে নিজের অনুভূতি ও প্রতিদিনের অভিজ্ঞতা লিখে রাখা চমৎকার অভ্যাস। ডায়েরিটি সুন্দরভাবে সাজাতে আমাকে বলুন:\n\n১. আজকের সারাদিন কেমন কাটল এবং আজ আপনার মনের প্রধান অনুভূতি কী ছিল?\n২. আজকের দিনের সেরা মুহূর্ত বা সবচেয়ে বড় চ্যালেঞ্জ কোনটি ছিল?\n৩. আজকের দিন থেকে এমন কী উপলব্ধি যা আপনি ডায়েরিতে ধরে রাখতে চান?\n\nআপনার চিন্তা জানালে আমি একটি সুন্দর, গোছানো ডায়েরি এন্ট্রি তৈরি করে মাই ডায়েরিতে সংরক্ষণ করে দেব!"
          : "Journaling your daily reflections is great for mindfulness and growth. To help craft your diary entry, please share:\n\n1. How was your day overall and what was your dominant mood/feeling?\n2. What was a memorable highlight or a notable challenge today?\n3. What key takeaway, lesson, or gratitude would you like to preserve?\n\nShare your thoughts, and I will compose a thoughtful diary entry and save it to your My Diary!",
        payload: null
      };
    }

    return {
      intent: "MY_DIARY",
      message: isBn
        ? "আপনার অনুভূতি অনুযায়ী একটি চমৎকার ডায়েরি এন্ট্রি তৈরি করে মাই ডায়েরিতে সংরক্ষণ করা হয়েছে! নিচের বাটনে ক্লিক করে ডায়েরিটি দেখতে পারেন।"
        : "A reflective diary entry has been composed and saved to your My Diary! Click the button below to view it.",
      payload: {
        title: isBn ? "আজকের দিনের স্মৃতি ও ভাবনা" : "Today's Reflections & Memories",
        topicTitle: isBn ? "ব্যক্তিগত ডায়েরি" : "Personal Reflections",
        mood: "Thoughtful",
        content: query
      }
    };
  }

  // 4. Capture Idea Questions (Bangla & Banglish support)
  if (/(আইডিয়া|ধারণা|ভাবনা|নতুন ভাবনা|প্রজেক্ট আইডিয়া|স্টার্টআপ|idea|concept|brainstorm|startup|project idea|notun bhabna|chinta|notun plan|notun idea)/i.test(q)) {
    const hasIdeaDetails = q.length > 35 && (q.includes("ফিচার") || q.includes("ব্যবহার") || q.includes("করবে") || q.includes("for") || query.includes("feature") || q.includes("step"));
    if (!hasIdeaDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "নতুন আইডিয়া ক্যাপচার করা ও ডেভেলপ করা খুব দারুণ একটি প্রক্রিয়া! আইডিয়াটিকে সুগঠিত করতে আমাকে জানান:\n\n১. আইডিয়াটির মূল কনসেপ্ট কী এবং এটি কী সুবিধা দেবে বা কোন সমস্যা সমাধান করবে?\n২. এটি কাদের জন্য উপযোগী এবং এর প্রধান ফিচারগুলো কী হতে পারে?\n৩. এটি বাস্তবায়নের প্রথম ও প্রধান পদক্ষেপ কী হবে?\n\nউত্তরগুলো জানালে আমি একটি সম্পূর্ণ আইডিয়া স্ট্রাকচার তৈরি করে আপনার আইডিয়া হাবে সেভ করে দেব!"
          : "Awesome! Capturing and organizing ideas is the first step to making them real. To structure your idea, please answer:\n\n1. What is the core concept and what problem or need does it address?\n2. Who is the target audience and what are its key features?\n3. What is the immediate first step to execute it?\n\nOnce you share, I'll organize your idea into actionable points and save it to your Idea Hub!",
        payload: null
      };
    }

    return {
      intent: "IDEA_CAPTURE",
      message: isBn
        ? "আপনার আইডিয়াটি সুন্দরভাবে বিশ্লেষণ করে মাইন্ড হাবের আইডিয়া বক্সে সেভ করা হয়েছে! নিচের বাটনে ক্লিক করে দেখতে পারেন।"
        : "Your idea has been structured and saved to your Mind Hub! Click the button below to view it.",
      payload: {
        idea: query,
        keyPoints: isBn ? ["মূল কনসেপ্ট পর্যালোচনা", "টার্গেট ইউজার সুবিধা নিশ্চিতকরণ", "প্রাথমিক প্রোটোটাইপ বা অ্যাকশন নির্ধারণ"] : ["Review core concept", "Identify key user benefits", "Set first actionable prototype step"],
        category: "Creative Idea",
        nextAction: isBn ? "প্রথম ড্রাফট তৈরি করা" : "Create initial draft"
      }
    };
  }

  // 5. Planner & Study Tasks Questions (Bangla & Banglish support)
  if (/(প্ল্যান|পরিকল্পনা|রুটিন|শিডিউল|টাস্ক|তালিকা|পড়া|পড়াশোনা|plan|routine|schedule|agenda|todo|planner|create plan|daily plan|routine banao|schedule koro|kajer list|tarikh|study routine)/i.test(q)) {
    const hasPlannerDetails = q.length > 40 && (q.includes("বাজে") || q.includes("সময়") || q.includes("মিনিট") || q.includes("ঘণ্টা") || q.includes("at") || q.includes("am") || q.includes("pm") || q.includes("mins") || q.includes("ghonta") || q.includes("somoy"));
    if (!hasPlannerDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "আপনার সময় ও পড়ার অগ্রাধিকার চমৎকারভাবে সাজিয়ে দেব! নিখুঁত রুটিন তৈরি করতে আমাকে জানান:\n\n১. আজ বা নির্দিষ্ট দিনে কোন কোন বিষয়/টাস্ক সম্পন্ন করতে চান?\n২. কোন বিষয়ের অগ্রাধিকার (High / Medium) বেশি এবং নির্দিষ্ট কোনো সময়সীমা আছে কি?\n৩. কখন শুরু করতে চান এবং প্রতি স্টাডি ব্লকে কতক্ষণ সময় দিতে পারবেন?\n\nতথ্যগুলো জানালে আমি স্বয়ংক্রিয়ভাবে টাইম-ব্লক ও টাস্ক শিডিউল তৈরি করে আপনার প্ল্যানারে যুক্ত করে দেব!"
          : "I'd love to help you build an effective study plan! To customize your schedule, please tell me:\n\n1. Which specific subjects or tasks do you need to complete?\n2. Which tasks have the highest priority or strict deadlines?\n3. What time would you like to start and how much time per session?\n\nOnce you provide the details, I will generate a time-blocked schedule and add it directly to your Planner!",
        payload: null
      };
    }
    
    return {
      intent: "PLANNER_CREATE",
      message: isBn
        ? "আপনার স্টাডি প্ল্যানটি সফলভাবে তৈরি করে সরাসরি প্ল্যানারে যুক্ত করা হয়েছে! নিচের বাটনে ক্লিক করে প্ল্যানারে আপনার শিডিউলটি দেখে নিন।"
        : "Your study schedule has been added to your planner! Click the button below to view your schedule in the planner.",
      payload: {
        targetDate: currentDate,
        tasks: model === "planning" ? [
          { title: isBn ? "গভীর স্টাডি ও কনসেপ্ট আয়ত্তকরণ" : "Deep Concept Learning & Study", estimatedMinutes: 60, priority: "high", targetDate: currentDate, time: "10:00" },
          { title: isBn ? "সমস্যা সমাধান ও গাণিতিক অনুশীলন" : "Problem Solving & Practical Exercises", estimatedMinutes: 45, priority: "high", targetDate: currentDate, time: "11:30" },
          { title: isBn ? "রিভিশন ও সংক্ষিপ্ত নোট তৈরি" : "Revision & Key Takeaways", estimatedMinutes: 30, priority: "medium", targetDate: currentDate, time: "12:30" }
        ] : [
          { title: isBn ? "প্রধান পড়াশোনা ও রিভিশন সেশন" : "Main Study & Revision Session", estimatedMinutes: 45, priority: "high", targetDate: currentDate, time: "10:00" },
          { title: isBn ? "অনুশীলন ও নোট পর্যালোচনা" : "Practice & Note Review", estimatedMinutes: 30, priority: "medium", targetDate: currentDate, time: "11:00" }
        ]
      }
    };
  }

  // 6. Focus Session Questions (Bangla & Banglish support)
  if (/(ফোকাস|পোমোডোরো|মনোযোগ|পড়তে বসব|কাজ শুরু|টাইমার|focus|pomodoro|timer|deep work|session|dhyan|monojog|porte boshbo|porte boshchi|kaj shuru|pomodoro start)/i.test(q)) {
    const matchMins = q.match(/(\d+)\s*(মিনিট|মিনিটের|min|minute|minutes)/i);
    const hasFocusDetails = !!matchMins || q.length > 30;
    if (!hasFocusDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "ডিপ ওয়ার্ক ও মনযোগী পড়াশোনার জন্য আমি প্রস্তুত! সেরা ফোকাস সেশন সাজাতে আমাকে জানান:\n\n১. এই সেশনে আপনি ঠিক কোন নির্দিষ্ট টাস্ক বা পড়ার অধ্যায়টি শেষ করতে চান?\n২. কত মিনিটের সেশন করতে চান? (যেমন: ২৫ মিনিট স্ট্যান্ডার্ড পোমোডোরো নাকি ৫০ মিনিট ডিপ সেশন?)\n৩. আপনার কি কোনো বিশেষ অ্যাম্বিয়েন্ট সাউন্ড বা মোড প্রয়োজন?\n\nজানালে আমি সাথে সাথে আপনার সেশন কনফিগার করে শুরু করার ব্যবস্থা করে দেব!"
          : "Let's get into the deep focus zone! To set up your optimal session, please let me know:\n\n1. What specific task or chapter will you conquer in this session?\n2. How long should the session be? (e.g. 25-minute Pomodoro or 50-minute Deep Work?)\n3. Do you prefer a standard timer or any specific setting?\n\nOnce confirmed, I will configure your session and provide the direct start button!",
        payload: null
      };
    }

    const mins = matchMins ? parseInt(matchMins[1], 10) : 25;
    return {
      intent: "FOCUS_SESSION",
      message: isBn
        ? `আপনার ${mins} মিনিটের ফোকাস সেশন প্রস্তুত করা হয়েছে! নিচের বোতামে ক্লিক করলেই ফোকাস টাইমার সরাসরি শুরু হয়ে যাবে।`
        : `Your ${mins}-minute focus session has been configured! Click the button below to start the timer directly.`,
      payload: { durationMinutes: mins, goal: isBn ? "ডিপ ওয়ার্ক স্টাডি সেশন" : "Deep Work Focus Session", mode: "deep" }
    };
  }

  // 7. Notes & Files Questions (Bangla & Banglish support)
  if (/(নোট|নোটস|ফাইল|সংরক্ষণ|লিখে রাখ|ডকুমেন্ট|note|notes|file|memo|document|summary|save this|likhe rakho|notedown|note koro|likhe rakhbo)/i.test(q)) {
    const hasNoteDetails = q.length > 35 && (q.includes("পয়েন্ট") || q.includes("শিরোনাম") || q.includes("title") || q.includes("content") || q.includes("হল"));
    if (!hasNoteDetails) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "পড়াশোনার গুরুত্বপূর্ণ তথ্য সংরক্ষণ করতে আমি প্রস্তুত! নোটটি চমৎকারভাবে তৈরি করতে জানান:\n\n১. নোটটির শিরোনাম বা প্রধান বিষয় কী হবে?\n২. নোটে মূল কী কী পয়েন্ট, সূত্র বা সারসংক্ষেপ রাখতে চান?\n৩. এটি কোন বিষয়ের অন্তর্ভুক্ত করতে চান?\n\nতথ্যগুলো জানালে আমি একটি সুবিন্যস্ত নোট তৈরি করে আপনার নোটস ও ফাইলস-এ সেভ করে দেব!"
          : "I'm ready to organize your study notes! To create a clean and structured note, please let me know:\n\n1. What is the title or core topic of this note?\n2. What key takeaways, formulas, or bullet points should be included?\n3. What subject or category should this belong to?\n\nOnce you provide the content, I will format and save it directly in your Notes & Files!",
        payload: null
      };
    }

    const cleanNote = query.replace(/(নোট|note|লিখে রাখো|নোট করো|একটি নোট|লেখো|likhe rakho|notedown)/gi, '').trim() || (isBn ? "গুরুত্বপূর্ণ স্টাডি নোট" : "Important Study Note");
    return {
      intent: "NOTES_FILES",
      message: isBn
        ? "আপনার নোটটি তৈরি করে নোটস ও ফাইলস সেকশনে যুক্ত করা হয়েছে! নিচের বোতামে ক্লিক করে নোটটি দেখতে পারেন।"
        : "Your note has been created and saved in Notes & Files! Click the button below to view and edit it.",
      payload: {
        title: cleanNote.length > 25 ? cleanNote.substring(0, 22) + "..." : cleanNote,
        content: cleanNote,
        category: "AI Notes"
      }
    };
  }

  return {
    intent: "GREETING_OR_GENERAL",
    message: isBn
      ? "আমি FocusForge AI এজেন্ট! আমি আপনাকে প্রবলেম সলভিং, স্কিল বিল্ডার, মাই ডায়েরি, আইডিয়া ক্যাপচার, স্টাডি প্ল্যানার, ফোকাস সেশন এবং নোটস ও ফাইলস-এ সাহায্য করতে পারি। আজ কোন বিষয়টি নিয়ে কাজ শুরু করব?"
      : "I am FocusForge AI Agent! I can assist you with Problem Solving, Skill Builder, My Diary, Idea Capture, Study Planner, Focus Sessions, and Notes & Files. What would you like to explore today?",
    payload: null
  };
}

/**
 * Generates a smart title for a conversation instantly without blocking API roundtrips
 */
export async function generateSmartTitle(message: string): Promise<string> {
  const cleanMsg = (message || "").trim().replace(/^["'`#*]+|["'`#*]+$/g, '').trim();
  if (!cleanMsg) return "New Conversation";
  const firstSentence = cleanMsg.split(/[.?!\n]/)[0].trim();
  if (firstSentence.length <= 26) return firstSentence;
  return firstSentence.substring(0, 24) + '...';
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
): Promise<{ message: string; intent: string; payload: any }> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, '').trim();
  const banglishIndicators = /\b(ami|amar|tumi|tomar|apni|apnar|korbo|korchi|korte|chai|dorkar|shikhbo|hobe|kemon|achho|achen|bhalo|parbo|ki|kibhabe|kothay|kokhon|porbo|porte|porashona|ajke|aajke|ekhon|shuru|routine)\b/i;
  const isBn = /[\u0980-\u09FF]/.test(message) || banglishIndicators.test(message) || (lang === "bn" && !/^[a-zA-Z0-9\s.,!?'"-]+$/.test(message.trim()));

  const q = (message || '').trim().toLowerCase();
  const conversationalRegex = /^(hi|hello|hey|h|হাই|হ্যালো|হায়|আসসালামু আলাইকুম|আসসালামু|সালাম|কেমন আছেন|কেমন আছো|how are you|কী খবর|কি খবর|কি অবস্থা|কী অবস্থা|who are you|তুমি কে|কে তুমি|তোমার নাম কি|তোমার নাম কী|what is your name|কী করছো|কি করছো|what are you doing|ধন্যবাদ|thank you|thanks|thx|অনেক ধন্যবাদ|দারুণ|বাহ|great|awesome|good|nice|ভালো|ok|okay|ঠিক আছে|হুম|হু|বলো|bolo|shuru|help|সাহায্য|কী করতে পারো|কি করতে পারো|what can you do)$/i;
  if (conversationalRegex.test(q) || q.length <= 2) {
    return generateClientRuleBasedResponse(message, isBn, history, modelMode);
  }

  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const historyFormatted = history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'FocusForge AI'}: ${h.content}`).join('\n');
    const currentDate = new Date().toISOString().split('T')[0];

    // Configure behavioral instructions and temperature based on model selection
    let modeInstruction = "";
    let candidateModels = SMART_GEMINI_MODELS;
    let modelTemperature = 0.5;
    let maxTokens = 2500;

    if (modelMode === "fast") {
      candidateModels = FAST_GEMINI_MODELS;
      modelTemperature = 0.15;
      maxTokens = 1000;
      modeInstruction = `EXECUTION MODE: FAST RESPONSE (Ultra-Fast, Low Token, Instant Solution)
- Optimize for maximum speed and instant direct answers with minimal latency (~0.4s).
- Keep responses crisp, directly actionable, and consume fewer tokens.`;
    } else if (modelMode === "planning") {
      candidateModels = PLANNING_GEMINI_MODELS;
      modelTemperature = 0.65;
      maxTokens = 3500;
      modeInstruction = `EXECUTION MODE: DEEP REASONING & PLANNING (Comprehensive, Strategic & In-Depth)
- Perform deep thinking, comprehensive breakdown, and strategic long-term planning.
- Organize extensive study routines, multi-step problem solving, in-depth note summaries, and milestone roadmaps.`;
    } else {
      candidateModels = SMART_GEMINI_MODELS;
      modelTemperature = 0.5;
      maxTokens = 2500;
      modeInstruction = `EXECUTION MODE: FOCUSFORGE SMART (Balanced & Conversational)
- Balanced intelligence, empathetic and engaging conversational style, optimal task structuring.`;
    }

    const systemInstruction = `You are FocusForge AI Agent, the built-in intelligent study & productivity assistant inside FocusForge.

${modeInstruction}

APPLICATION SCOPE:
FocusForge has 7 core features:
1. Problem Solver (Mind Hub): Tackling study blocks, lack of focus, difficult topics, stress.
2. Skill Builder (Learning Hub): Structuring new skill roadmaps, tracking practice hours.
3. My Diary (Mind & Diary): Daily journaling, personal reflection, mood and gratitude logs.
4. Capture Idea (Mind Hub): Brainstorming, structuring creative ideas into action steps.
5. Planner (Planner & Tasks): Daily and weekly study schedules, task time-blocking.
6. Focus (Focus Sessions): Deep work intervals, pomodoro timer sessions.
7. Notes & Files (Notes & Docs): Writing, organizing study notes and subject cheat-sheets.

MANDATORY MULTI-TURN GUIDED DIAGNOSTIC & INTERVIEW PROCESS (CRITICAL RULE):
When a user initiates a request or expresses a need in any feature WITHOUT complete details:
-> DO NOT immediately generate an action card or pretend you added something to the app without understanding them!
-> You MUST first ask 3 clear, numbered diagnostic questions (1, 2, 3) specific to that feature:
   - Problem Solver: 1. Specific challenge? 2. What tried so far? 3. Desired outcome?
   - Skill Builder: 1. Which skill & level? 2. Main milestone/goal? 3. Time commitment?
   - My Diary: 1. Day overview & mood? 2. Highlight/challenge? 3. Key takeaway/gratitude?
   - Capture Idea: 1. Core idea & problem it solves? 2. Target audience & features? 3. First step?
   - Planner: 1. Which subjects/tasks? 2. Priorities/deadlines? 3. Preferred study time/duration?
   - Focus: 1. Specific task? 2. Duration in minutes? 3. Setting/sound preference?
   - Notes: 1. Note title? 2. Key takeaways/bullet points? 3. Category/subject tag?
-> Set "intent": "GREETING_OR_GENERAL" and "payload": null.

WHEN ALL DETAILS ARE PROVIDED (OR USER REPLIES WITH ANSWERS):
-> Immediately generate the complete, high-quality solution/tasks/session/note/roadmap!
-> Set the appropriate intent (PROBLEM_SOLVER, SKILL_BUILDER, LEARNING_HUB, MY_DIARY, IDEA_CAPTURE, PLANNER_CREATE, FOCUS_SESSION, NOTES_FILES).
-> Populate the payload with full structured data.
-> In the message, clearly explain what has been prepared/added and invite them to click the direct button below!

TONE & LANGUAGE:
- Banglish & Bengali inputs: The user may write in Banglish (Bengali words typed in English letters, e.g. "amar ekta somossa ache", "ami python shikhbo"). You MUST understand Banglish with 100% precision and respond warmly in natural, grammatically correct Bengali script (বাংলা লিপি).
- English inputs: Respond in clean, natural English.
- Keep answers polite, encouraging, and complete. Never output cut-off sentences.

OUTPUT FORMAT:
You MUST output your response strictly as a JSON object:
{
  "message": "Your complete, clear, conversational response.",
  "intent": "PROBLEM_SOLVER" | "SKILL_BUILDER" | "LEARNING_HUB" | "MY_DIARY" | "IDEA_CAPTURE" | "NOTES_FILES" | "PLANNER_CREATE" | "FOCUS_SESSION" | "GREETING_OR_GENERAL",
  "payload": object | null
}

Intents and expected payload structures:
- PROBLEM_SOLVER: { "problem": string, "solutionSteps": string[] }
- SKILL_BUILDER (or LEARNING_HUB): { "folderName": string, "skillName": string, "targetHours": number, "roadmapSteps": string[], "suggestedMinutes": number }
- MY_DIARY: { "title": string, "content": string, "mood": string, "topicTitle": string }
- IDEA_CAPTURE: { "idea": string, "keyPoints": string[], "category": string, "nextAction": string }
- PLANNER_CREATE: { "targetDate": string, "tasks": [{ "title": string, "estimatedMinutes": number, "targetDate": string, "time": string, "priority": "high"|"medium"|"low" }] }
- FOCUS_SESSION: { "goal": string, "durationMinutes": number, "mode": "deep"|"pomodoro" }
- NOTES_FILES: { "title": string, "content": string, "category": string }
- GREETING_OR_GENERAL: null

Current date: ${currentDate}. User existing tasks: ${context?.tasks?.length || 0}, Notes: ${context?.notesCount || 0}.`;

    const prompt = `${systemInstruction}\n\n${historyFormatted ? 'Recent chat history:\n' + historyFormatted + '\n\n' : ''}User Message: "${message}"\n\nPlease answer helpfully in JSON format:`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: modelTemperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
          }
        });

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        
        if (text) {
          const extracted = extractMessageAndIntentFromJson(text, isBn);
          return extracted;
        }
      } catch (err: any) {
        console.warn(`[aiAgentService] Model ${modelName} error:`, err?.message || err);
      }
    }
  }

  // If all Gemini models or network calls fail, use the smart rule-based fallback
  return generateClientRuleBasedResponse(message, isBn, history, modelMode);
}

/**
 * Main function to send message:
 * 1. Generates response via Gemini / API
 * 2. Generates smart title
 * 3. Persists session & messages to Supabase with valid UUIDs
 * 4. Syncs with local storage for instant offline resilience
 */
export async function sendAgentMessage(
  message: string, 
  context: WorkspaceContext, 
  sessionId?: string,
  history?: Array<{ role: string; content: string }>,
  lang: string = "bn",
  model: AIAgentModel = "smart",
  signal?: AbortSignal
): Promise<{ sessionId: string; sessionTitle?: string; aiMessage: AgentMessage; tokenStatus?: TokenStatus }> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Ensure valid UUID for PostgreSQL uuid type
  const targetSessionId = (sessionId && isUuid.test(sessionId)) ? sessionId : crypto.randomUUID();
  const token = await getToken();
  const guestId = getGuestId();

  let resData: any = null;

  // Try Next.js / backend API route first
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
      body: JSON.stringify({ sessionId: targetSessionId, message, context, history, model })
    });
    
    if (res.ok) {
      resData = await res.json();
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // If server didn't provide a customized response, generate via client-side Gemini
  if (!resData || !resData.aiMessage?.content || resData.sessionId?.startsWith('session_')) {
    const generated = await generateClientGeminiResponse(message, context, history, lang, model, signal);
    resData = {
      sessionId: targetSessionId,
      sessionTitle: undefined,
      aiMessage: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generated.message,
        intent: generated.intent,
        payload: generated.payload,
        createdAt: new Date().toISOString()
      }
    };
  }

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

  // Handle persistence & token calculation
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  const isAuth = !!userId;

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
    // Authenticated User: Persist to Supabase and permanent local cache
    try {
      // 1. Upsert session
      await supabase.from('ai_chat_sessions').upsert({
        id: resData.sessionId,
        title: finalTitle,
        user_id: userId,
        updated_at: new Date().toISOString(),
      });

      // 2. Insert user message
      await supabase.from('ai_chat_messages').insert([{
        id: crypto.randomUUID(),
        session_id: resData.sessionId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      }]);

      // 3. Insert assistant message
      await supabase.from('ai_chat_messages').insert([{
        id: isUuid.test(resData.aiMessage.id) ? resData.aiMessage.id : crypto.randomUUID(),
        session_id: resData.sessionId,
        role: 'assistant',
        content: resData.aiMessage.content,
        intent: resData.aiMessage.intent || null,
        payload_json: (resData.aiMessage as any).payload || (resData.aiMessage as any).payload_json || null,
        created_at: new Date().toISOString(),
      }]);
    } catch (syncErr) {
      console.warn("[aiAgentService] Supabase sync error:", syncErr);
    }

    if (typeof window !== "undefined") {
      try {
        const cachedSessions = localStorage.getItem("focusforge_active_sessions_cache") || "[]";
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
        localStorage.setItem("focusforge_active_sessions_cache", JSON.stringify(updatedList));
      } catch {}
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

        // 3. Tertiary: Client-side Gemini fallback
        const clientApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (process.env as any)['NEXT_PUBLIC-GEMINI_API_KEY'];
        if (clientApiKey) {
          const fallbackModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
          for (const m of fallbackModels) {
            try {
              const genAI = new GoogleGenerativeAI(clientApiKey);
              const model = genAI.getGenerativeModel({ model: m });
              const prompt = [
                'You are a fast, multilingual speech-to-text transcriber for the FocusForge app.',
                'The audio contains spoken words in Bengali (বাংলা), English, or Banglish.',
                'If Bengali or Banglish, transcribe into clear Bengali script (বাংলা লিপি).',
                'If English, transcribe into clean English.',
                'Return ONLY the raw transcribed text. Do not add quotes or commentary.',
              ].join('\n');

              const result = await model.generateContent([
                prompt,
                {
                  inlineData: {
                    mimeType: blob.type || 'audio/webm',
                    data: base64Data,
                  },
                },
              ]);

              const clientText = result.response.text();
              if (clientText && clientText.trim()) {
                resolve(clientText.trim());
                return;
              }
            } catch (clientErr) {
              console.warn(`[aiAgentService] Client Gemini ${m} transcribe error:`, clientErr);
            }
          }
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
