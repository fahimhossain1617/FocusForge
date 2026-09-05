"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Mic, Send, MoreVertical, Trash2, Calendar, Sparkles } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel, ProposedAction } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
import styles from "./ai-agent.module.css";
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
                className={`${styles.customDropdownItem} ${isSelected ? styles.customDropdownItemActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={13} className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AIAgentPage() {
  const { state, updateState, addTask, updateTask, showToast, navigateTo, addMindItem, addNote } = useAppContext();
  const isLight = state?.theme?.mode === "light";
  const { user } = useAuth();
  const isSystemBn = state?.lang === "bn";
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<AIAgentLanguage>(isSystemBn ? "bn" : "en");
  const [model, setModel] = useState<AIAgentModel>("smart");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const baseInputRef = useRef("");
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
  const { messages, sessions, activeSessionId, isThinking, error, send, setMessages, createNewSession, selectSession, removeSession } = useAIAgent(context);
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

  const submit = async (value = input) => { if (!value.trim()) return; setInput(""); await send(value, language); };
  const startVoice = () => {
    baseInputRef.current = input.trim();
    setVoiceOpen(true);
  };
  const stopVoice = () => {
    setVoiceOpen(false);
  };
  const handleSpeechResult = (voiceText: string) => {
    const base = baseInputRef.current;
    setInput(base ? `${base} ${voiceText}`.trim() : voiceText);
  };

  return (
    <section className={styles.page} data-theme={isLight ? "light" : "dark"} aria-label="FocusForge AI Agent">
      {/* 1. FIXED CELESTIAL HORIZON ARCS (Never shifts with text or scroll) */}
      <div className={styles.fixedArcContainer} aria-hidden="true">
        <div className={styles.topHorizonArc} />
        <div className={styles.bottomHorizonArc} />
      </div>

      {/* 2. Top Header - strictly title text, no icons, no subtitles */}
      <header className={styles.header}>
        <div className={styles.title}>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {isSystemBn ? 'ফোকাস ফোর্স AI এজেন্ট' : 'FocusForge AI Agent'}
          </p>
        </div>
        <div className={styles.headerActions} ref={historyMenuRef}>
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
                  sessions.map(session => (
                    <div key={session.id} className={`${styles.historyItem} ${session.id === activeSessionId ? styles.activeHistoryItem : ''}`}>
                      <button 
                        className={styles.historyItemBtn}
                        onClick={() => { selectSession(session.id); setShowHistory(false); }}
                      >
                        {session.title}
                      </button>
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
      </header>

      {/* 3. Main Scrollable Chat Area */}
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
                <button key={action} onClick={() => submit(action)} disabled={isThinking}>
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
                        {language === 'bn' ? 'স্টাডি / টাস্ক প্ল্যান' : 'Planner Tasks'}
                      </strong>
                      <span>
                        {Array.isArray(message.payload.tasks) 
                          ? `${message.payload.tasks.length} ${language === 'bn' ? 'টি টাস্ক পাওয়া গেছে' : 'tasks generated'}`
                          : (message.payload.title || 'New Task')}
                      </span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const fallbackDate = message.payload.targetDate || new Date().toISOString().split('T')[0];
                        if (Array.isArray(message.payload.tasks)) {
                          message.payload.tasks.forEach((t: any) => {
                            const totalMins = t.estimatedMinutes || 30;
                            addTask({
                              name: t.title || 'New Task',
                              priority: t.priority || 'medium',
                              estHours: Math.floor(totalMins / 60),
                              estMinutes: totalMins % 60,
                              targetDate: t.targetDate || fallbackDate,
                              category: 'Study',
                              status: 'not_started',
                              notes: '',
                              tier: 'now'
                            });
                          });
                          showToast(language === 'bn' ? 'সবগুলো টাস্ক সফলভাবে প্ল্যানারে যুক্ত হয়েছে!' : 'Tasks added to your planner!', "success");
                        } else {
                          const totalMins = message.payload.estimatedMinutes || 30;
                          addTask({
                            name: message.payload.title || 'New Task',
                            priority: message.payload.priority || 'medium',
                            estHours: Math.floor(totalMins / 60),
                            estMinutes: totalMins % 60,
                            targetDate: message.payload.targetDate || fallbackDate,
                            category: 'Study',
                            status: 'not_started',
                            notes: '',
                            tier: 'now'
                          });
                          showToast(language === 'bn' ? 'টাস্ক সফলভাবে প্ল্যানারে যুক্ত হয়েছে!' : 'Task added to your planner!', "success");
                        }
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        navigateTo('planner');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'অটোমেটিক যুক্ত করুন' : 'Auto Add'}
                      </button>
                      <button className={styles.secondary} onClick={() => {
                        showToast(language === 'bn' ? 'প্ল্যানার খোলা হচ্ছে...' : 'Opening Planner...', 'info');
                        navigateTo('planner');
                      }}>
                        <Calendar size={14} /> {language === 'bn' ? 'ম্যানুয়ালি দেখুন' : 'Manual View'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. PROBLEM_SOLVER */}
                {message.payload && message.intent === 'PROBLEM_SOLVER' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{language === 'bn' ? 'সমস্যা সমাধান' : 'Problem Solver'}</strong>
                      <span>{message.payload.problem || 'Action plan ready'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const content = `[Problem]: ${message.payload.problem || ''}\n\nSteps:\n${(message.payload.solutionSteps || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n')}`;
                        addMindItem(content, 'problem_solver');
                        showToast(language === 'bn' ? 'সমস্যা মাইন্ডে সেভ করা হয়েছে' : 'Saved to Problem Solver!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        navigateTo('mind');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'সেভ করুন' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. IDEA_CAPTURE */}
                {message.payload && message.intent === 'IDEA_CAPTURE' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{language === 'bn' ? 'আইডিয়া ক্যাপচার' : 'Idea Capture'}</strong>
                      <span>{message.payload.idea || 'Creative thought'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        const content = `[Idea]: ${message.payload.idea || ''}\n\nKey Points:\n${(message.payload.keyPoints || []).map((k: string) => `- ${k}`).join('\n')}`;
                        addMindItem(content, 'idea_capture');
                        showToast(language === 'bn' ? 'আইডিয়া সেভ করা হয়েছে' : 'Saved to Ideas!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        navigateTo('mind');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'সেভ করুন' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. NOTES_FILES */}
                {message.payload && message.intent === 'NOTES_FILES' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{language === 'bn' ? 'নোটস ও ফাইলস' : 'Notes & Files'}</strong>
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
                        showToast(language === 'bn' ? 'নোট তৈরি হয়েছে!' : 'Note created successfully!', 'success');
                        setMessages(items => items.map(i => i.id === message.id ? { ...i, payload: null } : i));
                        navigateTo('tasks');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'নোট সেভ ও খুলুন' : 'Save & Open Notes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. FOCUS_SESSION */}
                {message.payload && message.intent === 'FOCUS_SESSION' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{language === 'bn' ? 'ফোকাস সেশন' : 'Focus Session'}</strong>
                      <span>{message.payload.durationMinutes || 25} min • {message.payload.goal || 'Deep Work'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        showToast(language === 'bn' ? 'ফোকাস মোড খোলা হচ্ছে...' : 'Opening Focus Mode...', 'info');
                        navigateTo('focus');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'টাইমার শুরু' : 'Start'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. LEARNING_HUB */}
                {message.payload && message.intent === 'LEARNING_HUB' && (
                  <div className={styles.proposal}>
                    <div>
                      <strong>{language === 'bn' ? 'স্কিল বিল্ডার' : 'Skill Builder'}</strong>
                      <span>{message.payload.skillName || 'Skill'} • {message.payload.learningTopic || 'Track Learning'}</span>
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.confirm} onClick={() => {
                        showToast(language === 'bn' ? 'স্কিল বিল্ডার খোলা হচ্ছে...' : 'Opening Learning Hub...', 'info');
                        navigateTo('learning');
                      }}>
                        <Check size={14} /> {language === 'bn' ? 'হাব খুলুন' : 'Open'}
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

      {/* 4. Pinned Bottom Composer Section */}
      <div className={styles.composerWrapper} ref={composerRef}>
        {messages.length > 0 && (
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
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
            placeholder={isSystemBn ? "টাস্ক, স্টাডি প্ল্যান, ফোকাস, নোটস, আইডিয়া বা সমস্যা সম্পর্কে বলুন..." : "Ask me anything about your tasks, routine, goals, or productivity..."}
            aria-label="Message FocusForge AI"
            rows={1}
          />
          <div className={styles.controls}>
            <div className={styles.selectGroup}>
              <CustomSelect label="AI model" value={model} options={modelOptions} onChange={setModel} />
              <CustomSelect 
                label={isSystemBn ? "ভাষা" : "Language"} 
                value={language} 
                options={languageOptions} 
                onChange={(val) => {
                  setLanguage(val);
                  updateState({ lang: val === "bn" ? "bn" : "en" });
                }} 
              />
            </div>
            <div className={styles.composeActions}>
              <button
                className={`${styles.voiceButton} ${voiceOpen ? styles.listening : ""}`}
                onClick={voiceOpen ? stopVoice : startVoice}
                aria-label={voiceOpen ? "Stop voice input" : "Start voice input"}
                aria-pressed={voiceOpen}
              >
                <Mic size={18} />
              </button>
              <button
                className={styles.sendButton}
                onClick={() => submit()}
                disabled={!input.trim() || isThinking}
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
        language={language}
        onSpeechResult={handleSpeechResult}
        themeMode={isLight ? "light" : "dark"}
      />
    </section>
  );
}
