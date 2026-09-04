"use client";

import { useCallback, useState } from "react";
import { sendAgentMessage } from "@/services/aiAgentService";
import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";

export function useAIAgent(context: WorkspaceContext) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useCallback(async (content: string, language: AIAgentLanguage = "auto") => {
    if (!content.trim()) { setError("Tell FocusForge what you need help with first."); return; }
    setError(null); setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: content.trim(), createdAt: new Date() }]); setIsThinking(true);
    try { const result = await sendAgentMessage(content, context, language); setMessages((items) => [...items, { id: crypto.randomUUID(), role: "assistant", createdAt: new Date(), ...result }]); }
    catch { setError("FocusForge AI is unavailable right now. Please try again."); }
    finally { setIsThinking(false); }
  }, [context]);
  return { messages, isThinking, error, send, setMessages };
}
