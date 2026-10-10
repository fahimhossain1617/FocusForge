"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { 
  sendAgentMessage, 
  getChatSessions, 
  getChatMessages, 
  deleteChatSession,
  clearAllChatSessions,
  getAITokenStatus,
  detectFastPathNavigation,
  TokenStatus
} from "@/services/aiAgentService";
import type { 
  AIAgentLanguage, 
  AIAgentModel, 
  AgentMessage, 
  WorkspaceContext,
  OrbState,
  PrivacyMode,
  ActionStatus,
  ActionRequest
} from "@/types/aiAgent";
import { useAuth } from "@/context/AuthContext";
import { aiConsentService } from "@/services/aiConsentService";
import { connectivityService } from "@/services/connectivityService";

let memoryMessages: AgentMessage[] | null = null;
let memoryActiveSessionId: string | null = null;
let memoryGuestCount: number = 0;
let memoryUserId: string | null = null;

export function clearAIGlobals() {
  memoryMessages = null;
  memoryActiveSessionId = null;
  memoryGuestCount = 0;
  memoryUserId = null;
}

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

function getSessionsCacheKey(userId?: string | null): string {
  return userId ? `focusforge_ai_sessions_${userId}` : "focusforge_guest_sessions_list";
}

function getMsgCacheKey(userId: string | null | undefined, sessionId: string): string {
  return userId ? `focusforge_ai_msg_${userId}_${sessionId}` : `focusforge_guest_msg_${sessionId}`;
}

export function useAIAgent(context: WorkspaceContext, initialLang: string = "bn") {
  const { isGuest, user } = useAuth();
  const currentUserId = user?.id || null;

  // Reset in-memory cache if user changed
  if (memoryUserId !== currentUserId) {
    clearAIGlobals();
    memoryUserId = currentUserId;
  }

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    if (typeof window === "undefined") return [];
    if (memoryMessages && memoryUserId === currentUserId) return memoryMessages;
    return [];
  });

  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return memoryGuestCount;
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const key = getSessionsCacheKey(currentUserId);
      const storedCache = localStorage.getItem(key) || (currentUserId ? null : sessionStorage.getItem("focusforge_guest_sessions_list"));
      return storedCache ? JSON.parse(storedCache) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return memoryUserId === currentUserId ? memoryActiveSessionId : null;
  });

  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orbResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Privacy & Improvement Modes: "improvement" (default) | "private"
  const [privacyMode, setPrivacyModeState] = useState<PrivacyMode>(() => {
    return aiConsentService.getEffectivePrivacyMode(currentUserId);
  });
  const [isConsentOpen, setIsConsentOpen] = useState<boolean>(() => {
    return !aiConsentService.hasUserDecided(currentUserId);
  });
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);

  const isDisappearing = false;
  const isPrivateMode = privacyMode === "private";

  const setPrivacyMode = useCallback((mode: PrivacyMode) => {
    setPrivacyModeState(mode);
    aiConsentService.setConsent(currentUserId, mode === "improvement" ? "granted" : "private");
  }, [currentUserId]);

  const togglePrivateMode = useCallback(() => {
    setPrivacyModeState((prev) => {
      const next: PrivacyMode = prev === "private" ? "improvement" : "private";
      aiConsentService.setConsent(currentUserId, next === "improvement" ? "granted" : "private");
      return next;
    });
  }, [currentUserId]);

  const toggleDisappearingMode = useCallback(() => {
    // No-op - disappearing mode removed per user request
  }, []);

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
    if (orbResetTimerRef.current) {
      clearTimeout(orbResetTimerRef.current);
      orbResetTimerRef.current = null;
    }
    setIsThinking(false);
    setIsTyping(false);
    setStreamingText("");
    setOrbState("idle");

    const isBn = (customLang || initialLang) === "bn";
    const failedText = isBn ? "মেসেজ ফেইলড টু সেন্ড" : "Message failed to send";
    setError(failedText);

    const failedMsg: AgentMessage = {
      id: "failed_" + Date.now(),
      role: "assistant",
      intent: "FAILED_TO_SEND",
      content: failedText,
      createdAt: new Date(),
    };
    setMessages((items) => [...items, failedMsg]);
  }, [initialLang]);
  
  const loadedSessionRef = useRef<string | null>(activeSessionId);
  const prevUserIdRef = useRef<string | null>(currentUserId);

  // Persist current active messages & activeSessionId to memory / session safely scoped by user ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      memoryMessages = messages;
      memoryActiveSessionId = activeSessionId;
      memoryGuestCount = guestCount;
      memoryUserId = currentUserId;

      try {
        if (!isPrivateMode && activeSessionId && messages.length > 0) {
          const msgKey = getMsgCacheKey(currentUserId, activeSessionId);
          if (isGuest || !user) {
            sessionStorage.setItem(msgKey, JSON.stringify(messages));
          } else {
            localStorage.setItem(msgKey, JSON.stringify(messages));
          }
        }
      } catch {}
    }
  }, [messages, activeSessionId, guestCount, isGuest, user, currentUserId, isPrivateMode]);

  // Refresh token status
  const refreshTokenStatus = useCallback(async (lang: string = initialLang) => {
    try {
      const status = await getAITokenStatus(lang);
      setTokenStatus(status);
    } catch (err) {
      console.warn("Could not refresh token status:", err);
    }
  }, [initialLang]);

  // Load sessions and token status on mount / user change
  useEffect(() => {
    let isCancelled = false;

    const fetchInitialData = async () => {
      try {
        // Reset state ONLY when user actually switches (e.g. login/logout)
        if (prevUserIdRef.current !== currentUserId) {
          prevUserIdRef.current = currentUserId;
          setMessages([]);
          setActiveSessionId(null);
          loadedSessionRef.current = null;
          clearAIGlobals();
          memoryUserId = currentUserId;
        }

        const [sessionsData, tokensData] = await Promise.all([
          getChatSessions(),
          getAITokenStatus(initialLang)
        ]);

        if (isCancelled) return;

        if (Array.isArray(sessionsData) && sessionsData.length > 0) {
          setSessions(sessionsData);
          if (typeof window !== "undefined") {
            try {
              const key = getSessionsCacheKey(currentUserId);
              localStorage.setItem(key, JSON.stringify(sessionsData));
            } catch {}
          }
        } else if (typeof window !== "undefined") {
          // Local scoped cache fallback
          try {
            const key = getSessionsCacheKey(currentUserId);
            const sessionsRaw = localStorage.getItem(key) || (currentUserId ? null : sessionStorage.getItem("focusforge_guest_sessions_list"));
            if (sessionsRaw) {
              const parsedSessions = JSON.parse(sessionsRaw);
              if (Array.isArray(parsedSessions)) {
                setSessions(parsedSessions);
              }
            } else {
              setSessions([]);
            }
          } catch {
            setSessions([]);
          }
        }

        if (tokensData && !isCancelled) {
          setTokenStatus(tokensData);
        }
      } catch (err) {
        console.error("Failed to load initial AI agent data", err);
      }
    };

    fetchInitialData();

    return () => {
      isCancelled = true;
    };
  }, [initialLang, currentUserId]);

  const createNewSession = useCallback(() => {
    loadedSessionRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setGuestCount(0);
    setError(null);
    memoryMessages = null;
    memoryActiveSessionId = null;
    memoryGuestCount = 0;
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setError(null);
    loadedSessionRef.current = sessionId;
    setActiveSessionId(sessionId);
    memoryActiveSessionId = sessionId;

    // 1. Try instant load from user-scoped storage cache
    let foundInCache = false;
    if (typeof window !== "undefined") {
      try {
        const msgKey = getMsgCacheKey(currentUserId, sessionId);
        const savedMsgs = (isGuest || !user)
          ? sessionStorage.getItem(msgKey)
          : localStorage.getItem(msgKey);
        
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const loaded = parsed.map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt || m.created_at || Date.now()),
              payload: m.payload || m.payload_json
            }));
            setMessages(loaded);
            memoryMessages = loaded;
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
        memoryMessages = normalized;
        if (typeof window !== "undefined") {
          try {
            const msgKey = getMsgCacheKey(currentUserId, sessionId);
            if (isGuest || !user) {
              sessionStorage.setItem(msgKey, JSON.stringify(normalized));
            } else {
              localStorage.setItem(msgKey, JSON.stringify(normalized));
            }
          } catch {}
        }
      } else if (!foundInCache) {
        setMessages([]);
        memoryMessages = [];
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      if (!foundInCache) {
        setError("Failed to load conversation history.");
      }
    } finally {
      setIsThinking(false);
    }
  }, [isGuest, user, currentUserId]);

  const removeSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;

    // 1. Immediately update UI state (optimistic)
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      if (typeof window !== "undefined") {
        try {
          const key = getSessionsCacheKey(currentUserId);
          localStorage.setItem(key, JSON.stringify(updated));
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
        const msgKey = getMsgCacheKey(currentUserId, sessionId);
        sessionStorage.removeItem(msgKey);
        localStorage.removeItem(msgKey);
      } catch {}
    }

    // 3. Delete from backend/database asynchronously
    try {
      await deleteChatSession(sessionId);
    } catch (err) {
      console.warn("Failed to delete session on backend:", err);
    }
  }, [activeSessionId, createNewSession, currentUserId]);

  const clearAllSessions = useCallback(async () => {
    // 1. Immediately clear UI
    setSessions([]);
    createNewSession();

    // 2. Clear browser storage for this user
    if (typeof window !== "undefined") {
      try {
        const key = getSessionsCacheKey(currentUserId);
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);

        const prefix = currentUserId ? `focusforge_ai_msg_${currentUserId}_` : "focusforge_guest_msg_";
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(prefix)) {
            localStorage.removeItem(k);
          }
        });
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith(prefix)) {
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
  }, [createNewSession, currentUserId]);

  const send = useCallback(async (
    content: string, 
    language: AIAgentLanguage = "auto",
    model: AIAgentModel = "smart"
  ) => {
    if (!content.trim()) { 
      setError(language === "bn" ? "প্রথমে তোমার প্রশ্ন বা টাস্ক লেখো।" : "Tell Focentia what you need help with first."); 
      return; 
    }
    if (!connectivityService.isOnline()) {
      setError(language === "bn" 
        ? "তুমি বর্তমানে অফলাইনে আছো। আমি এখন ঘুমাচ্ছি, তুমি আবার অনলাইনে আসলে তোমাকে সাহায্য করবো।" 
        : "You are currently offline. I'm sleeping right now, I'll help you again when you're back online.");
      return;
    }
    setError(null); 

    const banglishRegex = /\b(ami|amar|amake|amader|tumi|tomar|tomake|apni|apnar|apnake|korbo|korchi|korte|koro|korun|chai|dorkar|shikhbo|sikhbo|shekha|sikhte|shikhte|hobe|kemon|achho|achen|bhalo|parbo|parchi|parbona|ki|kibhabe|kivabe|kothay|kokhon|keno|kar|porbo|porte|porashona|ajke|aajke|ekhon|shuru|routine|plan|schedule|somossa|somosya|somosha|kothin|mon|kharap|bhabna|chinta|idea|notun|diary|journal|onubhuti|dhyan|monojog|focus|pomodoro|timer|note|notes|file|likhe|rakho|rakhbo|help|lagbe|ache|achhe|nai|nei)\b/i;
    const isContentBengali = /[\u0980-\u09FF]/.test(content) || banglishRegex.test(content);
    const isContentPureEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(content.trim()) && !banglishRegex.test(content);
    const langParam = isContentBengali ? "bn" : (isContentPureEnglish ? "en" : (language === "en" ? "en" : "bn"));
    const isBn = langParam === "bn";
    const isGuestUser = isGuest || !user;

    // Local features (planner, diary, focus, motivation, navigation) cost 0 tokens and continue working even if quota is exhausted. Quota gating is handled before network Gemini calls.

    // Optimistic user message
    const userMsg: AgentMessage = { 
      id: crypto.randomUUID(), 
      role: "user", 
      content: content.trim(), 
      createdAt: new Date() 
    };

    setMessages((items) => [...items, userMsg]);

    setIsThinking(true);
    setOrbState("thinking");

    const stageTimers: NodeJS.Timeout[] = [];
    stageTimers.push(
      setTimeout(() => {
        setOrbState("working");
      }, 1200)
    );
    stageTimers.push(
      setTimeout(() => {
        setOrbState("composing");
      }, 2400)
    );

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      
      const result = await sendAgentMessage(
        content,
        context,
        activeSessionId || undefined,
        history,
        langParam,
        model,
        abortController.signal,
        privacyMode
      );

      stageTimers.forEach((t) => clearTimeout(t));

      if (result.tokenStatus) {
        setTokenStatus(result.tokenStatus);
      }

      if (privacyMode === "improvement" && result.sessionId && !activeSessionId) {
        setActiveSessionId(result.sessionId);
        loadedSessionRef.current = result.sessionId;
        memoryActiveSessionId = result.sessionId;
        const returnedTitle = result.sessionTitle || content.substring(0, 30);
        setSessions((prevSessions) => {
          const updated = [
            { id: result.sessionId!, title: returnedTitle, updated_at: new Date().toISOString() },
            ...prevSessions.filter(s => s.id !== result.sessionId)
          ];
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(getSessionsCacheKey(currentUserId), JSON.stringify(updated));
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
        roadmap: (result.aiMessage as any).roadmap || (result.aiMessage as any).structuredResponse?.roadmap || ((result.aiMessage as any).payload && (result.aiMessage as any).payload.stages ? (result.aiMessage as any).payload : null),
        actions: result.aiMessage.actions || [],
        emotion: result.aiMessage.emotion,
        reaction: result.aiMessage.reaction,
        privacyMode,
        createdAt: new Date((result.aiMessage as any).created_at || result.aiMessage.createdAt || Date.now())
      };

      setIsThinking(false);
      setOrbState("composing");

      // Grapheme/Token-safe streaming (NEVER splits multi-byte Bengali characters or vowel diacritics!)
      const fullText = normalizedAiMessage.content || "";
      if (fullText.length > 0) {
        const tokens = fullText.match(/\S+|\s+/g) || [fullText];
        // Short messages appear almost instantly (<20ms), longer messages stream at high FPS
        if (tokens.length <= 12) {
          setIsTyping(false);
          setStreamingText("");
        } else {
          setIsTyping(true);
          setStreamingText("");

          await new Promise<void>((resolve) => {
            let tokenIndex = 0;
            const step = Math.max(2, Math.ceil(tokens.length / 10));

            typingIntervalRef.current = setInterval(() => {
              tokenIndex += step;
              if (tokenIndex >= tokens.length) {
                if (typingIntervalRef.current) {
                  clearInterval(typingIntervalRef.current);
                  typingIntervalRef.current = null;
                }
                setStreamingText(fullText);
                setTimeout(() => {
                  setIsTyping(false);
                  setStreamingText("");
                  resolve();
                }, 20);
              } else {
                setStreamingText(tokens.slice(0, tokenIndex).join(''));
              }
            }, 12);
          });
        }
      }

      // Transition Orb state after response output
      if (orbResetTimerRef.current) {
        clearTimeout(orbResetTimerRef.current);
        orbResetTimerRef.current = null;
      }

      const hasPendingAction = normalizedAiMessage.actions && normalizedAiMessage.actions.some(
        a => a.status === 'pending' && a.confirmationRequired
      );

      if (hasPendingAction) {
        setOrbState("waiting_confirmation");
      } else {
        const emo = normalizedAiMessage.emotion;
        let nextOrbState: OrbState = "idle";
        let durationMs = 4500;

        if (emo === "serious" || emo === "protective") {
          nextOrbState = "serious";
          durationMs = 5000;
        } else if (emo === "laughing" || emo === "playful") {
          nextOrbState = emo;
          durationMs = 4500;
        } else if (emo === "empathetic" || emo === "supportive" || emo === "caring") {
          nextOrbState = "empathetic";
          durationMs = 5000;
        } else if (emo === "encouraging") {
          nextOrbState = "encouraging";
          durationMs = 4500;
        } else if (emo === "proud" || emo === "celebrating" || emo === "celebratory") {
          nextOrbState = "proud";
          durationMs = 5000;
        } else if (emo === "curious") {
          nextOrbState = "curious";
          durationMs = 4200;
        } else if (emo === "focused") {
          nextOrbState = "focused";
          durationMs = 4200;
        } else if (emo === "sad" || emo === "concerned" || emo === "stressed") {
          nextOrbState = "sad";
          durationMs = 5000;
        } else if (emo === "happy") {
          nextOrbState = "happy";
          durationMs = 4500;
        } else if (emo === "sulky") {
          nextOrbState = "sulky";
          durationMs = 6000;
        } else if (emo === "angry") {
          nextOrbState = "angry";
          durationMs = 4500;
        } else if (emo === "excited") {
          nextOrbState = "excited";
          durationMs = 4500;
        } else if (emo === "sleepy" || emo === "resting") {
          nextOrbState = "sleepy";
          durationMs = 6000;
        } else {
          nextOrbState = "idle";
        }

        setOrbState(nextOrbState);
        if (nextOrbState !== "idle") {
          orbResetTimerRef.current = setTimeout(() => {
            setOrbState("idle");
            orbResetTimerRef.current = null;
          }, durationMs);
        }
      }

      // Append assistant message to active chat list
      const appender = (items: AgentMessage[]) => {
        const updated = [...items, normalizedAiMessage];
        if (result.tokenStatus && result.tokenStatus.remaining <= 0 && isGuestUser) {
          const loginRequirementMsg: AgentMessage = {
            id: 'guest_lockout_' + Date.now(),
            role: 'assistant',
            intent: 'REQUIRE_LOGIN',
            content: langParam === 'bn'
              ? "আমি তোমাকে সাহায্য করতে পছন্দ করি। তবে তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নিলে আমি আবার জেগে তোমাকে সাহায্য করতে পারব। ততক্ষণ আমি একটু বিশ্রাম নিই।"
              : "I'd love to help you! However, you haven't logged in yet and your guest limit is reached. Please log in so I can wake up and help you. Until then, I'll take a quick rest.",
            payload: { requireLogin: true },
            createdAt: new Date()
          };
          return [...updated, loginRequirementMsg];
        }
        return updated;
      };

      setMessages(appender);

      return normalizedAiMessage;
    } catch (err: any) {
      stageTimers.forEach((t) => clearTimeout(t));
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        setOrbState("idle");
        return;
      }

      console.error("AI send error:", err);
      setOrbState("error");
      setTimeout(() => setOrbState("idle"), 3000);

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
          content: langParam === "bn"
            ? "আমি তোমাকে সাহায্য করতে পছন্দ করি। তবে তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নিলে আমি আবার জেগে তোমাকে সাহায্য করতে পারব। ততক্ষণ আমি একটু বিশ্রাম নিই।"
            : "I'd love to help you! However, you haven't logged in yet and your guest limit is reached. Please log in so I can wake up and help you. Until then, I'll take a quick rest.",
          payload: { requireLogin: true },
          createdAt: new Date()
        };
        setError(guestLockoutMsg.content);
        setMessages((items) => [...items, guestLockoutMsg]);
        return;
      } else if (!errorMsg || errorMsg === "Failed to process chat message") {
        errorMsg = langParam === "bn"
          ? "AI-এর সাথে সংযোগে একটু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করো।"
          : "Something went wrong while connecting to the AI. Please try again.";
      }

      setError(errorMsg); 
      const errorResponse: AgentMessage = {
        id: 'err_' + Date.now(),
        role: "assistant",
        content: errorMsg,
        createdAt: new Date()
      };
      setMessages((items) => [...items, errorResponse]);
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  }, [context, activeSessionId, messages, tokenStatus, isGuest, user, currentUserId, privacyMode]);

  const updateActionStatus = useCallback((messageId: string, actionId: string, status: ActionStatus, updates?: Partial<ActionRequest>) => {
    setMessages((prev) => prev.map((msg) => {
      if (msg.id !== messageId || !msg.actions) return msg;
      return {
        ...msg,
        actions: msg.actions.map((act) => act.id === actionId ? { ...act, status, ...updates } : act)
      };
    }));
  }, []);

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
    guestLimitExceeded,
    isPrivateMode,
    togglePrivateMode,
    privacyMode,
    setPrivacyMode,
    isDisappearing,
    toggleDisappearingMode,
    orbState,
    setOrbState,
    updateActionStatus,
    isConsentOpen,
    setIsConsentOpen,
    isMemoryModalOpen,
    setIsMemoryModalOpen,
  };
}
