"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MoreVertical,
  SquarePen,
  Plus,
  ArrowUp,
  Mic,
  Calendar,
  CircleHelp,
  Lightbulb,
  FileText,
  BookOpen,
  ChevronRight,
  Trash2,
  Square,
  AlertCircle,
  LogIn,
  Compass,
  CheckCircle2,
  Clock,
  Smile,
  ChevronDown,
  Check
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
import { AIOrbFace } from "./AIOrbFace";
import { useOrbMood, type OrbMood } from "./useOrbMood";
import styles from "./ai-agent.module.css";

const moodList: { id: OrbMood; labelBn: string; labelEn: string }[] = [
  { id: "happy", labelBn: "হ্যাপি", labelEn: "Happy" },
  { id: "attentive", labelBn: "মনোযোগী", labelEn: "Attentive" },
  { id: "thinking", labelBn: "চিন্তাশীল", labelEn: "Thinking" },
  { id: "focused", labelBn: "ফোকাসড", labelEn: "Focused" },
  { id: "excited", labelBn: "উচ্ছ্বসিত", labelEn: "Excited" },
  { id: "playful", labelBn: "প্লেফুল", labelEn: "Playful" },
  { id: "proud", labelBn: "প্রাউড", labelEn: "Proud" },
  { id: "caring", labelBn: "কেয়ারিং", labelEn: "Caring" },
  { id: "curious", labelBn: "কৌতূহলী", labelEn: "Curious" },
  { id: "sulky", labelBn: "অভিমানী", labelEn: "Sulky" },
  { id: "angry", labelBn: "প্লেফুল পাউট", labelEn: "Playful Pout" },
  { id: "sad", labelBn: "স্যাড", labelEn: "Sad" },
  { id: "sleepy", labelBn: "ঘুমন্ত", labelEn: "Sleepy" },
];

export function AIAgentPage() {
  const { 
    state, 
    showToast, 
    navigateTo, 
    addTask, 
    addTimeBlock, 
    addMindItem, 
    addNote, 
    addLearningFolder,
    saveDiaryTopic,
    isOnline, 
    trackMeaningfulAction 
  } = useAppContext();
  const { user, isGuest, openAuth } = useAuth();
  const isSystemBn = state?.lang === "bn";

  // Model & Language State
  const [modelMode, setModelMode] = useState<"fast" | "deep">("fast");
  const aiModel: AIAgentModel = modelMode === "deep" ? "planning" : "fast";
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [language, setLanguage] = useState<AIAgentLanguage>(isSystemBn ? "bn" : "en");
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodMenuOpen, setMoodMenuOpen] = useState(false);

  const baseInputRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moodMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (moodMenuRef.current && !moodMenuRef.current.contains(e.target as Node)) {
        setMoodMenuOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMoodMenuOpen(false);
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync with global system language changes
  useEffect(() => {
    if (state?.lang) {
      setLanguage(state.lang === "bn" ? "bn" : "en");
    }
  }, [state?.lang]);

  const context = useMemo(() => ({
    tasks: state.tasks,
    notesCount: state.notes.length,
    timeBlocksCount: state.timeBlocks.length,
    productivityScore: state.productivityScore
  }), [state.tasks, state.notes.length, state.timeBlocks.length, state.productivityScore]);

  const {
    messages,
    sessions,
    activeSessionId,
    tokenStatus,
    isThinking,
    isTyping,
    streamingText,
    stopGeneration,
    error,
    send,
    createNewSession,
    selectSession,
    removeSession,
    clearAllSessions,
    guestLimitExceeded
  } = useAIAgent(context, isSystemBn ? "bn" : "en");

  // Cleanly extract user's display name without awkward fallbacks like "there"
  const rawName = user?.displayName || user?.fullName || "";
  const cleanName = rawName.trim().split(" ")[0] || "";

  // Time-of-day driven greeting strictly based on the user's current clock time
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const nameSuffix = cleanName ? `, ${cleanName}` : "";

    if (hour >= 5 && hour < 12) {
      // 05:00 - 11:59 (Morning / সকাল)
      return isSystemBn
        ? `শুভ সকাল${nameSuffix}। আজকের দিনটি সুন্দর করতে কী নিয়ে কাজ শুরু করতে চাও?`
        : `Good morning${nameSuffix}. What shall we focus on today?`;
    } else if (hour >= 12 && hour < 15) {
      // 12:00 - 14:59 (Noon / দুপুর)
      return isSystemBn
        ? `শুভ দুপুর${nameSuffix}। দুপুরের কাজের গতি ধরে রাখো, আমি পাশে আছি।`
        : `Good noon${nameSuffix}. Keep your momentum strong and focus sharp.`;
    } else if (hour >= 15 && hour < 18) {
      // 15:00 - 17:59 (Afternoon / বিকাল)
      return isSystemBn
        ? `শুভ বিকাল${nameSuffix}। আজকের গুরুত্বপূর্ণ কাজগুলো গুছিয়ে শেষ করার চমৎকার সময়!`
        : `Good afternoon${nameSuffix}. Time to wrap up today's top priorities.`;
    } else if (hour >= 18 && hour < 21) {
      // 18:00 - 20:59 (Evening / সন্ধ্যা)
      return isSystemBn
        ? `শুভ সন্ধ্যা${nameSuffix}। আজকের কাজগুলো গুছিয়ে নাও আর আগামীকালের প্রস্তুতি নাও।`
        : `Good evening${nameSuffix}. Time to review today's achievements and organize ahead.`;
    } else {
      // 21:00 - 04:59 (Night & Late Night / রাত ও গভীর রাত)
      return isSystemBn
        ? `হে নাইট আউল${nameSuffix}। গভীর রাতের পড়াশোনা বা কাজে কোনো সাহায্য লাগবে?`
        : `Hey night owl${nameSuffix}. Working late or planning for tomorrow?`;
    }
  }, [isSystemBn, cleanName]);

  const isLight = state?.theme?.mode === "light";

  const lastUserMsg = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user");
    return userMsgs[userMsgs.length - 1]?.content || "";
  }, [messages]);

  const lastAiMsg = useMemo(() => {
    const aiMsgs = messages.filter((m) => m.role === "assistant");
    return aiMsgs[aiMsgs.length - 1]?.content || "";
  }, [messages]);

  const hasFailedMessage = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    return (
      lastMsg?.intent === "FAILED_TO_SEND" ||
      lastMsg?.content?.toLowerCase().includes("failed to send") ||
      lastMsg?.content?.toLowerCase().includes("ফেইল্ড টু সেন্ড") ||
      lastMsg?.id?.startsWith("failed_") ||
      lastMsg?.id?.startsWith("err_")
    );
  }, [messages]);

  const isLimitExhausted = Boolean(tokenStatus?.isExhausted || (tokenStatus && tokenStatus.remaining <= 0));
  const isGuestLimit = Boolean(guestLimitExceeded || (isLimitExhausted && (isGuest || !user)));

  // Measure visual viewport for mobile keyboard awareness
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const windowH = window.innerHeight;
      const vvH = vv.height;
      // On mobile devices, virtual keyboard decreases visual viewport height by > 140px
      const isKb = windowH - vvH > 140;
      setIsKeyboardOpen(isKb);
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, []);

  const {
    mood,
    thoughtText,
    isGiggling,
    isEnjoying,
    triggerGiggle,
    setManualMood,
    resetInactivityTimer
  } = useOrbMood({
    isThinking,
    isTyping,
    userInput: input,
    lastUserMessage: lastUserMsg,
    lastAiMessage: lastAiMsg,
    hasFailedMessage,
    error,
    appState: state,
    language,
    greetingText,
    isLimitExhausted,
    isGuestLimit,
    messagesCount: messages.length,
    isOnline
  });

  const handleNewChat = useCallback(() => {
    createNewSession();
    setInput("");
    setMenuOpen(false);
    setMoodMenuOpen(false);
  }, [createNewSession]);

  // Smoothly scroll chat area to bottom when new messages arrive or when AI is typing
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isThinking, isTyping, streamingText, scrollToBottom]);

  const appliedPayloadsRef = useRef<Set<string>>(new Set());

  const applyPayloadToApp = useCallback((msgId: string, intent: string | undefined, payload: any) => {
    if (!payload || !intent || appliedPayloadsRef.current.has(msgId)) return;
    appliedPayloadsRef.current.add(msgId);

    const fallbackDate = payload.targetDate || new Date().toISOString().split("T")[0];

    if (intent === "PLANNER_CREATE") {
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [payload];
      tasks.forEach((t: any, idx: number) => {
        const totalMins = t.estimatedMinutes || 45;
        const taskId = Date.now() + idx + Math.floor(Math.random() * 1000);
        const taskDate = t.targetDate || fallbackDate;
        const taskTitle = t.title || (isSystemBn ? "নতুন স্টাডি টাস্ক" : "New Study Task");
        const startHour = 10 + idx * 2;
        const startTime = t.time || `${String(startHour).padStart(2, "0")}:00`;
        const endHour = startHour + Math.max(1, Math.ceil(totalMins / 60));
        const endTime = `${String(endHour).padStart(2, "0")}:00`;

        addTask({
          id: taskId,
          name: taskTitle,
          title: taskTitle,
          priority: t.priority || "medium",
          estHours: Math.floor(totalMins / 60),
          estMinutes: totalMins % 60,
          targetDate: taskDate,
          date: taskDate,
          time: startTime,
          category: "Study",
          status: "not_started",
          notes: t.enableNotification ? "[Notification Reminders: ON]" : "",
          tier: "now"
        });

        addTimeBlock({
          date: taskDate,
          startTime: startTime,
          endTime: endTime,
          label: taskTitle,
          category: "Study",
          isBreak: false,
          taskId: taskId
        });
      });
      showToast(isSystemBn ? "টাস্ক ও স্টাডি প্ল্যান সফলভাবে প্ল্যানারে যুক্ত হয়েছে!" : "Tasks & schedule added to Planner!", "success");
    } else if (intent === "NOTES_FILES") {
      addNote({
        title: payload.title || (isSystemBn ? "নতুন স্টাডি নোট" : "New Study Note"),
        blocks: [
          {
            id: "block_" + Date.now(),
            type: "paragraph",
            content: payload.content || ""
          }
        ],
        category: payload.category || "AI Generated"
      });
      showToast(isSystemBn ? "নোটটি সফলভাবে নোটস ও ফাইলস-এ যুক্ত হয়েছে!" : "Note added to Notes & Files!", "success");
    } else if (intent === "PROBLEM_SOLVER") {
      const content = `[Problem]: ${payload.problem || ""}\n\nSteps:\n${(payload.solutionSteps || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}`;
      addMindItem(content, "problem_solver");
      showToast(isSystemBn ? "সমাধান পরিকল্পনা মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!" : "Solution added to Mind Hub!", "success");
    } else if (intent === "IDEA_CAPTURE") {
      const content = `[Idea]: ${payload.idea || ""}\n\nKey Points:\n${(payload.keyPoints || []).map((k: string) => `- ${k}`).join("\n")}${payload.nextAction ? `\nNext: ${payload.nextAction}` : ''}`;
      addMindItem(content, "idea_capture");
      showToast(isSystemBn ? "আইডিয়াটি মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!" : "Idea saved to Mind Hub!", "success");
    } else if (intent === "LEARNING_HUB" || intent === "SKILL_BUILDER") {
      const folderName = payload.folderName || payload.skillName || (isSystemBn ? "নতুন স্কিল" : "New Skill");
      addLearningFolder(folderName);
      showToast(isSystemBn ? `'${folderName}' স্কিল বিল্ডারে যুক্ত হয়েছে!` : `'${folderName}' added to Skill Builder!`, "success");
    } else if (intent === "MY_DIARY" || intent === "DIARY_ENTRY") {
      const diaryTitle = payload.title || (isSystemBn ? "আজকের ডায়েরি" : "Today's Diary Entry");
      const diaryContent = payload.content || "";
      saveDiaryTopic(diaryTitle, diaryContent);
      showToast(isSystemBn ? "ডায়েরি এন্ট্রি সফলভাবে সংরক্ষণ করা হয়েছে!" : "Diary entry saved to My Diary!", "success");
    } else if (intent === "FOCUS_SESSION") {
      const mins = payload.durationMinutes || 25;
      const taskName = payload.goal || (isSystemBn ? "ডিপ ওয়ার্ক সেশন" : "Deep Work Session");
      localStorage.setItem(
        "focusforge_pending_focus_launch",
        JSON.stringify({
          taskName,
          category: "Study",
          durationMinutes: mins,
          autoStart: true,
          timestamp: Date.now()
        })
      );
      showToast(isSystemBn ? `${mins} মিনিটের ফোকাস সেশন প্রস্তুত হয়েছে!` : `${mins}m Focus session ready!`, "success");
    }
  }, [addTask, addTimeBlock, addNote, addMindItem, addLearningFolder, saveDiaryTopic, showToast, isSystemBn]);

  const submit = async (value = input) => {
    if (!value.trim() || guestLimitExceeded) return;
    if (!isOnline) {
      showToast(isSystemBn ? "তুমি বর্তমানে অফলাইনে আছো।" : "You are currently offline.", "error");
      return;
    }
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const aiMsg = await send(value, language, aiModel);
    if (aiMsg) {
      trackMeaningfulAction?.("ai_agent_interaction");
    }
    if (aiMsg?.payload && aiMsg.intent && aiMsg.intent !== "GREETING_OR_GENERAL") {
      applyPayloadToApp(aiMsg.id, aiMsg.intent, aiMsg.payload);
    }
  };

  const startVoice = () => {
    if (guestLimitExceeded) return;
    if (!isOnline) {
      showToast(isSystemBn ? "তুমি বর্তমানে অফলাইনে আছো।" : "You are currently offline.", "error");
      return;
    }
    baseInputRef.current = input.trim();
    setVoiceOpen(true);
  };

  const stopVoice = () => {
    setVoiceOpen(false);
  };

  // Dynamically auto-growing textarea: starts compact at 24px cursor line, extends up to 180px/220px
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const singleLineHeight = 24;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const maxHeight = isMobile ? 180 : 220;
    const nextHeight = Math.max(singleLineHeight, el.scrollHeight);
    if (nextHeight >= maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${nextHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSpeechResult = (voiceText: string) => {
    if (!voiceText) return;
    const base = baseInputRef.current;
    const updated = base ? `${base} ${voiceText}`.trim() : voiceText;
    setInput(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight();
      }
    }, 50);
  };

  return (
    <section
      className={styles.agentShell}
      aria-label="FocusForge AI"
    >
      {/* FULL-WIDTH TOP BAR: Left "FocusForge AI" to the edge, Right Mood / New Chat / 3-dots */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.brandTitle}>FocusForge AI</span>
        </div>

        <div className={styles.topBarRight} ref={menuRef}>
          {/* New Chat Button */}
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleNewChat}
            aria-label={isSystemBn ? "নতুন চ্যাট" : "New chat"}
            title={isSystemBn ? "নতুন চ্যাট" : "New Chat"}
          >
            <SquarePen size={19} strokeWidth={1.8} />
          </button>

          {/* 3-Dot Button */}
          <button
            type="button"
            className={`${styles.iconButton} ${menuOpen ? styles.iconButtonActive : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Chat history"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            title={isSystemBn ? "চ্যাট হিস্ট্রি" : "Chat History"}
          >
            <MoreVertical size={20} strokeWidth={1.8} />
          </button>

          {/* 3-DOT DROPDOWN POPOVER (Opens directly under the 3-dot button) */}
          {menuOpen && (
            <div className={styles.menuDropdown} role="dialog" aria-label="Chats menu">
              <div className={styles.menuDropdownHeader}>
                <h3 className={styles.menuDropdownTitle}>
                  {isSystemBn ? "পূর্ববর্তী আলাপ" : "Chats"}
                </h3>
                {sessions.length > 0 && (
                  <div className={styles.menuDropdownHeaderActions}>
                    <button
                      type="button"
                      className={styles.clearAllBtn}
                      onClick={() => {
                        clearAllSessions();
                        showToast(isSystemBn ? "সকল হিস্ট্রি মুছে ফেলা হয়েছে" : "All chat history cleared", "info");
                      }}
                    >
                      <Trash2 size={11} />
                      <span>{isSystemBn ? "সব মুছুন" : "Clear"}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.menuDropdownBody}>
                {/* New chat primary button inside menu */}
                <button
                  type="button"
                  className={styles.newChatMenuBtn}
                  onClick={handleNewChat}
                >
                  <Plus size={14} strokeWidth={2.2} />
                  <span>{isSystemBn ? "নতুন চ্যাট" : "New chat"}</span>
                </button>

                {/* List of chat sessions */}
                {sessions.length === 0 ? (
                  <div className={styles.menuDropdownEmpty}>
                    <p className={styles.menuDropdownEmptyBold}>
                      {isSystemBn ? "কোনো চ্যাট হিস্ট্রি নেই" : "No chats yet"}
                    </p>
                    <p className={styles.menuDropdownEmptyMuted}>
                      {isSystemBn ? "তোমার নতুন আলাপ এখানে সংরক্ষিত হবে" : "Conversations you start will appear here"}
                    </p>
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`${styles.sessionItemRow} ${s.id === activeSessionId ? styles.sessionItemRowActive : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.sessionItemTitle}
                        onClick={() => {
                          selectSession(s.id);
                          setMenuOpen(false);
                        }}
                      >
                        {s.title || (isSystemBn ? "নতুন আলাপ" : "New Chat")}
                      </button>
                      <button
                        type="button"
                        className={styles.sessionItemDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSession(s.id);
                          showToast(isSystemBn ? "চ্যাট মুছে ফেলা হয়েছে" : "Chat deleted", "info");
                        }}
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 size={12} strokeWidth={1.7} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CENTERED LAYOUT CONTAINER */}
      {/* CENTERED LAYOUT CONTAINER */}
      <div className={styles.layoutContainer}>
        {/* MAIN CONTENT / CHAT AREA */}
        <div className={`${styles.chatArea} ${isKeyboardOpen ? styles.chatAreaKeyboardOpen : ""}`} ref={chatAreaRef}>
          {messages.length === 0 && !isThinking && !isTyping ? (
            /* HOME (EMPTY STATE): Centerpiece AI ORB Face with Top Greeting Bubble */
            <div className={styles.homeContainer}>
              <div className={styles.orbHeroWrapper}>
                <AIOrbFace
                  mood={mood}
                  thoughtText={thoughtText || greetingText}
                  speechSide="top"
                  isThinking={isThinking}
                  isGiggling={isGiggling}
                  isEnjoying={isEnjoying}
                  isLight={isLight}
                  language={language}
                  onTap={triggerGiggle}
                  showStatusBadge={true}
                />
              </div>
            </div>
          ) : (
            /* CONVERSATION THREAD + BOTTOM INTERACTIVE ORB STAGE */
            <>
              <div className={styles.conversation} aria-live="polite">
                {messages
                  .filter(
                    (message) =>
                      message.intent !== "FAILED_TO_SEND" &&
                      !message.id?.startsWith("failed_") &&
                      message.content !== "Failed to send" &&
                      message.content !== "ফেইল্ড টু সেন্ড"
                  )
                  .map((message) => {
                    const isUser = message.role === "user";
                    return (
                      <div
                        key={message.id}
                        className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
                      >
                        <div className={isUser ? styles.userBubble : styles.assistantBubble}>
                          {message.content}

                          {/* Proposals / Action cards */}
                          {message.payload && message.intent === "PLANNER_CREATE" && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "প্ল্যানারে যুক্ত হয়েছে" : "Added to Planner"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {isSystemBn ? "স্টাডি / টাস্ক প্ল্যান" : "Planner Schedule"}
                              </div>
                              <div className={styles.proposalDesc}>
                                {Array.isArray(message.payload.tasks)
                                  ? `${message.payload.tasks.length} ${isSystemBn ? "টি টাস্ক শিডিউল করা হয়েছে" : "tasks scheduled"}`
                                  : message.payload.title || "Study Task"}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("planner");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "প্ল্যানার দেখুন" : "View Planner"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && message.intent === "PROBLEM_SOLVER" && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "মাইন্ড ট্র্যাকার সেভ হয়েছে" : "Saved to Mind"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {isSystemBn ? "সমস্যা সমাধান" : "Problem Solver"}
                              </div>
                              <div className={styles.proposalDesc}>
                                {message.payload.problem || "Action plan ready"}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("mind");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "মাইন্ড হাব খুলুন" : "Open Mind Hub"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && message.intent === "IDEA_CAPTURE" && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "আইডিয়া সংরক্ষিত" : "Idea Captured"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {isSystemBn ? "আইডিয়া বক্স" : "Idea Capture"}
                              </div>
                              <div className={styles.proposalDesc}>
                                {message.payload.idea || "Captured note"}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("mind");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "আইডিয়া দেখুন" : "View Ideas"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && (message.intent === "LEARNING_HUB" || message.intent === "SKILL_BUILDER") && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "স্কিল বিল্ডারে যুক্ত হয়েছে" : "Added to Skill Builder"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {message.payload.folderName || message.payload.skillName || (isSystemBn ? "নতুন স্কিল রোডম্যাপ" : "New Skill Roadmap")}
                              </div>
                              <div className={styles.proposalDesc}>
                                {message.payload.targetHours ? `${message.payload.targetHours}h Target • ` : ""}
                                {Array.isArray(message.payload.roadmapSteps) ? `${message.payload.roadmapSteps.length} ${isSystemBn ? "টি মাইলস্টোন ধাপ" : "milestone steps"}` : (isSystemBn ? "রোডম্যাপ প্রস্তুত" : "Roadmap Ready")}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("learning");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "স্কিল বিল্ডার খুলুন" : "Open Skill Builder"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && (message.intent === "MY_DIARY" || message.intent === "DIARY_ENTRY") && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "ডায়েরিতে সেভ হয়েছে" : "Saved to My Diary"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {message.payload.title || (isSystemBn ? "আজকের ডায়েরি" : "Today's Diary")}
                              </div>
                              <div className={styles.proposalDesc}>
                                {message.payload.topicTitle || (isSystemBn ? "ব্যক্তিগত অনুভূতি ও স্মৃতি" : "Personal Reflections")}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("mind");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "মাই ডায়েরি খুলুন" : "Open My Diary"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && message.intent === "NOTES_FILES" && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "নোট সেভ হয়েছে" : "Saved to Notes"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {message.payload.title || "New Note"}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalBtn}
                                  onClick={() => {
                                    applyPayloadToApp(message.id, message.intent, message.payload);
                                    navigateTo("tasks");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "নোটস খুলুন" : "Open Notes"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {message.payload && message.intent === "FOCUS_SESSION" && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalBadge}>
                                <CheckCircle2 size={13} />
                                <span>{isSystemBn ? "ফোকাস সেশন প্রস্তুত" : "Focus Session Ready"}</span>
                              </div>
                              <div className={styles.proposalTitle}>
                                {message.payload.durationMinutes || 25} min • {message.payload.goal || "Deep Work"}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalPrimaryBtn}
                                  onClick={() => {
                                    const mins = message.payload.durationMinutes || 25;
                                    const taskName = message.payload.goal || (isSystemBn ? "ডিপ ওয়ার্ক সেশন" : "Deep Work Session");
                                    localStorage.setItem(
                                      "focusforge_pending_focus_launch",
                                      JSON.stringify({
                                        taskName,
                                        category: "Study",
                                        durationMinutes: mins,
                                        autoStart: true,
                                        timestamp: Date.now()
                                      })
                                    );
                                    navigateTo("focus");
                                  }}
                                >
                                  <Compass size={14} />
                                  <span>{isSystemBn ? "সেশন শুরু করুন" : "Start Focus"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {(message.intent === "REQUIRE_LOGIN" || message.payload?.requireLogin) && (
                            <div className={styles.proposalCard}>
                              <div className={styles.proposalTitle}>
                                {isSystemBn ? "লগইন প্রয়োজন" : "Login Required"}
                              </div>
                              <div className={styles.proposalDesc}>
                                {isSystemBn
                                  ? "লগইন করলে AI জেগে উঠবে এবং আনলিমিটেড ব্যবহার ও ক্লাউড সেভ সুবিধা পাবেন।"
                                  : "Log in to wake up AI and enjoy full conversations and cloud sync."}
                              </div>
                              <div className={styles.proposalActions}>
                                <button
                                  type="button"
                                  className={styles.proposalPrimaryBtn}
                                  onClick={() => openAuth("initial")}
                                >
                                  <LogIn size={14} />
                                  <span>{isSystemBn ? "লগইন করুন" : "Log In"}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* BOTTOM INTERACTIVE ORB: Displays Thinking Reaction (hand on chin + thought cloud) or Typing (mini laptop + live typewriter) */}
              <div className={styles.bottomOrbStageWrapper}>
                <div className={styles.bottomOrbInner}>
                  <AIOrbFace
                    mood={mood}
                    thoughtText={isTyping ? streamingText : thoughtText}
                    speechSide="left"
                    isThinking={isThinking}
                    isTypingStream={isTyping}
                    isGiggling={isGiggling}
                    isEnjoying={isEnjoying}
                    isLight={isLight}
                    language={language}
                    onTap={triggerGiggle}
                    showStatusBadge={false}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* COMPOSER (Fixed at the bottom) */}
        <div className={`${styles.composerWrapper} ${isKeyboardOpen ? styles.composerWrapperKeyboardOpen : ""}`}>
          <div className={styles.composerContainer}>
            {/* Token Exhaustion Alert */}
            {tokenStatus?.isExhausted && (
              <div className={styles.tokenBanner}>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>
                    {guestLimitExceeded
                      ? isSystemBn
                        ? "গেস্ট লিমিট শেষ। লগইন করে চালিয়ে যান।"
                        : "Guest limit reached. Please log in."
                      : isSystemBn
                      ? "আজকের লিমিট শেষ।"
                      : "Daily token limit reached."}
                  </span>
                </div>
                {guestLimitExceeded && (
                  <button
                    type="button"
                    className={styles.tokenLoginBtn}
                    onClick={() => openAuth("login")}
                  >
                    {isSystemBn ? "লগইন" : "Log In"}
                  </button>
                )}
              </div>
            )}

            {/* Main Compact Pill Input Box (Gemini style single unified capsule pill) */}
            <div
              className={`${styles.composerPillBox} composer-pill-box`}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== "BUTTON" && !(e.target as HTMLElement).closest("button")) {
                  textareaRef.current?.focus();
                }
              }}
            >
              {/* Left Companion Emoji / Mood Button */}
              <div className={styles.moodMenuWrapper} ref={moodMenuRef}>
                <button
                  type="button"
                  className={`${styles.pillMoodBtn} ${moodMenuOpen ? styles.pillMoodBtnActive : ""}`}
                  onClick={() => setMoodMenuOpen((prev) => !prev)}
                  aria-label="Companion mood"
                  aria-haspopup="true"
                  aria-expanded={moodMenuOpen}
                  title={isSystemBn ? "কম্প্যানিয়ন মুড" : "Companion Mood"}
                >
                  <Smile size={18} strokeWidth={1.8} />
                </button>

                {moodMenuOpen && (
                  <div className={styles.moodPopoverBottom} role="dialog" aria-label="Companion moods">
                    <div className={styles.moodGrid}>
                      <button
                        type="button"
                        className={`${styles.moodItem} ${mood === "idle" ? styles.moodItemActive : ""}`}
                        onClick={() => {
                          setManualMood(null);
                          setMoodMenuOpen(false);
                        }}
                      >
                        <span className={styles.moodLabel}>
                          {isSystemBn ? "অটো" : "Auto"}
                        </span>
                      </button>
                      {moodList.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`${styles.moodItem} ${mood === opt.id ? styles.moodItemActive : ""}`}
                          onClick={() => {
                            setManualMood(opt.id);
                            setMoodMenuOpen(false);
                          }}
                        >
                          <span className={styles.moodLabel}>
                            {isSystemBn ? opt.labelBn : opt.labelEn}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Center Input Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                disabled={isThinking}
                onChange={(e) => {
                  setInput(e.target.value);
                  resetInactivityTimer();
                  requestAnimationFrame(adjustTextareaHeight);
                }}
                onKeyDown={(e) => {
                  resetInactivityTimer();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask about your tasks, routine or goals"
                rows={1}
                className={`${styles.pillTextarea} composer-pill-textarea`}
                aria-label="Message FocusForge AI"
              />

              {/* Right Controls: Model Switcher + Mic + Send/Stop */}
              <div className={styles.pillControlsRight}>
                {/* Model Selector Pill with choose menu */}
                <div className={styles.modelMenuWrapper} ref={modelMenuRef}>
                  <button
                    type="button"
                    className={`${styles.pillModelBtn} ${modelMenuOpen ? styles.pillModelBtnActive : ""}`}
                    onClick={() => setModelMenuOpen((prev) => !prev)}
                    aria-label="Select AI Model"
                    aria-haspopup="true"
                    aria-expanded={modelMenuOpen}
                    title={
                      modelMode === "fast"
                        ? isSystemBn ? "মডেল নির্বাচন করুন (বর্তমান: Fast)" : "Select AI model (Current: Fast)"
                        : isSystemBn ? "মডেল নির্বাচন করুন (বর্তমান: Deep)" : "Select AI model (Current: Deep)"
                    }
                  >
                    <span>{modelMode === "fast" ? "Fast" : "Deep"}</span>
                    <ChevronDown size={13} className={`${styles.modelChevron} ${modelMenuOpen ? styles.modelChevronOpen : ""}`} />
                  </button>

                  {modelMenuOpen && (
                    <div className={styles.modelPopover} role="menu" aria-label="AI Model Selection">
                      <div className={styles.modelPopoverHeader}>
                        <span>{isSystemBn ? "এআই মডেল নির্বাচন" : "Select AI Model"}</span>
                      </div>

                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.modelMenuItem} ${modelMode === "fast" ? styles.modelMenuItemActive : ""}`}
                        onClick={() => {
                          setModelMode("fast");
                          setModelMenuOpen(false);
                        }}
                      >
                        <div className={styles.modelMenuInfo}>
                          <div className={styles.modelMenuTitleRow}>
                            <span className={styles.modelMenuName}>Fast</span>
                            <span className={styles.modelMenuBadge}>0.4s</span>
                          </div>
                          <span className={styles.modelMenuDesc}>
                            {isSystemBn ? "দ্রুত প্রতিক্রিয়া ও সহজ কাজ" : "Quick response & general tasks"}
                          </span>
                        </div>
                        {modelMode === "fast" && (
                          <div className={styles.modelCheckIcon}>
                            <Check size={14} />
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.modelMenuItem} ${modelMode === "deep" ? styles.modelMenuItemActive : ""}`}
                        onClick={() => {
                          setModelMode("deep");
                          setModelMenuOpen(false);
                        }}
                      >
                        <div className={styles.modelMenuInfo}>
                          <div className={styles.modelMenuTitleRow}>
                            <span className={styles.modelMenuName}>Deep</span>
                            <span className={styles.modelMenuBadgeDeep}>Planning</span>
                          </div>
                          <span className={styles.modelMenuDesc}>
                            {isSystemBn ? "গভীর চিন্তা ও বিস্তারিত পরিকল্পনা" : "Deep reasoning & task planning"}
                          </span>
                        </div>
                        {modelMode === "deep" && (
                          <div className={styles.modelCheckIcon}>
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mic Icon Button */}
                <button
                  type="button"
                  className={`${styles.pillIconBtn} ${voiceOpen ? styles.pillIconBtnActive : ""}`}
                  onClick={voiceOpen ? stopVoice : startVoice}
                  disabled={isThinking || tokenStatus?.isExhausted}
                  aria-label={voiceOpen ? "Stop voice input" : "Start voice input"}
                  title="Voice input"
                >
                  <Mic size={18} strokeWidth={1.8} />
                </button>

                {/* Send / Stop Action Button */}
                {isThinking ? (
                  <button
                    type="button"
                    className={styles.pillSendBtn}
                    onClick={() => stopGeneration(isSystemBn ? "bn" : "en")}
                    aria-label="Stop generation"
                    title="Stop"
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : input.trim() ? (
                  <button
                    type="button"
                    className={styles.pillSendBtn}
                    onClick={() => submit()}
                    aria-label="Send message"
                    title="Send"
                  >
                    <ArrowUp size={18} strokeWidth={2.2} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Below it, centered 11.5px muted text */}
            <p className={styles.disclaimerText}>
              AI can make mistakes. Check important details.
            </p>
          </div>
        </div>

        {/* Voice Assistant Modal */}
        <VoiceAssistantModal
          isOpen={voiceOpen}
          onClose={stopVoice}
          language="auto"
          onSpeechResult={handleSpeechResult}
        />
      </div>
    </section>
  );
}

export default AIAgentPage;
