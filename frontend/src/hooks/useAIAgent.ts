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
import { useAuth } from "@/context/AuthContext";

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

export function useAIAgent(context: WorkspaceContext, initialLang: string = "bn") {
  const { isGuest, user } = useAuth();

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cachedGuest = sessionStorage.getItem("focusforge_active_guest_messages");
      const cachedAuth = sessionStorage.getItem("focusforge_auth_messages");
      const cached = cachedAuth || cachedGuest;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt || m.created_at || Date.now())
          }));
        }
      }
    } catch {}
    return [];
  });

  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = sessionStorage.getItem("focusforge_guest_ai_count");
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const storedCache = localStorage.getItem("focusforge_active_sessions_cache") || localStorage.getItem("focusforge_guest_sessions_list");
      return storedCache ? JSON.parse(storedCache) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("focusforge_auth_session") || null;
  });

  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persist current active messages & activeSessionId
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (isGuest || !user) {
          sessionStorage.setItem("focusforge_active_guest_messages", JSON.stringify(messages));
          sessionStorage.setItem("focusforge_guest_ai_count", String(guestCount));
          if (activeSessionId) {
            localStorage.setItem(`focusforge_guest_msg_${activeSessionId}`, JSON.stringify(messages));
          }
        } else {
          sessionStorage.setItem("focusforge_auth_messages", JSON.stringify(messages));
          if (activeSessionId) {
            sessionStorage.setItem("focusforge_auth_session", activeSessionId);
          } else {
            sessionStorage.removeItem("focusforge_auth_session");
          }
        }
      } catch {}
    }
  }, [messages, activeSessionId, guestCount, isGuest, user]);

  // Refresh token status
  const refreshTokenStatus = useCallback(async (lang: string = initialLang) => {
    try {
      const status = await getAITokenStatus(lang);
      setTokenStatus(status);
    } catch (err) {
      console.warn("Could not refresh token status:", err);
    }
  }, [initialLang]);

  // Load sessions and initial conversation on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!isGuest && user) {
          const [sessionsData, tokensData] = await Promise.all([
            getChatSessions(),
            getAITokenStatus(initialLang)
          ]);
          if (Array.isArray(sessionsData)) {
            setSessions(sessionsData);

            // Determine which session to open if activeSessionId is set or if we have past sessions
            let targetSessionId = activeSessionId;
            if (!targetSessionId && sessionsData.length > 0) {
              targetSessionId = sessionsData[0].id;
              setActiveSessionId(targetSessionId);
            }

            if (targetSessionId) {
              const msgs = await getChatMessages(targetSessionId);
              if (Array.isArray(msgs) && msgs.length > 0) {
                setMessages(msgs.map((m: any) => ({
                  ...m,
                  createdAt: new Date(m.created_at || m.createdAt || Date.now()),
                  payload: m.payload || m.payload_json,
                })));
              }
            }
          }
          if (tokensData) {
            setTokenStatus(tokensData);
          }
        } else if (typeof window !== "undefined") {
          // Guest mode initial loading
          try {
            const guestSessionsRaw = localStorage.getItem("focusforge_guest_sessions_list");
            if (guestSessionsRaw) {
              const parsedSessions = JSON.parse(guestSessionsRaw);
              if (Array.isArray(parsedSessions)) {
                setSessions(parsedSessions);
                if (activeSessionId) {
                  const savedMsgs = localStorage.getItem(`focusforge_guest_msg_${activeSessionId}`);
                  if (savedMsgs) {
                    const parsedMsgs = JSON.parse(savedMsgs);
                    if (Array.isArray(parsedMsgs)) {
                      setMessages(parsedMsgs.map((m: any) => ({
                        ...m,
                        createdAt: new Date(m.createdAt || m.created_at || Date.now())
                      })));
                    }
                  }
                }
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load initial AI agent data", err);
      }
    };
    fetchInitialData();
  }, [initialLang, isGuest, user]);

  const createNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("focusforge_active_guest_messages");
      sessionStorage.removeItem("focusforge_auth_messages");
      sessionStorage.removeItem("focusforge_auth_session");
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setError(null);
    if (!sessionId || sessionId === 'guest-session') {
      return;
    }
    
    setIsThinking(true);
    try {
      if (!isGuest && user) {
        const data = await getChatMessages(sessionId);
        if (Array.isArray(data)) {
          setMessages(data.map((m: any) => ({
            ...m,
            createdAt: new Date(m.created_at || m.createdAt || Date.now()),
            payload: m.payload || m.payload_json,
          })));
        }
      } else if (typeof window !== "undefined") {
        const savedMsgs = localStorage.getItem(`focusforge_guest_msg_${sessionId}`);
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed)) {
            setMessages(parsed.map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt || m.created_at || Date.now())
            })));
          }
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      setError("Failed to load conversation history.");
    } finally {
      setIsThinking(false);
    }
  }, [isGuest, user]);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      if (!isGuest && user) {
        await deleteChatSession(sessionId);
      } else if (typeof window !== "undefined") {
        localStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
      }
      
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId);
        if (isGuest || !user) {
          try {
            localStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      if (activeSessionId === sessionId) {
        createNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  }, [activeSessionId, createNewSession, isGuest, user]);

  const send = useCallback(async (content: string, language: AIAgentLanguage = "auto") => {
    if (!content.trim()) { 
      setError(language === "bn" ? "প্রথমে আপনার প্রশ্ন বা টাস্ক লিখুন।" : "Tell FocusForge what you need help with first."); 
      return; 
    }
    setError(null); 

    // Guest Mode Limit: Allow maximum 5 messages for unauthenticated guest users
    if ((isGuest || !user) && guestCount >= 5) {
      const lockoutNotice = language === "bn"
        ? "আপনি গেস্ট ফ্রি লিমিট (৫টি মেসেজ) সম্পূর্ণ করেছেন। আনলিমিটেড AI ও চ্যাট সেভ রাখতে অনুগ্রহ করে নিচে 'লগইন করুন' বাটনে চাপ দিয়ে লগইন করুন।"
        : "You have reached the free 5-message limit for guest users. Please log in below to continue using FocusForge AI.";
      setError(lockoutNotice);
      return;
    }
    
    // Check local token state if exhausted (for auth users)
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

      const returnedSessionId = result.sessionId;
      const returnedTitle = result.sessionTitle || content.substring(0, 30);

      if (returnedSessionId) {
        setActiveSessionId(returnedSessionId);
        
        // Update sessions state & history list
        setSessions((prevSessions) => {
          const index = prevSessions.findIndex((s) => s.id === returnedSessionId);
          let updated: ChatSession[];
          if (index >= 0) {
            updated = [...prevSessions];
            updated[index] = {
              ...updated[index],
              title: returnedTitle,
              updated_at: new Date().toISOString()
            };
          } else {
            updated = [
              { id: returnedSessionId, title: returnedTitle, updated_at: new Date().toISOString() },
              ...prevSessions
            ];
          }

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("focusforge_active_sessions_cache", JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });

        // Re-sync removed to prevent optimistic state from being overwritten
        // if the backend response is delayed or stale.
      }
      
      const normalizedAiMessage: AgentMessage = {
        id: result.aiMessage.id,
        role: result.aiMessage.role,
        content: result.aiMessage.content,
        intent: result.aiMessage.intent,
        payload: (result.aiMessage as any).payload || (result.aiMessage as any).payload_json,
        createdAt: new Date((result.aiMessage as any).created_at || result.aiMessage.createdAt || Date.now())
      };

      setMessages((items) => {
        const updated = [...items, normalizedAiMessage];
        // If guest sent 5th message, append login requirement card
        if (isGuest || !user) {
          const nextGuestCount = guestCount + 1;
          setGuestCount(nextGuestCount);
          if (nextGuestCount >= 5) {
            const loginRequirementMsg: AgentMessage = {
              id: 'guest_lockout_' + Date.now(),
              role: 'assistant',
              intent: 'REQUIRE_LOGIN',
              content: language === 'bn'
                ? "আপনি গেস্ট হিসেবে AI এজেন্টের ৫টি ফ্রি মেসেজের সীমা সম্পূর্ণ করেছেন। সম্পূর্ণ ফিচার সুবিধা উপভোগ করতে এবং আপনার ফাইলস ও চ্যাট হিস্ট্রি সুরক্ষিত রাখতে অনুগ্রহ করে লগইন করুন।"
                : "You have completed your 5 free guest messages. Please log in below to unlock unlimited access and save your workspace history.",
              payload: { requireLogin: true },
              createdAt: new Date()
            };
            return [...updated, loginRequirementMsg];
          }
        }
        return updated;
      }); 
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
  }, [context, activeSessionId, messages, tokenStatus, isGuest, user, guestCount]);

  const guestLimitExceeded = (isGuest || !user) && guestCount >= 5;

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
    removeSession,
    guestCount,
    guestLimitExceeded
  };
}
