import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
import { supabase } from "../lib/supabaseClient";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const API_URL = `${API_BASE}/api`;

export async function getChatSessions() {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/ai/agent/sessions`, {
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
    const res = await fetch(`${API_URL}/ai/agent/sessions`, {
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
    await fetch(`${API_URL}/ai/agent/sessions/${sessionId}`, {
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
    const res = await fetch(`${API_URL}/ai/agent/sessions/${sessionId}/messages`, {
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
  history?: Array<{ role: string; content: string }>
): Promise<{ sessionId: string, aiMessage: AgentMessage }> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/ai/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, message, context, history })
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to process chat message");
  }
  
  return res.json();
}

export async function transcribeAudioBlob(blob: Blob, language?: string): Promise<string> {
  const token = await getToken();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = ((reader.result as string) || '').split(',')[1] || '';
        if (!base64Data) {
          resolve('');
          return;
        }
        // Try native Next.js API route first, then fallback to API_URL
        let res: Response;
        try {
          res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: blob.type || 'audio/webm',
              language: language || 'bn'
            })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch {
          res = await fetch(`${API_URL}/ai/transcribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: blob.type || 'audio/webm',
              language: language || 'bn'
            })
          });
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to transcribe audio');
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

