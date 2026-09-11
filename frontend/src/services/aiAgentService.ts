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
  return `${getBackendUrl()}/api`;
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
  modelMode: AIAgentModel = 'smart'
): number {
  const promptChars = promptText?.length || 0;
  const responseChars = responseText?.length || 0;
  const promptTokens = Math.ceil(promptChars / 3.5);
  const responseTokens = Math.ceil(responseChars / 3.5);
  const baseTokens = Math.max(10, promptTokens + responseTokens);

  if (modelMode === 'fast') {
    return Math.max(8, Math.round(baseTokens * 0.75));
  } else if (modelMode === 'planning') {
    return Math.max(25, Math.round(baseTokens * 1.4));
  }

  return baseTokens;
}

/**
 * Fetch chat sessions directly from Supabase with session/cache fallback
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // For logged-in users, fetch from Supabase
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
 * Delete a session and its messages
 */
export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);
      await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
    }
  } catch (err) {
    console.warn("[aiAgentService] Supabase direct delete error:", err);
  }

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
    localStorage.removeItem(`focusforge_auth_msg_${sessionId}`);
  }

  return { success: true };
}

/**
 * Fetch messages for a specific session
 */
export async function getChatMessages(sessionId: string): Promise<AgentMessage[]> {
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
    } else {
      // Guest mode: read ONLY from sessionStorage
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem(`focusforge_guest_msg_${sessionId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed.map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt || m.created_at || Date.now()),
            }));
          }
        }
      }
      return [];
    }
  } catch (sbErr) {
    console.warn("[aiAgentService] Supabase direct messages fetch error:", sbErr);
  }

  return [];
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
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
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

const SMART_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.5-flash',
  'gemini-1.5-flash',
  'gemini-3.6-flash',
];

const PLANNING_GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.0-flash-thinking-exp',
  'gemini-3.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash',
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
  const isAffirmative = /^(হ্যাঁ|হ্যা|হ্যাঁ করে দাও|করে দাও|কর|করো|হ্যাঁ প্লিজ|yes|yeah|sure|do it|okay|ok)$/i.test(q);
  if (isAffirmative) {
    return {
      intent: "GREETING_OR_GENERAL",
      message: isBn
        ? "আপনার কাজটি আমি অবশ্যই সুন্দরভাবে করে দিতে পারব, তবে এর জন্য আমাকে প্রয়োজনীয় তথ্য দিন। যেমন:\n\n১. আপনি কি পড়ার মনোযোগ বা অন্য কোনো সমস্যা সমাধান করতে চান?\n২. একটি নতুন ফোকাস সেশন শুরু করতে চান?\n৩. নাকি একটি নির্দিষ্ট পড়ার রুটিন তৈরি করতে চান?\n\nকোন কাজটি করতে চান এবং এর বিষয় বা সময় জানালে আমি সাথে সাথে তা অ্যাপে যুক্ত করে দেব!"
        : "I can certainly do this for you, but please give me the necessary information. For example:\n\n1. Do you want a solution for study focus / mental blocks?\n2. Do you want to start a focus timer session?\n3. Do you want to schedule a study routine?\n\nLet me know your choice and time/subject, and I will add it to your app right away!",
      payload: null
    };
  }

  if (/^(hi|hello|hey|হাই|হ্যালো|আসসালামু আলাইকুম|আসসালামু|কেমন আছেন|হায়|হায়)$/i.test(q) || q.includes("কেমন আছেন") || q.includes("আসসালামু")) {
    return {
      intent: "GREETING_OR_GENERAL",
      message: isBn
        ? "হ্যালো! FocusForge AI-তে স্বাগতম! আমি আপনাকে স্টাডি প্ল্যান তৈরি, ফোকাস সেশন পরিচালনা, নোটস সংরক্ষণ এবং প্রবলেম সলভিংয়ে সাহায্য করতে পারি। আপনি কোন ফিচারে কাজ করতে চান জানান!"
        : "Hello! Welcome to FocusForge AI. I can assist you with study plans, focus sessions, study notes, or problem solving. Let me know which feature you want to explore!",
      payload: null
    };
  }

  // Focus Session
  if (q.includes("ফোকাস") || q.includes("focus") || q.includes("pomodoro") || q.includes("পোমোডোরো") || q.includes("টাইমার")) {
    const matchMins = q.match(/(\d+)\s*(মিনিট|মিনিটের|min|minute|minutes)/i);
    const mins = matchMins ? parseInt(matchMins[1], 10) : 25;
    return {
      intent: "FOCUS_SESSION",
      message: isBn
        ? `আপনার ${mins} মিনিটের ফোকাস সেশন প্রস্তুত করা হয়েছে! নিচের 'এক্সপ্লোর করুন' বাটনে ক্লিক করলেই ফোকাস টাইমার স্বয়ংক্রিয়ভাবে শুরু হয়ে যাবে।`
        : `Your ${mins}-minute focus session has been configured! Click 'Explore' below to start the timer directly.`,
      payload: { durationMinutes: mins, goal: isBn ? "ডিপ ওয়ার্ক স্টাডি সেশন" : "Deep Work Focus Session" }
    };
  }

  // Problem Solver / Mind
  if (q.includes("সমস্যা") || q.includes("problem") || q.includes("মন বসছে না") || q.includes("stuck") || q.includes("অস্থির") || q.includes("মনোযোগ")) {
    return {
      intent: "PROBLEM_SOLVER",
      message: isBn
        ? "পড়াশোনায় মনোযোগ ও ফোকাস ধরে রাখার জন্য একটি বিস্তারিত সমাধান পরিকল্পনা মাইন্ড হাব-এ যুক্ত করা হয়েছে। নিচের 'এক্সপ্লোর করুন' বাটনে ক্লিক করে সমাধানটি দেখতে পারেন।"
        : "An actionable solution plan for focus and concentration has been added to your Mind Hub. Click 'Explore' below to view it.",
      payload: {
        problem: isBn ? "পড়াশোনায় মনোযোগ ও ফোকাস ধরে রাখার চ্যালেঞ্জ" : "Focus and Attention Challenge",
        solutionSteps: isBn
          ? (model === "planning" 
              ? ["মূল সমস্যা চিহ্নিত করুন ও পড়ার পরিবেশ সম্পূর্ণ শান্ত রাখুন", "বড় অধ্যায়কে ছোট ২৫-৩০ মিনিটের সহজ ভাগে বিভক্ত করুন", "পোমোডোরো টেকনিক মেনে একটানা পড়ার পর ৫ মিনিট বিরতি নিন", "হাইড্রেশন ও পর্যাপ্ত বিশ্রাম নিশ্চিত করুন"]
              : ["বড় লক্ষ্যকে ছোট ২৫ মিনিটের ব্লকে ভাগ করুন", "ডেস্ক থেকে ফোন ও বিভ্রান্তিকর জিনিস দূরে রাখুন", "প্রতি সেশন শেষে ৫ মিনিট রিল্যাক্স ও পানি পান করুন"])
          : ["Break tasks into 25-minute sprints", "Remove your phone and non-essential tabs", "Take a 5-minute breather between blocks"]
      }
    };
  }

  // Notes & Files
  if (q.includes("নোট") || q.includes("note") || q.includes("লিখে রাখ") || q.includes("নোটস")) {
    const cleanNote = query.replace(/(নোট|note|লিখে রাখো|নোট করো|একটি নোট|লেখো)/gi, '').trim() || (isBn ? "গুরুত্বপূর্ণ স্টাডি নোট" : "Important Study Note");
    return {
      intent: "NOTES_FILES",
      message: isBn
        ? "আপনার নোটটি তৈরি করে নোটস ও ফাইলস সেকশনে যুক্ত করা হয়েছে! নিচের 'এক্সপ্লোর করুন' বাটনে ক্লিক করে নোটটি দেখতে পারেন।"
        : "Your note has been created and saved in Notes & Files! Click 'Explore' below to view and edit it.",
      payload: {
        title: cleanNote.length > 25 ? cleanNote.substring(0, 22) + "..." : cleanNote,
        content: cleanNote
      }
    };
  }

  // Study Planner & Tasks
  if (q.includes("প্ল্যান") || q.includes("plan") || q.includes("রুটিন") || q.includes("টাস্ক") || q.includes("task") || q.includes("পড়া") || q.includes("পড়াশোনা") || q.includes("শিডিউল") || q.includes("schedule")) {
    // If request is too vague and doesn't specify actions or subjects, ask questions first
    if (q.length < 15 && !q.includes("যুক্ত") && !q.includes("অ্যাড") && !q.includes("add") && !q.includes("তৈরি")) {
      return {
        intent: "GREETING_OR_GENERAL",
        message: isBn
          ? "আপনার কাজটি আমি অবশ্যই সুন্দরভাবে করে দিতে পারব, তবে এর জন্য আমাকে প্রয়োজনীয় তথ্য দিন। যেমন: কোন বিষয়টি পড়তে চান, কখন শুরু করতে চান এবং কতক্ষণ সময় প্রয়োজন? তথ্যটি দিলে আমি সাথে সাথে আপনার প্ল্যানারে রুটিন যুক্ত করে দেব!"
          : "I can certainly do this for you, but please provide the necessary details: Which subject do you want to study, at what time, and for how long? Once provided, I'll add it directly to your planner!",
        payload: null
      };
    }
    
    return {
      intent: "PLANNER_CREATE",
      message: isBn
        ? "আপনার স্টাডি প্ল্যানটি সফলভাবে তৈরি করে সরাসরি প্ল্যানারে যুক্ত করা হয়েছে! নিচের 'এক্সপ্লোর করুন' বাটনে ক্লিক করে প্ল্যানারে আপনার শিডিউলটি দেখে নিতে পারেন।"
        : "Your study schedule has been added to your planner! Click 'Explore' below to view your schedule in the planner.",
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

  // Creative Ideas
  if (q.includes("আইডিয়া") || q.includes("idea") || q.includes("চিন্তা")) {
    return {
      intent: "IDEA_CAPTURE",
      message: isBn
        ? "আপনার আইডিয়াটি মাইন্ড হাবের আইডিয়া বক্সে যুক্ত করা হয়েছে! নিচের 'এক্সপ্লোর করুন' বাটনে ক্লিক করে দেখতে পারেন।"
        : "Your idea has been saved to your Mind Hub! Click 'Explore' below to view it.",
      payload: {
        idea: query,
        keyPoints: isBn ? ["মূল ভাবনা পর্যালোচনা", "পরবর্তী করণীয় নির্ধারণ"] : ["Review concept", "Plan next steps"]
      }
    };
  }

  return {
    intent: "GREETING_OR_GENERAL",
    message: isBn
      ? "আমি FocusForge AI এজেন্ট! আমি আপনাকে স্টাডি প্ল্যান তৈরি, ফোকাস সেশন শুরু, নোটস রাখা এবং মাইন্ড প্রবলেম সলভারে সাহায্য করতে পারি। আজ কীভাবে সাহায্য করতে পারি বলুন!"
      : "I am FocusForge AI Agent! I can help you plan study routines, start focus sessions, capture ideas, or outline notes. How can I help you today?",
    payload: null
  };
}

/**
 * Generates a smart title for a conversation using Gemini AI
 */
export async function generateSmartTitle(message: string): Promise<string> {
  const cleanMsg = message.trim();
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, '').trim();

  if (apiKey) {
    for (const modelName of FAST_GEMINI_MODELS) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `Generate a concise 2-4 word title for a conversation starting with: "${cleanMsg.substring(0, 150)}".
If Bengali or Banglish, return title in natural Bengali script (বাংলা).
If English, return English.
Return ONLY the title text. Do not add quotes, markdown or punctuation.`;

        const result = await model.generateContent(prompt);
        const title = result.response.text().trim().replace(/^["'`#*]+|["'`#*]+$/g, '').trim();
        if (title && title.length <= 40) {
          return title;
        }
      } catch (e) {
        // try next model
      }
    }
  }

  // Graceful fallback from message first sentence
  const firstLine = cleanMsg.split('\n')[0].trim();
  return firstLine.length > 25 ? firstLine.substring(0, 22) + '...' : firstLine;
}

/**
 * Generates an intelligent AI response directly using Gemini if the backend server is unreachable
 */
async function generateClientGeminiResponse(
  message: string,
  context: WorkspaceContext,
  history: Array<{ role: string; content: string }> = [],
  lang: string = "bn",
  modelMode: AIAgentModel = "smart"
): Promise<{ message: string; intent: string; payload: any }> {
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, '').trim();
  const banglishIndicators = /\b(ami|amar|tumi|tomar|apni|apnar|korbo|korchi|korte|chai|dorkar|shikhbo|hobe|kemon|achho|achen|bhalo|parbo|ki|kibhabe|kothay|kokhon|porbo|porte|porashona|ajke|aajke|ekhon|shuru|routine)\b/i;
  const isBn = /[\u0980-\u09FF]/.test(message) || banglishIndicators.test(message) || (lang === "bn" && !/^[a-zA-Z0-9\s.,!?'"-]+$/.test(message.trim()));

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
      modelTemperature = 0.2;
      maxTokens = 1200;
      modeInstruction = `EXECUTION MODE: FAST RESPONSE (Ultra-Fast & Direct)
- Provide a super-fast, crisp, high-speed answer.
- Zero unnecessary fluff, direct solutions, immediately structured response with low latency.`;
    } else if (modelMode === "planning") {
      candidateModels = PLANNING_GEMINI_MODELS;
      modelTemperature = 0.7;
      maxTokens = 3500;
      modeInstruction = `EXECUTION MODE: DEEP PLANNING (Comprehensive, Strategic & Thorough)
- Think deeply and strategically about the user's situation and long-term academic/work goals.
- Provide comprehensive step-by-step breakdown, prioritized tasks with optimal duration and buffer times, and root-cause solutions.
- Give rich, thoughtful, in-depth advice while maintaining crystal-clear structure.`;
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
FocusForge has 5 core features:
1. Planner & Tasks: Study schedules, daily tasks, time blocks.
2. Focus Sessions: Deep work intervals, pomodoro timer.
3. Notes & Files: Writing, organizing study notes and summaries.
4. Mind Hub & Problem Solver: Solving study blocks, procrastination, concentration loss, capturing creative ideas.
5. Learning Hub: Skill tracking and learning roadmaps.

MANDATORY CONVERSATIONAL & CLARIFICATION RULES (VERY IMPORTANT):
1. IF THE USER'S RESPONSE IS UNCLEAR, AMBIGUOUS, OR LACKS DETAILS (e.g. user says "হ্যাঁ করে দাও", "করো", "আমার সমস্যা হয়েছে", "একটা রুটিন দাও" without specific details):
   -> DO NOT make random assumptions, do not output broken half-sentences, and do not pretend you added something without details!
   -> You MUST explicitly say:
      "আপনার কাজটি আমি অবশ্যই সুন্দরভাবে করে দিতে পারব, তবে এর জন্য আমাকে প্রয়োজনীয় তথ্য দিন।" (in Bengali) / "I can certainly do this for you, but please provide the necessary information." (in English)
   -> Then ask clear, numbered specific questions for the details needed for that feature:
      For Problem Solver: Ask if they are struggling with (1) lack of concentration/focus, (2) understanding a difficult topic, or (3) fatigue/procrastination.
      For Planner: Ask for (1) subject name, (2) study time/date, (3) estimated duration.
      For Focus: Ask for (1) duration in minutes (e.g. 25 or 50 min), (2) task goal.
      For Notes: Ask for (1) note title, (2) content summary.
   -> Set "intent": "GREETING_OR_GENERAL" and "payload": null.

2. WHEN THE USER PROVIDES CLEAR DETAILS OR CHOOSES AN OPTION:
   -> Immediately generate the complete, high-quality solution/tasks/session!
   -> Set the appropriate intent (PLANNER_CREATE, FOCUS_SESSION, NOTES_FILES, PROBLEM_SOLVER, IDEA_CAPTURE).
   -> Populate the payload with full data.
   -> In the message, clearly explain what has been added to their app and invite them to click the "Explore" (এক্সপ্লোর করুন) button to view or start it!

3. TONE & LANGUAGE:
   - Bengali inputs: Respond warmly in natural, grammatically correct Bengali script (বাংলা লিপি).
   - English inputs: Respond in clean, natural English.
   - Keep answers well-structured, complete, and polite. Never output cut-off sentences.

OUTPUT FORMAT:
You MUST output your response strictly as a JSON object:
{
  "message": "Your complete, clear, conversational response.",
  "intent": "PLANNER_CREATE" | "PROBLEM_SOLVER" | "IDEA_CAPTURE" | "NOTES_FILES" | "FOCUS_SESSION" | "LEARNING_HUB" | "GREETING_OR_GENERAL",
  "payload": object | null
}

Intents and expected payload structures:
- PLANNER_CREATE: { tasks: [{ title: string, estimatedMinutes: number, targetDate?: string, time?: string, priority?: "high"|"medium"|"low" }] }
- PROBLEM_SOLVER: { problem: string, solutionSteps: string[] }
- IDEA_CAPTURE: { idea: string, keyPoints: string[] }
- NOTES_FILES: { title: string, content: string }
- FOCUS_SESSION: { goal: string, durationMinutes: number }
- LEARNING_HUB: { skillName: string, learningTopic: string }
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
  model: AIAgentModel = "smart"
): Promise<{ sessionId: string; sessionTitle?: string; aiMessage: AgentMessage; tokenStatus?: TokenStatus }> {
  // Ensure valid UUID for PostgreSQL uuid type
  const targetSessionId = (sessionId && isUuid.test(sessionId)) ? sessionId : crypto.randomUUID();
  const token = await getToken();
  const guestId = getGuestId();

  let resData: any = null;

  // Try Next.js / backend API route first
  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/chat`, {
      method: 'POST',
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
  } catch {}

  // If server didn't provide a customized response, generate via client-side Gemini
  if (!resData || !resData.aiMessage?.content || resData.sessionId?.startsWith('session_')) {
    const generated = await generateClientGeminiResponse(message, context, history, lang, model);
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
