"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Mic, Send, Square, MoreVertical, Trash2, Calendar, Bot, AlertCircle, LogIn, MessageSquarePlus, Compass, CheckCircle2, Clock } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
import { useAnimateExit } from "@/hooks/useAnimateExit";
import { AuroraBars } from "./AuroraBars";
import styles from "./ai-agent.module.css";

function toBnNum(num: number): string {
  const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toLocaleString('en-US').split('').map(d => bnNums[parseInt(d, 10)] ?? d).join('');
}

const quickActionsBn = [
  "আজকের স্টাডি প্ল্যান তৈরি করো",
  "আমি একটি সমস্যায় পড়েছি",
  "আমার একটি নতুন আইডিয়া আছে",
  "একটি নোট তৈরি করতে চাই",
  "২৫ মিনিটের ফোকাস সেশন শুরু করো",
  "নতুন স্কিল শিখতে চাই"
];

const quickActionsEn = [
  "Plan My Study Schedule",
  "I'm Facing a Problem",
  "Capture a New Idea",
  "Create a Quick Note",
  "Start 25m Focus Session",
  "Learn a New Skill"
];

const modelOptionsBn: { value: AIAgentModel; label: string }[] = [
  { value: "fast", label: "Fast Response (দ্রুত)" },
  { value: "smart", label: "FocusForge Smart (স্মার্ট)" },
  { value: "planning", label: "Deep Planning (গভীর পরিকল্পনা)" },
];

const modelOptionsEn: { value: AIAgentModel; label: string }[] = [
  { value: "fast", label: "Fast Response" },
  { value: "smart", label: "FocusForge Smart" },
  { value: "planning", label: "Deep Planning" },
];

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownAnim = useAnimateExit({ isOpen: open, durationMs: 140 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={styles.customSelectWrapper} ref={ref}>
      <button
        type="button"
        className={`${styles.customSelectButton} ${open ? styles.customSelectButtonActive : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={13} className={`${styles.dropdownChevron} ${open ? styles.chevronOpen : ""}`} />
      </button>

      {dropdownAnim.shouldRender && (
        <div className={`${styles.customDropdownMenu} ${dropdownAnim.isExiting ? styles.customDropdownMenuExit : ""}`} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.customDropdownItem} ${isSelected ? styles.customDropdownItemActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AIAgentPage() {
  const { state, showToast, navigateTo, addTask, addTimeBlock, addMindItem, addNote, isOnline, trackMeaningfulAction } = useAppContext();
  const { user, openAuth } = useAuth();
  const isLight = state.theme?.mode === "light";
  const isSystemBn = state.lang === "bn";

  const [model, setModel] = useState<AIAgentModel>("fast");
  const [language, setLanguage] = useState<AIAgentLanguage>(isSystemBn ? "bn" : "en");
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [, setIsFocused] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);

  const baseInputRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

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
    error,
    send,
    createNewSession,
    selectSession,
    removeSession,
    clearAllSessions,
    guestLimitExceeded
  } = useAIAgent(context, isSystemBn ? "bn" : "en");

  const name = user?.fullName || user?.displayName || (isSystemBn ? "বন্ধু" : "there");
  const quickActions = isSystemBn ? quickActionsBn : quickActionsEn;
  
  // Keep Aurora animation active during typing in initial empty state; smoothly hide once messages are sent/thinking
  const showAurora = messages.length === 0 && !isThinking;

  const handleNewChat = useCallback(() => {
    createNewSession();
    setInput("");
    setGreetingIndex((prev) => (prev + 1) % 4);
  }, [createNewSession]);

  const greetings = isSystemBn ? [
    { title: `স্বাগতম, ${name}` },
    { title: "আজকে নতুন কিছু শুরু করতে চান?" },
    { title: "আজকে কি নিয়ে ফোকাস করবেন?" },
    { title: "চলুন দিনটিকে আরও প্রোডাক্টিভ করি" },
  ] : [
    { title: `Welcome back, ${name}` },
    { title: "Ready to start something new today?" },
    { title: "What would you like to focus on?" },
    { title: "Let's make today productive" },
  ];

  const currentGreeting = greetings[greetingIndex % greetings.length] || greetings[0];

  const [showHistory, setShowHistory] = useState(false);
  const historyAnim = useAnimateExit({ isOpen: showHistory, durationMs: 150 });
  const historyMenuRef = useRef<HTMLDivElement>(null);

  // Close history dropdown when clicked outside
  useEffect(() => {
    if (!showHistory) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHistory]);

  // Auto-scroll down smoothly within chatArea when messages update
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isThinking]);

  // Keep composer and controls in view when mobile virtual keyboard opens/resizes
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleViewportChange = () => {
      if (document.activeElement?.tagName === "TEXTAREA" && chatAreaRef.current) {
        chatAreaRef.current.scrollTo({
          top: chatAreaRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    };
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  const appliedPayloadsRef = useRef<Set<string>>(new Set());

  const applyPayloadToApp = useCallback((msgId: string, intent: string | undefined, payload: any) => {
    if (!payload || !intent || appliedPayloadsRef.current.has(msgId)) return;
    appliedPayloadsRef.current.add(msgId);

    const fallbackDate = payload.targetDate || new Date().toISOString().split('T')[0];

    if (intent === 'PLANNER_CREATE') {
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [payload];
      tasks.forEach((t: any, idx: number) => {
        const totalMins = t.estimatedMinutes || 45;
        const taskId = Date.now() + idx + Math.floor(Math.random() * 1000);
        const taskDate = t.targetDate || fallbackDate;
        const taskTitle = t.title || (isSystemBn ? 'নতুন স্টাডি টাস্ক' : 'New Study Task');
        const startHour = 10 + (idx * 2);
        const startTime = t.time || `${String(startHour).padStart(2, '0')}:00`;
        const endHour = startHour + Math.max(1, Math.ceil(totalMins / 60));
        const endTime = `${String(endHour).padStart(2, '0')}:00`;

        addTask({
          id: taskId,
          name: taskTitle,
          title: taskTitle,
          priority: t.priority || 'medium',
          estHours: Math.floor(totalMins / 60),
          estMinutes: totalMins % 60,
          targetDate: taskDate,
          date: taskDate,
          time: startTime,
          category: 'Study',
          status: 'not_started',
          notes: t.enableNotification ? '[Notification Reminders: ON]' : '',
          tier: 'now'
        });

        addTimeBlock({
          date: taskDate,
          startTime: startTime,
          endTime: endTime,
          label: taskTitle,
          category: 'Study',
          isBreak: false,
          taskId: taskId,
        });
      });
      showToast(isSystemBn ? 'টাস্ক ও স্টাডি প্ল্যান সফলভাবে প্ল্যানারে যুক্ত হয়েছে!' : 'Tasks & schedule added to Planner!', 'success');
    } else if (intent === 'NOTES_FILES') {
      addNote({
        title: payload.title || (isSystemBn ? 'নতুন স্টাডি নোট' : 'New Study Note'),
        blocks: [{
          id: 'block_' + Date.now(),
          type: 'paragraph',
          content: payload.content || ''
        }],
        category: 'AI Generated',
      });
      showToast(isSystemBn ? 'নোটটি সফলভাবে নোটস ও ফাইলস-এ যুক্ত হয়েছে!' : 'Note added to Notes & Files!', 'success');
    } else if (intent === 'PROBLEM_SOLVER') {
      const content = `[Problem]: ${payload.problem || ''}\n\nSteps:\n${(payload.solutionSteps || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n')}`;
      addMindItem(content, 'problem_solver');
      showToast(isSystemBn ? 'সমাধান পরিকল্পনা মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!' : 'Solution added to Mind Hub!', 'success');
    } else if (intent === 'IDEA_CAPTURE') {
      const content = `[Idea]: ${payload.idea || ''}\n\nKey Points:\n${(payload.keyPoints || []).map((k: string) => `- ${k}`).join('\n')}`;
      addMindItem(content, 'idea_capture');
      showToast(isSystemBn ? 'আইডিয়াটি মাইন্ড ট্র্যাকারে যুক্ত হয়েছে!' : 'Idea saved to Mind Hub!', 'success');
    } else if (intent === 'FOCUS_SESSION') {
      const mins = payload.durationMinutes || 25;
      const taskName = payload.goal || (isSystemBn ? 'ডিপ ওয়ার্ক সেশন' : 'Deep Work Session');
      localStorage.setItem('focusforge_pending_focus_launch', JSON.stringify({
        taskName,
        category: 'Study',
        durationMinutes: mins,
        autoStart: true,
        timestamp: Date.now()
      }));
      showToast(isSystemBn ? `${mins} মিনিটের ফোকাস সেশন প্রস্তুত হয়েছে!` : `${mins}m Focus session ready!`, 'success');
    }
  }, [addTask, addTimeBlock, addNote, addMindItem, showToast, isSystemBn]);

  const submit = async (value = input) => { 
    if (!value.trim() || guestLimitExceeded) return; 
    if (!isOnline) {
      showToast(
        isSystemBn
          ? "আপনি বর্তমানে অফলাইনে আছেন।"
          : "You are currently offline.",
        "error"
      );
      return;
    }
    setInput(""); 
    const aiMsg = await send(value, language, model); 
    if (aiMsg) {
      trackMeaningfulAction?.('ai_agent_interaction');
    }
    if (aiMsg?.payload && aiMsg.intent && aiMsg.intent !== 'GREETING_OR_GENERAL') {
      applyPayloadToApp(aiMsg.id, aiMsg.intent, aiMsg.payload);
    }
  };
  
  const startVoice = () => {
    if (guestLimitExceeded) return;
    if (!isOnline) {
      showToast(
        isSystemBn
          ? "আপনি বর্তমানে অফলাইনে আছেন।"
          : "You are currently offline.",
        "error"
      );
      return;
    }
    baseInputRef.current = input.trim();
    setVoiceOpen(true);
  };
  const stopVoice = () => {
    setVoiceOpen(false);
  };

  // Dynamically expands up to ~500 characters (max-height ~200px) and shrinks back automatically
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const minHeight = 44;
    const maxHeight = 200;
    const scrollHeight = el.scrollHeight;

    if (scrollHeight <= minHeight) {
      el.style.height = `${minHeight}px`;
      el.style.overflowY = "hidden";
    } else if (scrollHeight >= maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${scrollHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    window.addEventListener("resize", adjustTextareaHeight);
    return () => window.removeEventListener("resize", adjustTextareaHeight);
  }, [adjustTextareaHeight]);

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
    <section className={`w-full flex-1 flex flex-col h-full min-h-0 text-foreground ${styles.agentShell}`} aria-label="FocusForge AI">
      {/* Ultra-realistic full-interface ambient wave layer starting from the very bottom */}
      <div
        className={`${styles.interfaceWave} ${showAurora ? styles.interfaceWaveVisible : styles.interfaceWaveHidden}`}
        aria-hidden="true"
      >
        <AuroraBars active={showAurora} />
      </div>

      {/* Clean Compact Header */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-xl relative z-[99999] shrink-0">
        <div className="flex items-center">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground/90 leading-none">
            FocusForge AI
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={isSystemBn ? "নতুন চ্যাট" : "New Chat"}
          >
            <MessageSquarePlus size={14} />
            <span className="hidden sm:inline">{isSystemBn ? "নতুন চ্যাট" : "New Chat"}</span>
          </button>

          {/* History Dropdown */}
          <div className="relative z-[99999]" ref={historyMenuRef}>
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title={isSystemBn ? "চ্যাট হিস্ট্রি" : "Chat History"}
            >
              <MoreVertical size={16} />
            </button>

            {historyAnim.shouldRender && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-xl bg-[#0c101d] border border-blue-500/30 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-2 z-[100000] transition-all opacity-100 ${
                  historyAnim.isExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
                }`}
              >
                <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-white/[0.08]">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {isSystemBn ? "পূর্ববর্তী চ্যাটসমূহ" : "Previous Chats"}
                  </span>
                  {sessions.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        clearAllSessions();
                        showToast(isSystemBn ? 'সকল চ্যাট হিস্ট্রি মুছে ফেলা হয়েছে' : 'All chat history cleared', 'info');
                      }}
                      className="text-[11px] text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isSystemBn ? "সব মুছুন" : "Clear all"}
                    >
                      <Trash2 size={11} />
                      <span>{isSystemBn ? "সব মুছুন" : "Clear all"}</span>
                    </button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <div className="text-xs text-zinc-500 px-2 py-3 text-center">
                    {isSystemBn ? "কোনো চ্যাট হিস্ট্রি নেই" : "No chat history"}
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        s.id === activeSessionId
                          ? "bg-blue-600/20 text-blue-300 font-medium"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <button
                        type="button"
                        className="truncate flex-1 text-left bg-transparent border-none p-0 text-inherit cursor-pointer text-xs"
                        onClick={() => {
                          selectSession(s.id);
                          setShowHistory(false);
                        }}
                      >
                        {s.title || (isSystemBn ? "নতুন আলাপ" : "New Chat")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeSession(s.id);
                          showToast(isSystemBn ? 'চ্যাটটি মুছে ফেলা হয়েছে' : 'Chat deleted', 'info');
                        }}
                        className="text-zinc-400 hover:text-red-400 hover:bg-red-500/20 p-1.5 rounded transition-colors shrink-0 ml-1 cursor-pointer z-10"
                        title={isSystemBn ? "মুছে ফেলুন" : "Delete"}
                        aria-label={isSystemBn ? "মুছে ফেলুন" : "Delete chat"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`${styles.chatArea} ${styles.contentLayer}`} ref={chatAreaRef}>
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 my-auto text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentGreeting.title}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-5 max-w-lg">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => submit(action)}
                  disabled={isThinking || guestLimitExceeded}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-blue-600/20 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-blue-500/35 backdrop-blur-sm shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 active:scale-95 leading-normal"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.conversation} aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}>
                <div className={styles.messageLabel}>{message.role === "user" ? "You" : "FocusForge AI"}</div>
                {message.intent === 'FAILED_TO_SEND' ? (
                  <div className={styles.failedToSendBadge}>
                    <AlertCircle size={14} className={styles.failedIcon} />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}

                {/* 1. PLANNER_CREATE */}
                {message.payload && message.intent === 'PLANNER_CREATE' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'প্ল্যানারে সফলভাবে যুক্ত হয়েছে' : 'Successfully Added to Planner'}</span>
                      </div>
                      <strong>
                        {isSystemBn ? 'স্টাডি / টাস্ক প্ল্যান' : 'Planner Tasks'}
                      </strong>
                      <span>
                        {Array.isArray(message.payload.tasks) 
                          ? `${message.payload.tasks.length} ${isSystemBn ? 'টি টাস্ক যুক্ত করা হয়েছে' : 'tasks scheduled in planner'}`
                          : (message.payload.title || 'Study Task')}
                      </span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        applyPayloadToApp(message.id, message.intent, message.payload);
                        showToast(isSystemBn ? 'প্ল্যানার খোলা হচ্ছে...' : 'Opening Planner...', 'info');
                        navigateTo('planner');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (প্ল্যানার দেখুন)' : 'Explore Planner'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. PROBLEM_SOLVER */}
                {message.payload && message.intent === 'PROBLEM_SOLVER' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'মাইন্ড ট্র্যাকার সেভ হয়েছে' : 'Saved to Mind Hub'}</span>
                      </div>
                      <strong>{isSystemBn ? 'সমস্যা সমাধান' : 'Problem Solver'}</strong>
                      <span>{message.payload.problem || 'Action plan ready'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        applyPayloadToApp(message.id, message.intent, message.payload);
                        showToast(isSystemBn ? 'মাইন্ড হাব খোলা হচ্ছে...' : 'Opening Mind Hub...', 'info');
                        navigateTo('mind');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (মাইন্ড দেখুন)' : 'Explore Mind Hub'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. IDEA_CAPTURE */}
                {message.payload && message.intent === 'IDEA_CAPTURE' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'আইডিয়া বক্সে যুক্ত হয়েছে' : 'Saved to Ideas'}</span>
                      </div>
                      <strong>{isSystemBn ? 'আইডিয়া ক্যাপচার' : 'Idea Capture'}</strong>
                      <span>{message.payload.idea || 'Creative thought'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        applyPayloadToApp(message.id, message.intent, message.payload);
                        showToast(isSystemBn ? 'মাইন্ড আইডিয়া খোলা হচ্ছে...' : 'Opening Mind Ideas...', 'info');
                        navigateTo('mind');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (আইডিয়া দেখুন)' : 'Explore Ideas'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. NOTES_FILES */}
                {message.payload && message.intent === 'NOTES_FILES' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'নোটস ও ফাইলসে যুক্ত হয়েছে' : 'Saved to Notes & Files'}</span>
                      </div>
                      <strong>{isSystemBn ? 'নোটস ও ফাইলস' : 'Notes & Files'}</strong>
                      <span>{message.payload.title || 'New Note'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        applyPayloadToApp(message.id, message.intent, message.payload);
                        showToast(isSystemBn ? 'নোটস ও ফাইলস খোলা হচ্ছে...' : 'Opening Notes...', 'info');
                        navigateTo('tasks');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (নোটস দেখুন)' : 'Explore Notes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. FOCUS_SESSION */}
                {message.payload && message.intent === 'FOCUS_SESSION' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'ফোকাস সেশন প্রস্তুত' : 'Focus Session Ready'}</span>
                      </div>
                      <strong>{isSystemBn ? 'ফোকাস সেশন' : 'Focus Session'}</strong>
                      <span>{message.payload.durationMinutes || 25} min • {message.payload.goal || (isSystemBn ? 'ডিপ ওয়ার্ক' : 'Deep Work')}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        const mins = message.payload.durationMinutes || 25;
                        const taskName = message.payload.goal || (isSystemBn ? 'ডিপ ওয়ার্ক সেশন' : 'Deep Work Session');
                        localStorage.setItem('focusforge_pending_focus_launch', JSON.stringify({
                          taskName,
                          category: 'Study',
                          durationMinutes: mins,
                          autoStart: true,
                          timestamp: Date.now()
                        }));
                        showToast(isSystemBn ? 'ফোকাস টাইমার শুরু করা হচ্ছে...' : 'Starting Focus Mode...', 'info');
                        navigateTo('focus');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (সেশন শুরু করুন)' : 'Explore (Start Focus)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. LEARNING_HUB */}
                {message.payload && message.intent === 'LEARNING_HUB' && (
                  <div className={styles.proposal}>
                    <div>
                      <div className={styles.proposalSuccessBadge}>
                        <CheckCircle2 size={12} />
                        <span>{isSystemBn ? 'লার্নিং হাবে যুক্ত হয়েছে' : 'Ready in Learning Hub'}</span>
                      </div>
                      <strong>{isSystemBn ? 'স্কিল বিল্ডার' : 'Skill Builder'}</strong>
                      <span>{message.payload.skillName || 'Skill'} • {message.payload.learningTopic || 'Track Learning'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.exploreBtn} onClick={() => {
                        showToast(isSystemBn ? 'স্কিল বিল্ডার খোলা হচ্ছে...' : 'Opening Learning Hub...', 'info');
                        navigateTo('learning');
                      }}>
                        <Compass size={14} /> {isSystemBn ? 'এক্সপ্লোর করুন (লার্নিং হাব)' : 'Explore Learning Hub'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. REQUIRE_LOGIN (Guest limit reached) */}
                {(message.intent === 'REQUIRE_LOGIN' || message.payload?.requireLogin) && (
                  <div className={styles.proposal} style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.08)' }}>
                    <div>
                      <strong style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bot size={15} />
                        {isSystemBn ? 'লগইন প্রয়োজন' : 'Login Required'}
                      </strong>
                      <span>
                        {isSystemBn 
                          ? 'আনলিমিটেড AI ও চ্যাট হিস্ট্রি সেভ রাখতে লগইন করুন' 
                          : 'Log in to save your history and unlock unlimited AI features'}
                      </span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button 
                        className={styles.confirm} 
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}
                        onClick={() => openAuth('initial')}
                      >
                        <LogIn size={15} /> {isSystemBn ? 'লগইন করুন' : 'Log In Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageLabel}>{isSystemBn ? "ফোকাসফোর্স AI" : "FocusForge AI"}</div>
                <div className={styles.thinking}>
                  <div className={styles.thinkingIcon}>
                    <Bot size={14} className={styles.sparkleSpin} />
                  </div>
                  <div className={styles.thinkingDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className={styles.thinkingText}>
                    {isSystemBn ? "ভাবছে..." : "Thinking..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={styles.composerWrapper} ref={composerRef}>
        {/* Token Exhaustion Alert Banner right above composer */}
        {tokenStatus?.isExhausted && (
          <div className={styles.tokenLimitBanner}>
            <div className={styles.tokenLimitIcon}>
              <Clock size={16} />
            </div>
            <div className={styles.tokenLimitText}>
              {guestLimitExceeded ? (
                <span>
                  {isSystemBn 
                    ? "আপনার গেস্ট লিমিট শেষ হয়ে গেছে। সম্পূর্ণ সুবিধা ও ব্যবহার চালিয়ে যেতে লগইন করুন।" 
                    : "Your guest limit has been reached. Please log in to continue."}
                </span>
              ) : (
                <span>
                  {isSystemBn 
                    ? `আপনার আজকের লিমিট শেষ। রিসেট হওয়ার সময়: ${tokenStatus.formattedResetDate || 'আগামীকাল'} (${tokenStatus.formattedRemainingTime || '২৪ ঘণ্টা'} বাকি)।`
                    : `Your daily limit has been reached. Resets on: ${tokenStatus.formattedResetDate || 'tomorrow'} (${tokenStatus.formattedRemainingTime || '24h'} remaining).`}
                </span>
              )}
            </div>
            {guestLimitExceeded && (
              <button
                type="button"
                className={styles.tokenLimitLoginBtn}
                onClick={() => openAuth('login')}
              >
                <LogIn size={13} />
                <span>{isSystemBn ? "লগইন করুন" : "Log In"}</span>
              </button>
            )}
          </div>
        )}

        {messages.length > 0 && !tokenStatus?.isExhausted && (
          <div className={styles.quickActionsInline}>
            {quickActions.slice(0, 4).map((action) => (
              <button key={action} onClick={() => submit(action)} disabled={isThinking}>
                {action}
              </button>
            ))}
          </div>
        )}

        <div className={styles.composer}>
          <textarea
            ref={textareaRef}
            value={input}
            disabled={isThinking}
            onChange={(event) => {
              setInput(event.target.value);
              requestAnimationFrame(adjustTextareaHeight);
            }}
            onFocus={() => {
              setIsFocused(true);
              setTimeout(() => {
                if (chatAreaRef.current) {
                  chatAreaRef.current.scrollTo({
                    top: chatAreaRef.current.scrollHeight,
                    behavior: "smooth"
                  });
                }
              }, 120);
            }}
            onBlur={() => {
              setIsFocused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={
              tokenStatus?.isExhausted
                ? (isSystemBn 
                    ? "টোকেন লিমিট শেষ। মেসেজ পাঠালে রিসেট হওয়ার তারিখ ও সময় দেখতে পাবেন..." 
                    : "Token limit reached. Send a message to see reset date & time details...")
                : (isSystemBn ? "টাস্ক, স্টাডি প্ল্যান, ফোকাস, নোটস, আইডিয়া বা সমস্যা সম্পর্কে বলুন..." : "Ask me anything about your tasks, routine, goals, or productivity...")
            }
            aria-label="Message FocusForge AI"
            rows={1}
          />
          <div className={styles.controls}>
            <div className={styles.selectGroup}>
              <CustomSelect value={model} options={isSystemBn ? modelOptionsBn : modelOptionsEn} onChange={setModel} />
            </div>
            <div className={styles.composeActions}>
              <button
                className={`${styles.voiceButton} ${voiceOpen ? styles.listening : ""}`}
                onClick={voiceOpen ? stopVoice : startVoice}
                disabled={isThinking || tokenStatus?.isExhausted}
                aria-label={voiceOpen ? "Stop voice input" : "Start voice input"}
                aria-pressed={voiceOpen}
              >
                <Mic size={18} />
              </button>
              {isThinking ? (
                <button
                  type="button"
                  className={`${styles.sendButton} ${styles.stopButton}`}
                  onClick={() => stopGeneration(isSystemBn ? "bn" : "en")}
                  aria-label={isSystemBn ? "থামুন" : "Stop generation"}
                  title={isSystemBn ? "থামুন (Stop generation)" : "Stop generation"}
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={() => submit()}
                  disabled={!input.trim()}
                  aria-label={isSystemBn ? "মেসেজ পাঠান" : "Send message"}
                  title={isSystemBn ? "মেসেজ পাঠান" : "Send message"}
                >
                  <Send size={17} />
                </button>
              )}
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>

      <VoiceAssistantModal
        isOpen={voiceOpen}
        onClose={stopVoice}
        language="auto"
        onSpeechResult={handleSpeechResult}
        themeMode={isLight ? "light" : "dark"}
      />
    </section>
  );
}

export default AIAgentPage;
