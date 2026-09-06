import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
import { supabase } from "../lib/supabaseClient";

export interface TokenStatus {
  total: number;
  used: number;
  remaining: number;
  resetAt: string;
  isExhausted: boolean;
  formattedResetDate?: string;
  formattedRemainingTime?: string;
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
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
    if (!res.ok) throw new Error("Failed to fetch tokens");
    return await res.json();
  } catch (err) {
    console.warn("[aiAgentService] Token status fallback:", err);
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
}

export async function getChatSessions() {
  try {
    const token = await getToken();
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("[aiAgentService] Backend not reachable for sessions:", err);
    return [];
  }
}

export async function createChatSession(title: string) {
  try {
    const token = await getToken();
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ title })
    });
    if (!res.ok) return { id: `local_${Date.now()}`, title };
    return await res.json();
  } catch (err) {
    console.warn("[aiAgentService] Backend not reachable for createChatSession:", err);
    return { id: `local_${Date.now()}`, title };
  }
}

export async function deleteChatSession(sessionId: string) {
  try {
    const token = await getToken();
    await fetch(`${getApiUrl()}/ai/agent/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function getChatMessages(sessionId: string) {
  try {
    const token = await getToken();
    const res = await fetch(`${getApiUrl()}/ai/agent/sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("[aiAgentService] Backend not reachable for getChatMessages:", err);
    return [];
  }
}

export async function sendAgentMessage(
  message: string, 
  context: WorkspaceContext, 
  sessionId?: string,
  history?: Array<{ role: string; content: string }>,
  lang: string = "bn"
): Promise<{ sessionId: string; aiMessage: AgentMessage; tokenStatus?: TokenStatus }> {
  const token = await getToken();
  const guestId = getGuestId();

  try {
    const res = await fetch(`${getApiUrl()}/ai/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-guest-id': guestId,
        'x-app-lang': lang,
      },
      body: JSON.stringify({ sessionId, message, context, history })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.code === 'TOKENS_EXHAUSTED' || errorData.error === 'AI_TOKENS_EXHAUSTED') {
        const error: any = new Error(errorData.message || "AI tokens exhausted");
        error.code = errorData.code;
        error.tokenStatus = errorData.tokenStatus;
        throw error;
      }
    }
    
    return await res.json();
  } catch (err: any) {
    if (err.code === 'TOKENS_EXHAUSTED' || err.code === 'AI_TOKENS_EXHAUSTED') {
      throw err;
    }
    console.warn("[aiAgentService] Chat endpoint error, providing instant fallback response:", err);
    return {
      sessionId: sessionId || `session_${Date.now()}`,
      aiMessage: {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: lang === "bn"
          ? "হ্যালো! আসসালামু আলাইকুম। FocusForge AI-তে আপনাকে স্বাগতম! আজ আপনার পড়াশোনা বা কাজের পরিকল্পনা কীভাবে সাজাতে সাহায্য করতে পারি? আপনার প্রধান লক্ষ্য বা বিষয়গুলো আমাকে জানান!"
          : "Hello! Welcome to FocusForge AI. How can I help you organize your study schedule or focus sessions today?",
        intent: "GREETING_OR_GENERAL",
        payload: null,
        createdAt: new Date(),
      },
      tokenStatus: {
        total: 5000,
        used: 0,
        remaining: 5000,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        isExhausted: false,
        formattedResetDate: "",
        formattedRemainingTime: "24h"
      }
    };
  }
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
