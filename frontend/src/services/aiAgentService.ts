import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
import { supabase } from "../lib/supabaseClient";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const API_URL = `${API_BASE}/api`;

export async function getChatSessions() {
  const token = await getToken();
  const res = await fetch(`${API_URL}/ai/agent/sessions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function createChatSession(title: string) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/ai/agent/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function deleteChatSession(sessionId: string) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/ai/agent/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}

export async function getChatMessages(sessionId: string) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/ai/agent/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
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
