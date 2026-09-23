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
  Clock
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
import BorderBeam from "@/components/ui/BorderBeam";
import styles from "./ai-agent.module.css";

const quickMessagesEn = [
  { label: "Plan my study schedule", prompt: "Plan my study schedule for the upcoming week based on my routine and priorities" },
  { label: "I'm facing a problem", prompt: "I'm facing a problem with my study and productivity. Let's break it down step by step." },
  { label: "Capture a new idea", prompt: "I have a new idea. Help me capture and structure it clearly." },
  { label: "Create a quick note", prompt: "Help me write a concise note about my current topic." },
  { label: "Learn a new skill", prompt: "I want to learn a new skill. Create a structured roadmap with milestones." }
];

const quickMessagesBn = [
  { label: "পড়ার রুটিন তৈরি করো", prompt: "আমার পড়ার রুটিন তৈরি করো" },
  { label: "আমি একটি সমস্যায় পড়েছি", prompt: "আমি একটি সমস্যায় পড়েছি, ধাপে ধাপে সমাধান বের করতে সাহায্য করো" },
  { label: "নতুন আইডিয়া সংরক্ষণ করো", prompt: "আমার একটি নতুন আইডিয়া আছে, এটি নোট করে বিশ্লেষণ করো" },
  { label: "একটি নোট তৈরি করো", prompt: "একটি দরকারি নোট তৈরি করতে চাই" },
  { label: "নতুন স্কিল শিখতে চাই", prompt: "নতুন স্কিল শিখতে চাই, একটি মাইলস্টোনসহ রোডম্যাপ দাও" }
];

export function AIAgentPage() {
  const { state, showToast, navigateTo, addTask, addTimeBlock, addMindItem, addNote, isOnline, trackMeaningfulAction } = useAppContext();
  const { user, openAuth } = useAuth();
  const isSystemBn = state?.lang === "bn";

  // Model & Language State
  const [modelMode, setModelMode] = useState<"fast" | "deep">("fast");
  const aiModel: AIAgentModel = modelMode === "deep" ? "planning" : "fast";
  const [language, setLanguage] = useState<AIAgentLanguage>(isSystemBn ? "bn" : "en");
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const baseInputRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    stopGeneration,
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
        ? `শুভ সকাল${nameSuffix}। আজকের দিনটি সফল ও সুন্দর করতে কী নিয়ে কাজ শুরু করবেন?`
        : `Good morning${nameSuffix}. What shall we focus on today?`;
    } else if (hour >= 12 && hour < 15) {
      // 12:00 - 14:59 (Noon / দুপুর)
      return isSystemBn
        ? `শুভ দুপুর${nameSuffix}। দুপুরের কাজের গতি ধরে রাখুন এবং সামনে এগিয়ে যান।`
        : `Good noon${nameSuffix}. Keep your momentum strong and focus sharp.`;
    } else if (hour >= 15 && hour < 18) {
      // 15:00 - 17:59 (Afternoon / বিকাল)
      return isSystemBn
        ? `শুভ বিকাল${nameSuffix}। আজকের গুরুত্বপূর্ণ কাজগুলো গুছিয়ে শেষ করার চমৎকার সময়।`
        : `Good afternoon${nameSuffix}. Time to wrap up today's top priorities.`;
    } else if (hour >= 18 && hour < 21) {
      // 18:00 - 20:59 (Evening / সন্ধ্যা)
      return isSystemBn
        ? `শুভ সন্ধ্যা${nameSuffix}। আজকের অর্জনগুলো পর্যালোচনা করুন ও আগামীকালের প্রস্তুতি নিন।`
        : `Good evening${nameSuffix}. Time to review today's achievements and organize ahead.`;
    } else {
      // 21:00 - 04:59 (Night & Late Night / রাত ও গভীর রাত)
      return isSystemBn
        ? `হে নাইট আউল${nameSuffix}। গভীর রাতের পড়াশোনা ও কাজে কোনো সহায়তা লাগবে?`
        : `Hey night owl${nameSuffix}. Working late or planning for tomorrow?`;
    }
  }, [isSystemBn, cleanName]);

  const handleNewChat = useCallback(() => {
    createNewSession();
    setInput("");
    setMenuOpen(false);
  }, [createNewSession]);

  // Auto-scroll down within chatArea when messages update
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isThinking]);

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
        category: "AI Generated"
      });
      showToast(isSystemBn ? "নোটটি সফলভাবে নোটস ও ফাইলস-এ যুক্ত হয়েছে!" : "Note added to Notes & Files!", "success");
    } else if (intent === "PROBLEM_SOLVER") {
      const content = `[Problem]: ${payload.problem || ""}\n\nSteps:\n${(payload.solutionSteps || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}`;
      addMindItem(content, "problem_solver");
      showToast(isSystemBn ? "সমাধান পরিকল্পনা মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!" : "Solution added to Mind Hub!", "success");
    } else if (intent === "IDEA_CAPTURE") {
      const content = `[Idea]: ${payload.idea || ""}\n\nKey Points:\n${(payload.keyPoints || []).map((k: string) => `- ${k}`).join("\n")}`;
      addMindItem(content, "idea_capture");
      showToast(isSystemBn ? "আইডিয়াটি মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!" : "Idea saved to Mind Hub!", "success");
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
  }, [addTask, addTimeBlock, addNote, addMindItem, showToast, isSystemBn]);

  const submit = async (value = input) => {
    if (!value.trim() || guestLimitExceeded) return;
    if (!isOnline) {
      showToast(isSystemBn ? "আপনি বর্তমানে অফলাইনে আছেন।" : "You are currently offline.", "error");
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
      showToast(isSystemBn ? "আপনি বর্তমানে অফলাইনে আছেন।" : "You are currently offline.", "error");
      return;
    }
    baseInputRef.current = input.trim();
    setVoiceOpen(true);
  };

  const stopVoice = () => {
    setVoiceOpen(false);
  };

  // Dynamically auto-growing textarea (max 140px)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 140;
    if (el.scrollHeight >= maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${Math.max(24, el.scrollHeight)}px`;
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

  const quickMessages = isSystemBn ? quickMessagesBn : quickMessagesEn;

  return (
    <section
      className={styles.agentShell}
      aria-label="FocusForge AI"
    >
      {/* FULL-WIDTH TOP BAR: Left "FocusForge AI" to the edge, Right 3-dots Menu to the edge */}
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
                      {isSystemBn ? "আপনার নতুন আলাপ এখানে সংরক্ষিত হবে" : "Conversations you start will appear here"}
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
      <div className={styles.layoutContainer}>
        {/* MAIN CONTENT / CHAT AREA */}
        <div className={styles.chatArea} ref={chatAreaRef}>
          {messages.length === 0 ? (
            /* HOME (EMPTY STATE): Classy Greeting + Compact Quick Action Chips */
            <div className={styles.homeContainer}>
              {/* Classy Time-of-day Greeting */}
              <h1 className={styles.greetingH1}>
                {greetingText}
              </h1>

              {/* Compact Quick Message Chips (Text Only, No Icons/Descriptions) */}
              <div className={styles.quickBoxesGrid}>
                {quickMessages.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={styles.quickBox}
                    onClick={() => {
                      setInput(item.prompt);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* CHAT THREAD */
            <div className={styles.conversation} aria-live="polite">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
                  >
                    <div className={isUser ? styles.userBubble : styles.assistantBubble}>
                      {message.intent === "FAILED_TO_SEND" ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle size={14} />
                          <span>{message.content}</span>
                        </div>
                      ) : (
                        message.content
                      )}

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
                              ? "আনলিমিটেড AI ও চ্যাট হিস্ট্রি পেতে লগইন করুন।"
                              : "Log in to save chat history and continue conversations."}
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

              {/* Thinking Indicator */}
              {isThinking && (
                <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
                  <div className={styles.thinkingText}>Thinking</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COMPOSER (Fixed at the bottom) */}
        <div className={styles.composerWrapper}>
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

            {/* Main Input Box */}
            <div className={styles.composerBox}>
              <BorderBeam borderWidth={3.2} duration={13} borderRadius={20} beamLength={360} />
              <textarea
                ref={textareaRef}
                value={input}
                disabled={isThinking}
                onChange={(e) => {
                  setInput(e.target.value);
                  requestAnimationFrame(adjustTextareaHeight);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask about your tasks, routine or goals"
                rows={1}
                className={styles.textarea}
                aria-label="Message FocusForge AI"
              />

              {/* Tools row under the textarea */}
              <div className={styles.toolsRow}>
                {/* Model Selector (Fast / Deep clean text pill) */}
                <div className={styles.modelSelectorContainer} role="radiogroup" aria-label="AI Model Selection">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={modelMode === "fast"}
                    className={`${styles.modelOption} ${modelMode === "fast" ? styles.modelOptionActive : ""}`}
                    onClick={() => setModelMode("fast")}
                    title={isSystemBn ? "Fast মোড: ০.৪ সেকেন্ডে অতি দ্রুত উত্তর ও কম টোকেন খরচ" : "Fast Mode: Ultra-fast 0.4s response & low token usage"}
                  >
                    <span>Fast</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={modelMode === "deep"}
                    className={`${styles.modelOption} ${modelMode === "deep" ? styles.modelOptionActive : ""}`}
                    onClick={() => setModelMode("deep")}
                    title={isSystemBn ? "Deep মোড: গভীর চিন্তা, বড় নোট ও দীর্ঘমেয়াদী প্ল্যান" : "Deep Mode: Deep reasoning, large note organization & strategic planning"}
                  >
                    <span>Deep</span>
                  </button>
                </div>

                <div className={styles.toolsRight}>
                  {/* Mic icon button */}
                  <button
                    type="button"
                    className={`${styles.micButton} ${voiceOpen ? styles.micButtonActive : ""}`}
                    onClick={voiceOpen ? stopVoice : startVoice}
                    disabled={isThinking || tokenStatus?.isExhausted}
                    aria-label={voiceOpen ? "Stop voice input" : "Start voice input"}
                    title="Voice input"
                  >
                    <Mic size={18} strokeWidth={1.7} />
                  </button>

                  {/* Send button */}
                  {isThinking ? (
                    <button
                      type="button"
                      className={styles.sendButton}
                      onClick={() => stopGeneration(isSystemBn ? "bn" : "en")}
                      aria-label="Stop generation"
                      title="Stop"
                    >
                      <Square size={13} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.sendButton}
                      onClick={() => submit()}
                      disabled={!input.trim()}
                      aria-label="Send message"
                      title="Send"
                    >
                      <ArrowUp size={18} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
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
