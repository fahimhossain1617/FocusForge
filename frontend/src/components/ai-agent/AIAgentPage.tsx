"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, Check, ChevronDown, Mic, Send, WandSparkles } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useAIAgent } from "@/hooks/useAIAgent";
import type { AIAgentLanguage, AIAgentModel, ProposedAction } from "@/types/aiAgent";
import { VoiceAssistantModal } from "@/components/voice";
import styles from "./ai-agent.module.css";

const quickActions = ["Plan My Day", "What Should I Do Next?", "Organize My Tasks", "Analyze My Progress", "Balance My Routine", "Break Down a Goal"];

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
  const { state, addTask, updateTask, showToast } = useAppContext();
  const isLight = state?.theme?.mode === "light";
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<AIAgentLanguage>("bn");
  const [model, setModel] = useState<AIAgentModel>("smart");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const baseInputRef = useRef("");
  const context = useMemo(() => ({ tasks: state.tasks, notesCount: state.notes.length, timeBlocksCount: state.timeBlocks.length, productivityScore: state.productivityScore }), [state.tasks, state.notes.length, state.timeBlocks.length, state.productivityScore]);
  const { messages, isThinking, error, send, setMessages } = useAIAgent(context);
  const name = user?.fullName || user?.displayName || "there";

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
  const applyProposal = (proposal: ProposedAction) => {
    if (proposal.type === "create_task") addTask(proposal.payload);
    if (proposal.type === "complete_task" && proposal.payload.taskId) updateTask(proposal.payload.taskId, { status: "completed", completed: true });
    setMessages((items) => items.map((item) => item.proposal?.some((action) => action.id === proposal.id) ? { ...item, proposal: undefined } : item));
    showToast(proposal.type === "create_task" ? "Task created." : "Task completed.", "success");
  };

  return <section className={styles.page} data-theme={isLight ? "light" : "dark"} aria-label="FocusForge AI Agent">
    <header className={styles.header}>
      <div className={styles.title}><span className={styles.logo}><BrainCircuit size={19} /></span><div><p>FocusForge AI Agent</p><span>Your personal productivity intelligence</span></div></div>
    </header>
    <div className={styles.hero}>
      <div className={styles.heroContent}><h1>Welcome back, {name}</h1><p>Let’s turn your plans into progress.</p></div>
    </div>
    <div className={styles.workspace}>
      {messages.length > 0 && <div className={styles.conversation} aria-live="polite">{messages.map((message) => <div key={message.id} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}><div className={styles.messageLabel}>{message.role === "user" ? "You" : "FocusForge AI"}</div><p>{message.content}</p>{message.proposal?.map((proposal) => <div className={styles.proposal} key={proposal.id}><WandSparkles size={17} /><div><strong>{proposal.title}</strong><span>{proposal.detail}</span></div><div className={styles.proposalActions}><button onClick={() => setMessages((items) => items.map((item) => item.proposal?.some((a) => a.id === proposal.id) ? { ...item, proposal: undefined } : item))}>Cancel</button><button className={styles.confirm} onClick={() => applyProposal(proposal)}><Check size={14} /> Confirm</button></div></div>)}</div>)}{isThinking && <div className={`${styles.message} ${styles.assistant}`}><div className={styles.messageLabel}>FocusForge AI</div><div className={styles.thinking}><i /><i /><i /> Thinking with your workspace context</div></div>}</div>}
      <div className={styles.quickActions}>{quickActions.map((action) => <button key={action} onClick={() => submit(action)} disabled={isThinking}>{action}</button>)}</div>
      <div className={styles.composer}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Ask me anything about your tasks, routine, goals, or productivity..." aria-label="Message FocusForge AI" rows={3} />
        <div className={styles.controls}><div className={styles.selectGroup}><CustomSelect label="AI model" value={model} options={modelOptions} onChange={setModel} /><CustomSelect label="Language" value={language} options={languageOptions} onChange={setLanguage} /></div><div className={styles.composeActions}><button className={`${styles.voiceButton} ${voiceOpen ? styles.listening : ""}`} onClick={voiceOpen ? stopVoice : startVoice} aria-label={voiceOpen ? "Stop voice input" : "Start voice input"} aria-pressed={voiceOpen}><Mic size={18} /></button><button className={styles.sendButton} onClick={() => submit()} disabled={!input.trim() || isThinking} aria-label="Send message"><Send size={17} /></button></div></div>
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
  </section>;
}
