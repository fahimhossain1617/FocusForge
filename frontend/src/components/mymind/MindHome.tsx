"use client";

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";

interface MindHomeProps {
  navigate: (view: string) => void;
  setActiveThoughtId: (id: string) => void;
}

export default function MindHome({ navigate, setActiveThoughtId }: MindHomeProps) {
  const { state, addMindItem, showToast } = useAppContext();
  const { requireAuth } = useAuth();
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInput((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      // Auto-resize
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 0);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
    requireAuth(() => {
      addMindItem(input.trim(), 'home');
      setInput("");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      
      showToast(t.myMind.toastChangesSaved, "success");
    }, 'mind');
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.myMind.justNow;
    if (mins < 60) return `${mins}${t.myMind.mAgo}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t.myMind.hAgo}`;
    const days = Math.floor(hrs / 24);
    return `${days}${t.myMind.dAgo}`;
  };

  const openDetail = (id: string) => {
    setActiveThoughtId(id);
    navigate('detail');
  };

  const displayValue = input + (interim ? ((input && !input.endsWith(" ") && !input.endsWith("\n")) ? " " : "") + interim : "");

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <div className="mb-8 text-center mt-4">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {t.myMind.title}
        </h1>
        <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {t.myMind.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button onClick={() => navigate('empty_session')} className="px-4 py-2 text-xs font-medium rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
          {t.myMind.emptyMyMind}
        </button>
        <button onClick={() => navigate('problem_solver')} className="px-4 py-2 text-xs font-medium rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
          {t.myMind.problemSolver}
        </button>
        <button onClick={() => navigate('idea_capture')} className="px-4 py-2 text-xs font-medium rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
          {t.myMind.captureAnIdea}
        </button>
        <button onClick={() => navigate('diary')} className="px-4 py-2 text-xs font-medium rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
          {t.myMind.myDiary || "My Diary"}
        </button>
      </div>

      <div className="mb-8">
        <div
          className="rounded-2xl border transition-all duration-300 relative pb-16 overflow-hidden"
          style={{
            background: "var(--color-bg-card)",
            borderColor: (isFocused || input.trim()) ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
            boxShadow: (isFocused || input.trim()) ? "0 0 12px rgba(59, 130, 246, 0.1)" : "none",
          }}
        >
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.myMind.writeFreely}
            className="w-full px-6 py-6 text-lg border-0 resize-none no-focus-ring bg-transparent my-mind-textarea"
            style={{ 
              background: "transparent", 
              border: "none", 
              outline: "none", 
              minHeight: "120px",
              color: "var(--color-text-primary)" 
            }}
          />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <VoiceInput 
              onResult={handleResult} 
              onInterimResult={setInterim}
              onError={(err) => showToast(err, 'error')}
            />
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: input.trim() ? "var(--color-purple-primary)" : "var(--color-bg-elevated)",
                  color: input.trim() ? "white" : "var(--color-text-muted)",
                }}
              >
                {t.myMind.save}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.myMind.recentThoughts}
        </h2>
        <button onClick={() => navigate('review_all')} className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: "var(--color-purple-primary)" }}>
          {t.myMind.reviewAll}
        </button>
      </div>

      {state.mindItems.length > 0 ? (
        <div className="space-y-3">
          {state.mindItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              onClick={() => openDetail(item.id)}
              className="rounded-2xl p-4 border transition-colors cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5"
              style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium line-clamp-2 pr-4" style={{ color: "var(--color-text-primary)" }}>
                  {item.content}
                </p>
                <span className="text-xs shrink-0 pt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 opacity-60">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t.myMind.mindEmpty}
          </p>
        </div>
      )}
    </div>
  );
}
