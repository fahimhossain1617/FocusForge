"use client";

import { useCallback, useState, useEffect } from "react";
import { 
  sendAgentMessage, 
  getChatSessions, 
  getChatMessages, 
  deleteChatSession,
  getAITokenStatus,
  TokenStatus
} from "@/services/aiAgentService";
import type { AIAgentLanguage, AgentMessage, WorkspaceContext } from "@/types/aiAgent";

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

export function useAIAgent(context: WorkspaceContext, initialLang: string = "bn") {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refresh token status
  const refreshTokenStatus = useCallback(async (lang: string = initialLang) => {
    try {
      const status = await getAITokenStatus(lang);
      setTokenStatus(status);
    } catch (err) {
      console.warn("Could not refresh token status:", err);
    }
  }, [initialLang]);

  // Load sessions and token status on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [sessionsData, tokensData] = await Promise.all([
          getChatSessions(),
          getAITokenStatus(initialLang)
        ]);
        if (Array.isArray(sessionsData)) {
          setSessions(sessionsData);
        }
        if (tokensData) {
          setTokenStatus(tokensData);
        }
      } catch (err) {
        console.error("Failed to load initial AI agent data", err);
      }
    };
    fetchInitialData();
  }, [initialLang]);

  const createNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setError(null);
    if (!sessionId || sessionId === 'guest-session') {
      return;
    }
    
    setIsThinking(true);
    try {
      const data = await getChatMessages(sessionId);
      if (Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          ...m,
          createdAt: new Date(m.created_at || m.createdAt || Date.now()),
          payload: m.payload || m.payload_json,
        })));
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      setError("Failed to load conversation history.");
    } finally {
      setIsThinking(false);
    }
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        createNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  }, [activeSessionId, createNewSession]);

  const send = useCallback(async (content: string, language: AIAgentLanguage = "auto") => {
    if (!content.trim()) { 
      setError(language === "bn" ? "প্রথমে আপনার প্রশ্ন বা টাস্ক লিখুন।" : "Tell FocusForge what you need help with first."); 
      return; 
    }
    setError(null); 
    
    // Check local token state if exhausted
    if (tokenStatus?.isExhausted) {
      const exhaustedMsg = language === "bn"
        ? `আপনার ৫,০০০ AI টোকেন শেষ হয়ে গেছে। টোকেন রিসেট হওয়ার তারিখ: ${tokenStatus.formattedResetDate} (বাকি: ${tokenStatus.formattedRemainingTime})`
        : `Your 5,000 AI tokens have been exhausted. Tokens will reset on: ${tokenStatus.formattedResetDate} (${tokenStatus.formattedRemainingTime} remaining)`;
      setError(exhaustedMsg);
      return;
    }

    // Optimistic user message
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: content.trim(), createdAt: new Date() };
    setMessages((items) => [...items, userMsg]); 
    setIsThinking(true);
    
    try { 
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const langParam = language === "en" ? "en" : "bn";
      const result = await sendAgentMessage(content, context, activeSessionId || undefined, history, langParam); 
      
      // Update token status if returned
      if (result.tokenStatus) {
        setTokenStatus(result.tokenStatus);
      }

      // If this was a new session, update activeSessionId and refresh sessions
      if (!activeSessionId && result.sessionId) {
        setActiveSessionId(result.sessionId);
        getChatSessions().then(data => {
          if (Array.isArray(data)) setSessions(data);
        }).catch(() => {});
      }
      
      const normalizedAiMessage: AgentMessage = {
        id: result.aiMessage.id,
        role: result.aiMessage.role,
        content: result.aiMessage.content,
        intent: result.aiMessage.intent,
        payload: (result.aiMessage as any).payload || (result.aiMessage as any).payload_json,
        createdAt: new Date((result.aiMessage as any).created_at || result.aiMessage.createdAt || Date.now())
      };

      setMessages((items) => [...items, normalizedAiMessage]); 
    }
    catch (err: any) { 
      console.error("AI send error:", err);
      if (err.tokenStatus) {
        setTokenStatus(err.tokenStatus);
      }

      let errorMsg = err.message;
      if (err.code === 'TOKENS_EXHAUSTED' || err.message?.includes('AI_TOKENS_EXHAUSTED')) {
        errorMsg = err.message;
      } else if (!errorMsg || errorMsg === "Failed to process chat message") {
        errorMsg = language === "bn"
          ? "দুঃখিত, এআই সার্ভার সাময়িক ব্যস্ত ছিল। অনুগ্রহ করে পুনরায় পাঠান বা কয়েক সেকেন্ড পর চেষ্টা করুন।"
          : "FocusForge AI is temporarily busy. Please try sending your message again in a moment.";
      }

      setError(errorMsg); 
      const errorResponse: AgentMessage = {
        id: 'err_' + Date.now(),
        role: "assistant",
        content: errorMsg,
        createdAt: new Date()
      };
      setMessages((items) => [...items, errorResponse]);
    }
    finally { 
      setIsThinking(false); 
    }
  }, [context, activeSessionId, messages, tokenStatus]);

  return { 
    messages, 
    sessions,
    activeSessionId,
    tokenStatus,
    refreshTokenStatus,
    isThinking, 
    error, 
    send, 
    setMessages,
    createNewSession,
    selectSession,
    removeSession
  };
}
