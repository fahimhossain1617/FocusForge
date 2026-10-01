"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";
import ThoughtPaperCard from "./ThoughtPaperCard";

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
  const [activeMode, setActiveMode] = useState<'mind' | 'idea' | 'problem'>('mind');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean, isFullReplacement?: boolean) => {
    if (isFinal && text) {
      setInput((prev) => {
        if (isFullReplacement) {
          return text;
        }
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      setInterim("");
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
      let source: 'home' | 'idea_capture' | 'problem_solver' = 'home';
      if (activeMode === 'idea') source = 'idea_capture';
      if (activeMode === 'problem') source = 'problem_solver';
      
      addMindItem(input.trim(), source);
      setInput("");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      
      showToast(t.myMind.toastChangesSaved, "success");
    }, 'mind');
  };

  const openDetail = (id: string) => {
    setActiveThoughtId(id);
    navigate('detail');
  };

  // Smart dashboard preview sorting & filtering:
  // - Sorted newest first
  // - Prioritize thoughts from the last 1-2 days (48 hours)
  // - Gracefully fall back to most recent available thoughts if none from last 2 days
  // - Never exceeds 6 cards
  const sortedThoughts = useMemo(() => {
    return [...state.mindItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [state.mindItems]);

  const previewThoughts = useMemo(() => {
    if (sortedThoughts.length === 0) return [];
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const recentWithin2Days = sortedThoughts.filter(
      (item) => new Date(item.createdAt).getTime() >= twoDaysAgo
    );
    if (recentWithin2Days.length > 0) {
      return recentWithin2Days.slice(0, 6);
    }
    return sortedThoughts.slice(0, 6);
  }, [sortedThoughts]);

  const displayValue = input + (interim ? ((input && !input.endsWith(" ") && !input.endsWith("\n")) ? " " : "") + interim : "");

  return (
    <div className="motion-page w-full max-w-3xl mx-auto px-4 sm:px-6 pt-1 pb-16">
      {/* ── Top Section: Heading, Category Buttons, Writing Box ── */}
      <div className="w-full mb-10">
        <div className="mb-7 text-center mt-0">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-2">
            {t.myMind.title}
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            {t.myMind.subtitle}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-7">
          <button 
            type="button"
            onClick={() => setActiveMode('mind')} 
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-none cursor-pointer ${
              activeMode === 'mind' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-white/10'
            }`}
          >
            {t.myMind.freeFlow || "Free Flow"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('idea')} 
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-none cursor-pointer ${
              activeMode === 'idea' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-white/10'
            }`}
          >
            {t.myMind.captureAnIdea || "Idea Vault"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('problem')} 
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-none cursor-pointer ${
              activeMode === 'problem' 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-white/10'
            }`}
          >
            {t.myMind.problemSolver || "Problem Solver"}
          </button>
        </div>

        {/* Writing Area */}
        <div
          className="rounded-2xl border transition-all duration-200 relative pb-16 overflow-hidden w-full"
          style={{
            background: "var(--color-bg-card)",
            borderColor: (isFocused || input.trim()) ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
            boxShadow: (isFocused || input.trim()) ? "0 4px 14px rgba(0, 0, 0, 0.08)" : "none",
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
            placeholder={
              activeMode === 'idea' 
                ? (t.myMind.ideaVaultPlaceholder || "What's the core idea or spark?")
                : activeMode === 'problem'
                ? (t.myMind.problemSolverPlaceholder || "What problem are you trying to break down?")
                : (t.myMind.writeFreely || "Write whatever comes to mind...")
            }
            className="w-full px-6 py-6 text-base sm:text-lg border-0 resize-none no-focus-ring bg-transparent my-mind-textarea"
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
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-none disabled:cursor-not-allowed"
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

      {/* ── Recent Thoughts Section (Perfect Alignment with Textarea) ── */}
      <section className="w-full" aria-labelledby="recent-thoughts-heading">
        <div className="flex justify-between items-center mb-5 px-0.5">
          <div className="flex items-center gap-2">
            <h2 id="recent-thoughts-heading" className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {t.myMind.recentThoughts}
            </h2>
            {previewThoughts.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {previewThoughts.length}
              </span>
            )}
          </div>
          <button 
            type="button"
            onClick={() => navigate('review_all')} 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
            style={{ color: "var(--color-purple-primary)" }}
          >
            <span>{t.myMind.reviewAll}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {previewThoughts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-4.5">
            {previewThoughts.map((item, index) => (
              <ThoughtPaperCard
                key={item.id}
                item={item}
                index={index}
                onOpenDetail={() => openDetail(item.id)}
              />
            ))}
          </div>
        ) : (
          /* Clean, unboxed empty state */
          <div 
            onClick={() => textareaRef.current?.focus()}
            className="flex flex-col items-center justify-center py-10 sm:py-14 cursor-pointer group text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-3.5 group-hover:scale-105 transition-transform">
              <Inbox size={26} />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              {t.myMind.mindEmpty}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-sm">
              {t.myMind.writeYourFirstThought || "Capture your first thought to see it here."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
