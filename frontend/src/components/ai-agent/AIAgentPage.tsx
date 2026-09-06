"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Mic, Send, MoreVertical, Trash2, Calendar, Sparkles, AlertCircle, LogIn } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel, ProposedAction } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
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
const modelOptions: { value: AIAgentModel; label: string }[] = [
  { value: "smart", label: "FocusForge Smart" },
  { value: "fast", label: "Fast Response" },
  { value: "planning", label: "Deep Planning" },
];

const languageOptions: { value: AIAgentLanguage; label: string }[] = [
  { value: "bn", label: "বাংলা" },
  { value: "en", label: "English" },
];

function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
}) {
  const [open, setOpen] = useState(false);
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
      <span className={styles.customSelectLabel}>{label}</span>
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

      {open && (
        <div className={styles.customDropdownMenu} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.customOption} ${isSelected ? styles.customOptionSelected : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className={styles.optionCheck} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AIAgentPage() {
  const { state, showToast, navigateTo, addTask, addTimeBlock, addMindItem, addNote, startFocusSession } = useAppContext();
  const { user, openAuth } = useAuth();
  const isLight = state.theme?.mode === "light";
  const isSystemBn = state.lang === "bn";

  const [model, setModel] = useState<AIAgentModel>("smart");
  const [language, setLanguage] = useState<AIAgentLanguage>(isSystemBn ? "bn" : "en");
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);

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

  const context = useMemo(() => ({ tasks: state.tasks, notesCount: state.notes.length, timeBlocksCount: state.timeBlocks.length, productivityScore: state.productivityScore }), [state.tasks, state.notes.length, state.timeBlocks.length, state.productivityScore]);
  const { messages, sessions, activeSessionId, tokenStatus, isThinking, error, send, setMessages, createNewSession, selectSession, removeSession, guestLimitExceeded } = useAIAgent(context, isSystemBn ? "bn" : "en");
  const name = user?.fullName || user?.displayName || "there";
  const quickActions = isSystemBn ? quickActionsBn : quickActionsEn;
  
  const [showHistory, setShowHistory] = useState(false);
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

  // Auto-scroll down smoothly when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Keep composer and controls in view when mobile virtual keyboard opens/resizes
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleViewportChange = () => {
      if (document.activeElement?.tagName === "TEXTAREA" && composerRef.current) {
        composerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    };
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  const submit = async (value = input) => { 
    if (!value.trim() || guestLimitExceeded) return; 
    setInput(""); 
    await send(value, language); 
  };
  
  const startVoice = () => {
    if (guestLimitExceeded) return;
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
    <section className={styles.page} data-theme={isLight ? "light" : "dark"} aria-label="FocusForge AI Agent">
      <div className={styles.fixedArcContainer} aria-hidden="true">
        <div className={styles.topHorizonArc} />
        <div className={styles.bottomHorizonArc} />
      </div>

      <header className={styles.header}>
        <div className={styles.title}>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {isSystemBn ? 'ফোকাস ফোর্স AI এজেন্ট' : 'FocusForge AI Agent'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div ref={historyMenuRef} style={{ position: 'relative' }}>
            <button 
              className={styles.iconButton} 
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Chat History"
              aria-expanded={showHistory}
            >
              <MoreVertical size={20} />
            </button>
          
          {showHistory && (
            <div className={styles.historyDropdown}>
              <div className={styles.historyHeader}>
                <span>{isSystemBn ? 'চ্যাট হিস্ট্রি' : 'Chat History'}</span>
                <button 
                  className={styles.newChatBtn}
                  onClick={() => { createNewSession(); setShowHistory(false); }}
                >
                  {isSystemBn ? '+ নতুন চ্যাট' : '+ New Chat'}
                </button>
              </div>
              <div className={styles.historyList}>
                {sessions.length === 0 ? (
                  <div className={styles.historyEmpty}>
                    {isSystemBn ? 'কোনো পূর্ববর্তী চ্যাট নেই' : 'No past sessions'}
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div 
                      key={session.id} 
                      className={`${styles.historyItem} ${session.id === activeSessionId ? styles.activeHistory : ''}`}
                      onClick={() => { selectSession(session.id); setShowHistory(false); }}
                    >
                      <span className={styles.historyTitle}>{session.title}</span>
                      <button 
                        className={styles.historyDeleteBtn}
                        onClick={(e) => { e.stopPropagation(); removeSession(session.id); }}
                        aria-label="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </header>

      <div className={styles.chatArea} ref={chatAreaRef}>
        {messages.length === 0 ? (
          <div className={styles.heroWrapper}>
            <div className={styles.hero}>
              <div className={styles.heroContent}>
                <h1>Welcome back, {name}</h1>
                <p>Let’s turn your plans into progress.</p>
              </div>
            </div>
            <div className={styles.quickActionsHero}>
              {quickActions.map((action) => (
                <button key={action} onClick={() => submit(action)} disabled={isThinking || guestLimitExceeded}>
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
                <p>{message.content}</p>

                {/* 1. PLANNER_CREATE */}
                {message.payload && message.intent === 'PLANNER_CREATE' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>
                        {isSystemBn ? 'স্টাডি / টাস্ক প্ল্যান' : 'Planner Tasks'}
                      </strong>
                      <span>
                        {Array.isArray(message.payload.tasks) 
                          ? `${message.payload.tasks.length} ${isSystemBn ? 'টি টাস্ক পাওয়া গেছে' : 'tasks generated'}`
                          : (message.payload.title || 'New Task')}
                      </span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const fallbackDate = message.payload.targetDate || new Date().toISOString().split('T')[0];
                        if (Array.isArray(message.payload.tasks)) {
                          message.payload.tasks.forEach((t: any, idx: number) => {
                            const totalMins = t.estimatedMinutes || 60;
                            const taskId = Date.now() + idx + Math.floor(Math.random() * 1000);
                            const taskDate = t.targetDate || fallbackDate;
                            const taskTitle = t.title || 'New Study Task';
                            
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
                          showToast(isSystemBn ? 'সবগুলো টাস্ক ও রুটিন ব্লকে সফলভাবে প্ল্যানারে যুক্ত হয়েছে!' : 'Tasks & time blocks added to your planner!', "success");
                        } else {
                          const totalMins = message.payload.estimatedMinutes || 60;
                          const taskId = Date.now() + Math.floor(Math.random() * 1000);
                          const taskDate = message.payload.targetDate || fallbackDate;
                          const taskTitle = message.payload.title || 'New Study Task';
                          const startTime = message.payload.time || "10:00";
                          const endTime = "11:00";

                          addTask({
                            id: taskId,
                            name: taskTitle,
                            title: taskTitle,
                            priority: message.payload.priority || 'medium',
                            estHours: Math.floor(totalMins / 60),
                            estMinutes: totalMins % 60,
                            targetDate: taskDate,
                            date: taskDate,
                            time: startTime,
                            category: 'Study',
                            status: 'not_started',
                            notes: message.payload.enableNotification ? '[Notification Reminders: ON]' : '',
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
                          showToast(isSystemBn ? 'টাস্ক ও রুটিন ব্লক সফলভাবে প্ল্যানারে যুক্ত হয়েছে!' : 'Task & time block added to your planner!', "success");
                        }
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        setTimeout(() => {
                          navigateTo('planner');
                        }, 1500);
                      }}>
                        <Check size={14} /> {isSystemBn ? 'অটোমেটিক যুক্ত করুন' : 'Auto Add'}
                      </button>
                      <button className={styles.secondary} onClick={() => {
                        showToast(isSystemBn ? 'প্ল্যানার খোলা হচ্ছে...' : 'Opening Planner...', 'info');
                        navigateTo('planner');
                      }}>
                        <Calendar size={14} /> {isSystemBn ? 'ম্যানুয়ালি দেখুন' : 'Manual View'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. PROBLEM_SOLVER */}
                {message.payload && message.intent === 'PROBLEM_SOLVER' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{isSystemBn ? 'সমস্যা সমাধান' : 'Problem Solver'}</strong>
                      <span>{message.payload.problem || 'Action plan ready'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const content = `[Problem]: ${message.payload.problem || ''}\n\nSteps:\n${(message.payload.solutionSteps || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n')}`;
                        addMindItem(content, 'problem_solver');
                        showToast(isSystemBn ? 'সমস্যা মাইন্ডে সেভ করা হয়েছে' : 'Saved to Problem Solver!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        setTimeout(() => {
                          navigateTo('mind');
                        }, 1500);
                      }}>
                        <Check size={14} /> {isSystemBn ? 'সেভ করুন' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. IDEA_CAPTURE */}
                {message.payload && message.intent === 'IDEA_CAPTURE' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{isSystemBn ? 'আইডিয়া ক্যাপচার' : 'Idea Capture'}</strong>
                      <span>{message.payload.idea || 'Creative thought'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const content = `[Idea]: ${message.payload.idea || ''}\n\nKey Points:\n${(message.payload.keyPoints || []).map((k: string) => `- ${k}`).join('\n')}`;
                        addMindItem(content, 'idea_capture');
                        showToast(isSystemBn ? 'আইডিয়া সেভ করা হয়েছে' : 'Saved to Ideas!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        setTimeout(() => {
                          navigateTo('mind');
                        }, 1500);
                      }}>
                        <Check size={14} /> {isSystemBn ? 'সেভ করুন' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. NOTES_FILES */}
                {message.payload && message.intent === 'NOTES_FILES' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{isSystemBn ? 'নোটস ও ফাইলস' : 'Notes & Files'}</strong>
                      <span>{message.payload.title || 'New Note'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        addNote({
                          title: message.payload.title || 'AI Note',
                          blocks: [{
                            id: 'block_' + Date.now(),
                            type: 'paragraph',
                            content: message.payload.content || ''
                          }],
                          category: 'AI Generated',
                        });
                        showToast(isSystemBn ? 'নোট তৈরি হয়েছে!' : 'Note created successfully!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        setTimeout(() => {
                          navigateTo('tasks');
                        }, 1500);
                      }}>
                        <Check size={14} /> {isSystemBn ? 'নোট সেভ ও খুলুন' : 'Save & Open Notes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. FOCUS_SESSION */}
                {message.payload && message.intent === 'FOCUS_SESSION' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{isSystemBn ? 'ফোকাস সেশন' : 'Focus Session'}</strong>
                      <span>{message.payload.durationMinutes || 25} min • {message.payload.goal || 'Deep Work'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        startFocusSession(
                          message.payload.goal || 'Deep Work Session',
                          'Study',
                          undefined,
                          message.payload.durationMinutes || 25
                        );
                        showToast(isSystemBn ? 'ফোকাস সেশন শুরু হয়েছে!' : 'Focus session started!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        setTimeout(() => {
                          navigateTo('focus');
                        }, 1500);
                      }}>
                        <Check size={14} /> {isSystemBn ? 'টাইমার শুরু' : 'Start'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. LEARNING_HUB */}
                {message.payload && message.intent === 'LEARNING_HUB' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{isSystemBn ? 'স্কিল বিল্ডার' : 'Skill Builder'}</strong>
                      <span>{message.payload.skillName || 'Skill'} • {message.payload.learningTopic || 'Track Learning'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        showToast(isSystemBn ? 'স্কিল বিল্ডার খোলা হচ্ছে...' : 'Opening Learning Hub...', 'info');
                        navigateTo('learning');
                      }}>
                        <Check size={14} /> {isSystemBn ? 'হাব খুলুন' : 'Open'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. REQUIRE_LOGIN (Guest limit reached) */}
                {(message.intent === 'REQUIRE_LOGIN' || message.payload?.requireLogin) && (
                  <div className={styles.proposal} style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.08)' }}>
                    <div>
                      <strong style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={15} />
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
                    <Sparkles size={14} className={styles.sparkleSpin} />
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
        {messages.length > 0 && !guestLimitExceeded && (
          <div className={styles.quickActionsInline}>
            {quickActions.slice(0, 4).map((action) => (
              <button key={action} onClick={() => submit(action)} disabled={isThinking || guestLimitExceeded}>
                {action}
              </button>
            ))}
          </div>
        )}

        <div className={styles.composer}>
          <textarea
            ref={textareaRef}
            value={input}
            disabled={isThinking || guestLimitExceeded}
            onChange={(event) => {
              setInput(event.target.value);
              requestAnimationFrame(adjustTextareaHeight);
            }}
            onFocus={() => {
              setTimeout(() => {
                composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              }, 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={
              guestLimitExceeded
                ? (isSystemBn 
                    ? "গেস্ট লিমিট শেষ। ব্যবহার চালিয়ে যেতে লগইন করুন..." 
                    : "Guest limit reached. Please log in to continue...")
                : (isSystemBn ? "টাস্ক, স্টাডি প্ল্যান, ফোকাস, নোটস, আইডিয়া বা সমস্যা সম্পর্কে বলুন..." : "Ask me anything about your tasks, routine, goals, or productivity...")
            }
            aria-label="Message FocusForge AI"
            rows={1}
          />
          <div className={styles.controls}>
            <div className={styles.selectGroup}>
              <CustomSelect label="AI model" value={model} options={modelOptions} onChange={setModel} />
            </div>
            <div className={styles.composeActions}>
              <button
                className={`${styles.voiceButton} ${voiceOpen ? styles.listening : ""}`}
                onClick={voiceOpen ? stopVoice : startVoice}
                disabled={guestLimitExceeded}
                aria-label={voiceOpen ? "Stop voice input" : "Start voice input"}
                aria-pressed={voiceOpen}
              >
                <Mic size={18} />
              </button>
              <button
                className={styles.sendButton}
                onClick={() => submit()}
                disabled={!input.trim() || isThinking || tokenStatus?.isExhausted}
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
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
