import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
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
  try {
    const token = await getToken();
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

  return {
    total: 5000,
    used: 0,
    remaining: 5000,
    resetAt: new Date(Date.now() + 86400000).toISOString(),
    isExhausted: false,
    formattedResetDate: "",
    formattedRemainingTime: "24h",
  };
}

/**
 * Fetch chat sessions directly from Supabase with local cache fallback
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  // 1. Direct Supabase query (works across all environments, auth and guests)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
      .from('ai_chat_sessions')
      .select('id, user_id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (user?.id) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.is('user_id', null).limit(50);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (sbErr) {
    console.warn("[aiAgentService] Supabase direct sessions fetch error:", sbErr);
  }

  // 2. Local device storage cache fallback
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("focusforge_active_sessions_cache") || localStorage.getItem("focusforge_guest_sessions_list");
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
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert([{ id: newId, title, user_id: user?.id || null }])
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (!error && data) return data;
  } catch (err) {
    console.warn("[aiAgentService] Supabase createChatSession error:", err);
  }

  return { id: newId, title, updated_at: new Date().toISOString() };
}

/**
 * Delete a session and its messages from Supabase
 */
export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  try {
    await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
  } catch (err) {
    console.warn("[aiAgentService] Supabase direct delete error:", err);
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
  }

  return { success: true };
}

/**
 * Fetch messages for a specific session from Supabase
 */
export async function getChatMessages(sessionId: string): Promise<AgentMessage[]> {
  try {
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
  } catch (sbErr) {
    console.warn("[aiAgentService] Supabase direct messages fetch error:", sbErr);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`focusforge_guest_msg_${sessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
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

/**
 * Generates a smart title for a conversation using Gemini AI
 */
export async function generateSmartTitle(message: string): Promise<string> {
  const cleanMsg = message.trim();
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, '').trim();

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
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
      console.warn("[aiAgentService] Smart title generation fallback:", e);
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
  lang: string = "bn"
): Promise<{ message: string; intent: string; payload: any }> {
  const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, '').trim();
  const isBn = lang === "bn" || !/[a-zA-Z]/.test(message) || /[\u0980-\u09FF]/.test(message);

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1000,
        }
      });

      const historyFormatted = history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'FocusForge AI'}: ${h.content}`).join('\n');
      const systemInstruction = `You are FocusForge AI Agent, an intelligent and friendly productivity & study companion.
Languages: Bengali script (বাংলা) for Bengali/Banglish queries, English for English queries.
User tasks count: ${context?.tasks?.length || 0}, Notes count: ${context?.notesCount || 0}.

Workflows:
1. Study routine / planner: provide structured, realistic advice.
2. Focus sessions: suggest 25m or 45m Pomodoro sessions.
3. Notes & ideas: summarize and highlight key insights.
4. Problem solver: break complex challenges into 2-3 manageable steps.

Always respond warmly, clearly, and helpfully in ${isBn ? 'Bengali (বাংলা)' : 'English'}.`;

      const prompt = `${systemInstruction}\n\n${historyFormatted ? 'Recent chat history:\n' + historyFormatted + '\n\n' : ''}User Message: "${message}"\n\nPlease answer helpfully:`;
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      if (text) {
        return {
          message: text,
          intent: "GREETING_OR_GENERAL",
          payload: null
        };
      }
    } catch (err) {
      console.warn("[aiAgentService] Client Gemini generation fallback:", err);
    }
  }

  return {
    message: isBn
      ? "আমি FocusForge AI এজেন্ট! আমি আপনাকে স্টাডি প্ল্যান তৈরি, ফোকাস সেশন শুরু, নোটস রাখা এবং মাইন্ড প্রবলেম সলভারে সাহায্য করতে পারি। আজ কীভাবে সাহায্য করতে পারি বলুন!"
      : "I am FocusForge AI Agent! I can help you plan study routines, start focus sessions, capture ideas, or outline notes. How can I help you today?",
    intent: "GREETING_OR_GENERAL",
    payload: null
  };
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
  lang: string = "bn"
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
      body: JSON.stringify({ sessionId: targetSessionId, message, context, history })
    });
    
    if (res.ok) {
      resData = await res.json();
    }
  } catch {}

  // If server didn't provide a customized response, generate via client-side Gemini
  if (!resData || !resData.aiMessage?.content || resData.sessionId?.startsWith('session_')) {
    const generated = await generateClientGeminiResponse(message, context, history, lang);
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

  // Persist directly to Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

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

  // Update local cache
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
      localStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updatedList));
    } catch {}
  }

  return resData;
}

export async function transcribeAudioBlob(blob: Blob, language?: string): Promise<string> {
  const token = await getToken();
  const guestId = getGuestId();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = ((reader.result as string) || '').split(',')[1] || '';
        if (!base64Data) {
          resolve('');
          return;
        }
        const res = await fetch(`${getApiUrl()}/ai/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-guest-id': guestId,
            'x-app-lang': language || 'bn',
          },
          body: JSON.stringify({
            audio: base64Data,
            mimeType: blob.type || 'audio/webm',
            language: language || 'bn'
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Failed to transcribe audio');
        }

        const data = await res.json();
        resolve(data.text || '');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
