"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { 
  sendAgentMessage, 
  getChatSessions, 
  getChatMessages, 
  deleteChatSession,
  clearAllChatSessions,
  getAITokenStatus,
  TokenStatus
} from "@/services/aiAgentService";
import type { AIAgentLanguage, AIAgentModel, AgentMessage, WorkspaceContext } from "@/types/aiAgent";
import { useAuth } from "@/context/AuthContext";

let memoryMessages: AgentMessage[] | null = null;
let memoryActiveSessionId: string | null = null;
let memoryGuestCount: number = 0;

export function clearAIGlobals() {
  memoryMessages = null;
  memoryActiveSessionId = null;
  memoryGuestCount = 0;
}

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

export function useAIAgent(context: WorkspaceContext, initialLang: string = "bn") {
  const { isGuest, user } = useAuth();

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    if (typeof window === "undefined") return [];
    if (memoryMessages) return memoryMessages;
    return [];
  });

  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return memoryGuestCount;
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
    return memoryActiveSessionId;
  });

  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopGeneration = useCallback((customLang?: string) => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
      abortControllerRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsThinking(false);
    setIsTyping(false);
    setStreamingText("");

    const isBn = (customLang || initialLang) === "bn";
    const failedText = isBn ? "ফেইল্ড টু সেন্ড" : "Failed to send";
    setError(failedText);
  }, [initialLang]);
  
  const loadedSessionRef = useRef<string | null>(activeSessionId);

  // Persist current active messages & activeSessionId to memory / session safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      memoryMessages = messages;
      memoryActiveSessionId = activeSessionId;
      memoryGuestCount = guestCount;
      try {
        if (activeSessionId && loadedSessionRef.current === activeSessionId && messages.length > 0) {
          if (isGuest || !user) {
            sessionStorage.setItem(`focusforge_guest_msg_${activeSessionId}`, JSON.stringify(messages));
          } else {
            localStorage.setItem(`focusforge_auth_msg_${activeSessionId}`, JSON.stringify(messages));
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
        const [sessionsData, tokensData] = await Promise.all([
          getChatSessions(),
          getAITokenStatus(initialLang)
        ]);

        if (Array.isArray(sessionsData) && sessionsData.length > 0) {
          setSessions(sessionsData);

          // Only load messages if an activeSessionId exists for this tab session
          let targetSessionId = activeSessionId;

          if (targetSessionId) {
            const msgs = await getChatMessages(targetSessionId);
            if (Array.isArray(msgs) && msgs.length > 0) {
              const normalized = msgs.map((m: any) => ({
                ...m,
                createdAt: new Date(m.created_at || m.createdAt || Date.now()),
                payload: m.payload || m.payload_json,
              }));
              setMessages(normalized);
              loadedSessionRef.current = targetSessionId;
            }
          }
        } else if (typeof window !== "undefined") {
          // Local / session cache fallback
          try {
            const isAuth = !!user && !isGuest;
            const sessionsRaw = isAuth 
              ? localStorage.getItem("focusforge_active_sessions_cache")
              : sessionStorage.getItem("focusforge_guest_sessions_list");

            if (sessionsRaw) {
              const parsedSessions = JSON.parse(sessionsRaw);
              if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
                setSessions(parsedSessions);
                let targetSessionId = activeSessionId;
                if (targetSessionId) {
                  const savedMsgs = isAuth 
                    ? localStorage.getItem(`focusforge_auth_msg_${targetSessionId}`)
                    : sessionStorage.getItem(`focusforge_guest_msg_${targetSessionId}`);
                  if (savedMsgs) {
                    const parsedMsgs = JSON.parse(savedMsgs);
                    if (Array.isArray(parsedMsgs)) {
                      setMessages(parsedMsgs.map((m: any) => ({
                        ...m,
                        createdAt: new Date(m.createdAt || m.created_at || Date.now())
                      })));
                      loadedSessionRef.current = targetSessionId;
                    }
                  }
                }
              }
            }
          } catch {}
        }

        if (tokensData) {
          setTokenStatus(tokensData);
        }
      } catch (err) {
        console.error("Failed to load initial AI agent data", err);
      }
    };
    fetchInitialData();
  }, [initialLang, isGuest, user]);

  const createNewSession = useCallback(() => {
    loadedSessionRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setGuestCount(0);
    setError(null);
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setError(null);
    loadedSessionRef.current = sessionId;
    setActiveSessionId(sessionId);

    // 1. Try instant load from local/session storage cache
    let foundInCache = false;
    if (typeof window !== "undefined") {
      try {
        const isAuth = !!user && !isGuest;
        const savedMsgs = isAuth 
          ? (localStorage.getItem(`focusforge_auth_msg_${sessionId}`) || localStorage.getItem(`focusforge_chat_msg_${sessionId}`))
          : (sessionStorage.getItem(`focusforge_guest_msg_${sessionId}`) || localStorage.getItem(`focusforge_chat_msg_${sessionId}`));
        
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed.map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt || m.created_at || Date.now()),
              payload: m.payload || m.payload_json
            })));
            foundInCache = true;
          }
        }
      } catch {}
    }

    if (!foundInCache) {
      setIsThinking(true);
    }

    // 2. Fetch latest synced history from backend database
    try {
      const data = await getChatMessages(sessionId);
      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map((m: any) => ({
          ...m,
          createdAt: new Date(m.created_at || m.createdAt || Date.now()),
          payload: m.payload || m.payload_json,
        }));
        setMessages(normalized);
        if (typeof window !== "undefined") {
          try {
            const isAuth = !!user && !isGuest;
            const key = isAuth ? `focusforge_auth_msg_${sessionId}` : `focusforge_guest_msg_${sessionId}`;
            localStorage.setItem(key, JSON.stringify(normalized));
            localStorage.setItem(`focusforge_chat_msg_${sessionId}`, JSON.stringify(normalized));
          } catch {}
        }
      } else if (!foundInCache) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      if (!foundInCache) {
        setError("Failed to load conversation history.");
      }
    } finally {
      setIsThinking(false);
    }
  }, [isGuest, user]);

  const removeSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;

    // 1. Immediately update UI state (optimistic)
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("focusforge_active_sessions_cache", JSON.stringify(updated));
          sessionStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    if (activeSessionId === sessionId) {
      createNewSession();
    }

    // 2. Clean browser storage
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(`focusforge_guest_msg_${sessionId}`);
        localStorage.removeItem(`focusforge_auth_msg_${sessionId}`);
        localStorage.removeItem(`focusforge_chat_msg_${sessionId}`);
      } catch {}
    }

    // 3. Delete from backend/database asynchronously
    try {
      await deleteChatSession(sessionId);
    } catch (err) {
      console.warn("Failed to delete session on backend:", err);
    }
  }, [activeSessionId, createNewSession]);

  const clearAllSessions = useCallback(async () => {
    // 1. Immediately clear UI
    setSessions([]);
    createNewSession();

    // 2. Clear browser storage
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

    // 3. Clear from backend/database asynchronously
    try {
      await clearAllChatSessions();
    } catch (err) {
      console.warn("Failed to clear all sessions on backend:", err);
    }
  }, [createNewSession]);

  const send = useCallback(async (
    content: string, 
    language: AIAgentLanguage = "auto",
    model: AIAgentModel = "smart"
  ) => {
    if (!content.trim()) { 
      setError(language === "bn" ? "প্রথমে আপনার প্রশ্ন বা টাস্ক লিখুন।" : "Tell FocusForge what you need help with first."); 
      return; 
    }
    setError(null); 

    const isGuestUser = isGuest || !user;

    // Check token exhaustion
    if (tokenStatus?.isExhausted || (tokenStatus && tokenStatus.remaining <= 0)) {
      const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: content.trim(), createdAt: new Date() };
      
      if (isGuestUser) {
        const guestExhaustedMsg: AgentMessage = {
          id: 'guest_lockout_' + Date.now(),
          role: 'assistant',
          intent: 'REQUIRE_LOGIN',
          content: language === 'bn'
            ? "আমি তোমাকে সাহায্য করতে খুব পছন্দ করি! 🥰 কিন্তু তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নাও না? তখন আমি আবার জেগে উঠে তোমাকে প্রাণখুলে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤"
            : "I really love helping you! 🥰 But you haven't logged in yet and your guest limit is reached. Please log in! Once you log in, I'll wake up and help you with all my heart. Until then, let me take a quick nap... 😴💤",
          payload: { requireLogin: true },
          createdAt: new Date()
        };
        setMessages((items) => [...items, userMsg, guestExhaustedMsg]);
        return;
      } else {
        const resetDateStr = tokenStatus.formattedResetDate || (language === 'bn' ? 'আগামীকাল' : 'tomorrow');
        const remTimeStr = tokenStatus.formattedRemainingTime || (language === 'bn' ? '২৪ ঘণ্টা' : '24h');
        const authExhaustedMsg: AgentMessage = {
          id: 'auth_exhausted_' + Date.now(),
          role: 'assistant',
          intent: 'LIMIT_EXHAUSTED',
          content: language === "bn"
            ? `আমি তোমাকে সাহায্য করতে চাই! কিন্তু আজকের জন্য তোমার ফ্রি লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হবে: ${resetDateStr}\n• বাকি সময়: ${remTimeStr}\n\nপ্লিজ একটু অপেক্ষা করো। লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤`
            : `I really want to help you! But your daily limit for today has been reached.\n\n• Resets on: ${resetDateStr}\n• Remaining time: ${remTimeStr}\n\nPlease wait a little bit. Once it resets, I'll wake right up to help you! Until then, let me take a quick nap... 😴💤`,
          payload: { resetDate: resetDateStr, remainingTime: remTimeStr },
          createdAt: new Date()
        };
        setMessages((items) => [...items, userMsg, authExhaustedMsg]);
        return;
      }
    }

    // Optimistic user message
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: content.trim(), createdAt: new Date() };
    setMessages((items) => [...items, userMsg]); 
    setIsThinking(true);
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try { 
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const banglishRegex = /\b(ami|amar|amake|amader|tumi|tomar|tomake|apni|apnar|apnake|korbo|korchi|korte|koro|korun|chai|dorkar|shikhbo|sikhbo|shekha|sikhte|shikhte|hobe|kemon|achho|achen|bhalo|parbo|parchi|parbona|ki|kibhabe|kivabe|kothay|kokhon|keno|kar|porbo|porte|porashona|ajke|aajke|ekhon|shuru|routine|plan|schedule|somossa|somosya|somosha|kothin|mon|kharap|bhabna|chinta|idea|notun|diary|journal|onubhuti|dhyan|monojog|focus|pomodoro|timer|note|notes|file|likhe|rakho|rakhbo|help|lagbe|ache|achhe|nai|nei)\b/i;
      const isContentBengali = /[\u0980-\u09FF]/.test(content) || banglishRegex.test(content);
      const isContentPureEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(content.trim()) && !banglishRegex.test(content);
      const langParam = isContentBengali ? "bn" : (isContentPureEnglish ? "en" : (language === "en" ? "en" : "bn"));
      const result = await sendAgentMessage(content, context, activeSessionId || undefined, history, langParam, model, abortController.signal); 
      
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
              if (user && !isGuest) {
                localStorage.setItem("focusforge_active_sessions_cache", JSON.stringify(updated));
              } else {
                sessionStorage.setItem("focusforge_guest_sessions_list", JSON.stringify(updated));
              }
            } catch {}
          }
          return updated;
        });
      }
      
      const normalizedAiMessage: AgentMessage = {
        id: result.aiMessage.id,
        role: result.aiMessage.role,
        content: result.aiMessage.content,
        intent: result.aiMessage.intent,
        payload: (result.aiMessage as any).payload || (result.aiMessage as any).payload_json,
        createdAt: new Date((result.aiMessage as any).created_at || result.aiMessage.createdAt || Date.now())
      };

      // 1. End thinking state immediately
      setIsThinking(false);

      // 2. Animate typing on mini laptop with live text stream (ultra-fast & smooth)
      const fullText = normalizedAiMessage.content || "";
      if (fullText.length > 0) {
        setIsTyping(true);
        setStreamingText("");

        await new Promise<void>((resolve) => {
          let charIndex = 0;
          const step = Math.max(6, Math.ceil(fullText.length / 16));
          typingIntervalRef.current = setInterval(() => {
            charIndex += step;
            if (charIndex >= fullText.length) {
              if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
              }
              setStreamingText(fullText);
              setTimeout(() => {
                setIsTyping(false);
                setStreamingText("");
                resolve();
              }, 80);
            } else {
              setStreamingText(fullText.substring(0, charIndex));
            }
          }, 12);
        });
      }

      // 3. Smoothly commit message to chat history stream
      setMessages((items) => {
        const updated = [...items, normalizedAiMessage];
        // If guest token is now exhausted after this turn, append login requirement card
        if (result.tokenStatus && result.tokenStatus.remaining <= 0 && isGuestUser) {
          const loginRequirementMsg: AgentMessage = {
            id: 'guest_lockout_' + Date.now(),
            role: 'assistant',
            intent: 'REQUIRE_LOGIN',
            content: language === 'bn'
              ? "আমি তোমাকে সাহায্য করতে খুব পছন্দ করি! 🥰 কিন্তু তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নাও না? তখন আমি আবার জেগে উঠে তোমাকে প্রাণখুলে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤"
              : "I really love helping you! 🥰 But you haven't logged in yet and your guest limit is reached. Please log in! Once you log in, I'll wake up and help you with all my heart. Until then, let me take a quick nap... 😴💤",
            payload: { requireLogin: true },
            createdAt: new Date()
          };
          return [...updated, loginRequirementMsg];
        }
        return updated;
      }); 
      return normalizedAiMessage;
    }
    catch (err: any) { 
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        // User aborted/stopped generation: exit cleanly without printing error banner
        return;
      }

      console.error("AI send error:", err);
      if (err.tokenStatus) {
        setTokenStatus(err.tokenStatus);
      }

      let errorMsg = err.message;
      const isTokensExhausted = err.code === 'TOKENS_EXHAUSTED' || err.message?.includes('AI_TOKENS_EXHAUSTED') || err.requireLogin;

      if (isTokensExhausted && isGuestUser) {
        const guestLockoutMsg: AgentMessage = {
          id: 'err_lockout_' + Date.now(),
          role: "assistant",
          intent: 'REQUIRE_LOGIN',
          content: language === "bn"
            ? "আমি তোমাকে সাহায্য করতে খুব পছন্দ করি! 🥰 কিন্তু তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নাও না? তখন আমি আবার জেগে উঠে তোমাকে প্রাণখুলে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤"
            : "I really love helping you! 🥰 But you haven't logged in yet and your guest limit is reached. Please log in! Once you log in, I'll wake up and help you with all my heart. Until then, let me take a quick nap... 😴💤",
          payload: { requireLogin: true },
          createdAt: new Date()
        };
        setError(guestLockoutMsg.content);
        setMessages((items) => [...items, guestLockoutMsg]);
        return;
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
      abortControllerRef.current = null;
    }
  }, [context, activeSessionId, messages, tokenStatus, isGuest, user]);

  const guestLimitExceeded = Boolean((isGuest || !user) && (tokenStatus?.isExhausted || (tokenStatus && tokenStatus.remaining <= 0)));

  return { 
    messages, 
    sessions,
    activeSessionId,
    tokenStatus,
    refreshTokenStatus,
    isThinking,
    isTyping,
    streamingText,
    stopGeneration,
    error, 
    send, 
    setMessages,
    createNewSession,
    selectSession,
    removeSession,
    clearAllSessions,
    guestCount,
    guestLimitExceeded
  };
}
